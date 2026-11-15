import { z } from "zod/v4";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free, image-capable models. OpenRouter tries them in order if one is down
// or rate-limited. Override the first with OPENROUTER_MODEL in .env.
const MODELS = [
  process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-31b-it:free",
  "particle-ai/particle-1:free",
];

export class LLMError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!key) throw new LLMError("OPENROUTER_API_KEY is not set in server/.env", 500);
  return key;
}

/** Free models sometimes wrap JSON in ```fences``` or add chatter around it. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(body.slice(start, end + 1));
}

const ATTEMPT_TIMEOUT_MS = 45_000;

/** One OpenRouter call. If the free provider hangs, retry starting from the next model. */
async function chat(messages: ChatMessage[], jsonSchema: object, name: string) {
  let lastErr: unknown;
  for (let rotation = 0; rotation < 2; rotation++) {
    const models = [...MODELS.slice(rotation), ...MODELS.slice(0, rotation)];
    try {
      return await chatOnce(models, messages, jsonSchema, name);
    } catch (e: any) {
      lastErr = e;
      const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
      const network = e instanceof TypeError; // undici "fetch failed"
      if (!timedOut && !network) throw e;
      console.warn(`${name}: ${timedOut ? "timed out" : "network error"} with ${models[0]} (${e?.cause?.message ?? e?.message}); retrying`);
    }
  }
  const e: any = lastErr;
  throw new LLMError(
    e?.name === "TimeoutError" || e?.name === "AbortError"
      ? "The free AI model took too long. Try again (or try a smaller/clearer photo)."
      : `Couldn't reach OpenRouter: ${e?.cause?.message ?? e?.message}`,
    504,
  );
}

async function chatOnce(models: string[], messages: ChatMessage[], jsonSchema: object, name: string) {
  const res = await fetch(API_URL, {
    method: "POST",
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "X-Title": "Receipt Roulette",
    },
    body: JSON.stringify({
      models,
      messages,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: { name, strict: false, schema: jsonSchema },
      },
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `OpenRouter HTTP ${res.status}`;
    throw new LLMError(msg, res.status === 429 ? 429 : res.status === 401 ? 500 : 502);
  }
  const text: string | undefined = json.choices?.[0]?.message?.content;
  if (!text) throw new LLMError("Empty reply from model");
  return { text, model: json.model as string };
}

/**
 * Ask for JSON matching `schema`, validate it, and retry once with the
 * validation error if the model gets it wrong (free models sometimes do).
 */
export async function structured<S extends z.ZodType>(
  schema: S,
  name: string,
  system: string,
  user: ChatMessage["content"],
): Promise<z.infer<S>> {
  const jsonSchema = z.toJSONSchema(schema);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${system}\n\nReply with ONLY a JSON object matching this JSON Schema (no prose, no markdown):\n${JSON.stringify(jsonSchema)}`,
    },
    { role: "user", content: user },
  ];

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    const { text, model } = await chat(messages, jsonSchema, name);
    try {
      const parsed = schema.parse(extractJson(text));
      console.log(`${name}: ok via ${model} in ${Date.now() - t0}ms (attempt ${attempt + 1})`);
      return parsed;
    } catch (e: any) {
      lastError = e?.message ?? String(e);
      console.warn(`${name}: invalid JSON from ${model}: ${lastError.slice(0, 300)}`);
      messages.push(
        { role: "assistant", content: text },
        {
          role: "user",
          content: `That JSON was invalid: ${lastError.slice(0, 800)}\nReturn the corrected JSON object only.`,
        },
      );
    }
  }
  throw new LLMError(`Model returned unusable JSON: ${lastError.slice(0, 200)}`);
}

import "dotenv/config";
import express from "express";
import cors from "cors";
import { Receipt, Insights } from "./schemas.js";
import { LLMError, structured } from "./llm.js";

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" })); // phone photos arrive as base64

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const RECEIPT_SYSTEM = `You read receipts and turn them into clean structured data. The image is either:
- a photo of a printed paper till receipt, or
- a phone screenshot of a digital receipt: an order confirmation email, a delivery/shopping app order
  (Deliveroo, Uber Eats, Just Eat, Amazon, Uber, Trainline, Apple/Google subscriptions...), or an online invoice.
For screenshots, ignore phone UI (status bar, buttons, ads, "reorder" prompts) and use the order date, not today's date.
Delivery, service and bag fees are separate line items in the same category as the order.
- Extract every purchased line item. Skip subtotal/VAT/change/card-number lines.
- Expand cryptic till abbreviations into normal product names.
- Apply line discounts to the item price; put total discounts in "savings".
- All prices and totals are plain numbers (e.g. 1.65), never strings with currency symbols.
- category must be one of: groceries, dining, transport, entertainment, household, health, clothing, tech_subscriptions, other.
  Fuel, train/bus tickets, parking -> transport. Restaurants, cafes, takeaway, meal deals -> dining.
- necessity must be one of: essential, nice_to_have, impulse. Judge honestly but kindly.
- receipt_type must be "paper" or "digital".
- If the image isn't a receipt or order confirmation, set is_receipt=false and leave items empty.`;

app.post("/api/receipt", async (req, res) => {
  const { imageBase64, mediaType } = req.body ?? {};
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }
  console.log(`receipt: received ${Math.round(imageBase64.length / 1024)}KB image, calling model...`);
  const mime = mediaType === "image/png" ? "image/png" : "image/jpeg";
  try {
    const receipt = await structured(Receipt, "receipt", RECEIPT_SYSTEM, [
      { type: "text", text: "Extract this receipt." },
      { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
    ]);
    res.json(receipt);
  } catch (err) {
    handleError(err, res);
  }
});

const PERSONAS = `Fictional comparison personas (monthly spend, GBP):
- "Student Sam": £450 total; 40% groceries, 25% dining, 15% entertainment, heavy impulse snacks.
- "Frugal Fiona": £600 total; 55% groceries, 5% dining, uses every loyalty offer, near-zero impulse.
- "City Chris": £1400 total; 35% dining, 20% transport, 15% tech subscriptions, lots of convenience buys.`;

const INSIGHTS_SYSTEM = `You are the playful-but-sharp financial analyst inside "Receipt Roulette", an app that turns people's receipts into a virtual city.
Every insight must be grounded in the user's actual receipts: name real items, merchants and amounts.
Be encouraging, never preachy. Use the receipts' currency.
personality.archetype must be one of: "The Impulse Buyer", "The Bargain Hunter", "The Subscription Collector", "The Budgeting Wizard", "The Foodie", "The Commuter", "The Treat Yourself-er".
Give 3-4 patterns, exactly 3 savings_tips (estimated_monthly_saving is a number), and compare against each of the 3 personas.
${PERSONAS}`;

app.post("/api/insights", async (req, res) => {
  const { receipts, monthlyBudget, month } = req.body ?? {};
  if (!Array.isArray(receipts) || receipts.length === 0) {
    res.status(400).json({ error: "receipts array is required" });
    return;
  }
  const context = [
    month ? `These are my receipts so far for ${month} (the month may not be over yet).` : "",
    Number(monthlyBudget) > 0 ? `My monthly budget is £${Number(monthlyBudget)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  try {
    const insights = await structured(
      Insights,
      "insights",
      INSIGHTS_SYSTEM,
      `${context}\nHere are my scanned receipts as JSON:\n${JSON.stringify(receipts)}`,
    );
    res.json(insights);
  } catch (err) {
    handleError(err, res);
  }
});

function handleError(err: unknown, res: express.Response) {
  if (err instanceof LLMError) {
    console.error("LLM error:", err.status, err.message);
    const friendly =
      err.status === 429 ? "The AI is busy right now - try again in a moment." : err.message;
    res.status(err.status).json({ error: friendly });
  } else {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  }
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Receipt Roulette server on http://0.0.0.0:${PORT}`);
});

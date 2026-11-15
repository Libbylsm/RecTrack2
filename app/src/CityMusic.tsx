import { ComponentType, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { WebView as RNWebView } from "react-native-webview";
import type { CityState } from "./city";
import { buildHtml, buildScore } from "./musicScore";
import { C } from "./theme";

// react-native-webview's props type collapses to `never` under newer TypeScript/React typings;
// the component itself works fine at runtime, so we loosen only its type.
const WebView = RNWebView as unknown as ComponentType<any>;

/** A play button that turns the city into generative music. Renders nothing for an empty city. */
export default function CityMusic({ city }: { city: CityState }) {
  const ref = useRef<any>(null);
  const loaded = useRef(false);
  const score = useMemo(() => buildScore(city), [city]);
  const html = useMemo(
    () => buildHtml({ bg: C.player, accent: C.accent, onAccent: C.onAccent, ink: C.ink, muted: C.muted }),
    [],
  );
  const js = `window.setScore&&window.setScore(${JSON.stringify(score)});true;`;

  // The page loads once; later changes to the city are pushed in as a new score.
  useEffect(() => {
    if (loaded.current) ref.current?.injectJavaScript(js);
  }, [js]);

  if (city.districts.length === 0) return null;
  return (
    <View style={{ height: 66, marginTop: 10, borderRadius: 18, overflow: "hidden" }}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        style={{ backgroundColor: "transparent" }}
        scrollEnabled={false}
        bounces={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onLoadEnd={() => {
          loaded.current = true;
          ref.current?.injectJavaScript(js);
        }}
      />
    </View>
  );
}
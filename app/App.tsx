import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import CityScreen from "./src/screens/CityScreen";
import ScanScreen from "./src/screens/ScanScreen";
import InsightsScreen from "./src/screens/InsightsScreen";
import { loadInsights, loadReceipts, saveInsights, saveReceipts } from "./src/storage";
import { C } from "./src/theme";
import type { Insights, StoredReceipt } from "./src/types";

type Tab = "city" | "scan" | "insights";
const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "city", icon: "🏙️", label: "City" },
  { key: "scan", icon: "🧾", label: "Scan" },
  { key: "insights", icon: "📊", label: "Insights" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("scan");
  const [receipts, setReceipts] = useState<StoredReceipt[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [r, i] = await Promise.all([loadReceipts(), loadInsights()]);
      setReceipts(r);
      setInsights(i);
      if (r.length) setTab("city");
      setLoaded(true);
    })();
  }, []);

  function updateReceipts(next: StoredReceipt[]) {
    setReceipts(next);
    saveReceipts(next);
    // Spending changed, so old insights are stale.
    setInsights(null);
    saveInsights(null);
  }

  function updateInsights(i: Insights) {
    setInsights(i);
    saveInsights(i);
  }

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          {tab === "city" && <CityScreen receipts={receipts} />}
          {tab === "scan" && (
            <ScanScreen
              receipts={receipts}
              onAdd={(r) => updateReceipts([...receipts, r])}
              onAddMany={(rs) => updateReceipts([...receipts, ...rs])}
              onDelete={(id) => updateReceipts(receipts.filter((r) => r.id !== id))}
              onReset={() => updateReceipts([])}
              goToCity={() => setTab("city")}
            />
          )}
          {tab === "insights" && (
            <InsightsScreen receipts={receipts} insights={insights} onInsights={updateInsights} />
          )}
        </View>
        <SafeAreaView edges={["bottom"]} style={styles.tabBar}>
          {TABS.map((t) => (
            <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabIcon, { opacity: tab === t.key ? 1 : 0.45 }]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, tab === t.key && { color: C.accent }]}>{t.label}</Text>
            </Pressable>
          ))}
        </SafeAreaView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card },
  tab: { flex: 1, alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 11, fontWeight: "700", color: C.muted, marginTop: 2 },
});

import { useEffect, useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { loadSession, signOut, updateUser, User } from "./src/auth";
import { currentMonthKey } from "./src/month";
import HomeScreen from "./src/screens/HomeScreen";
import ScanScreen from "./src/screens/ScanScreen";
import InsightsScreen from "./src/screens/InsightsScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { InsightsByMonth, loadInsights, loadReceipts, saveInsights, saveReceipts } from "./src/storage";
import { applyScheme, C, currentScheme, themed } from "./src/theme";
import type { StoredReceipt } from "./src/types";

type Tab = "home" | "insights" | "scan" | "history" | "profile";
const TABS: { key: Tab; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "home", icon: "home-outline", iconOn: "home", label: "Home" },
  { key: "insights", icon: "stats-chart-outline", iconOn: "stats-chart", label: "Insights" },
  { key: "scan", icon: "scan", iconOn: "scan", label: "Scan" },
  { key: "history", icon: "time-outline", iconOn: "time", label: "History" },
  { key: "profile", icon: "person-outline", iconOn: "person", label: "Profile" },
];

export default function App() {
  // Follow the phone's light/dark setting. Swapping the palette before rendering keeps every screen in sync.
  const deviceScheme = useColorScheme();
  applyScheme(deviceScheme === "light" ? "light" : "dark");
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [receipts, setReceipts] = useState<StoredReceipt[]>([]);
  const [insights, setInsights] = useState<InsightsByMonth>({});

  useEffect(() => {
    loadSession().then((u) => {
      setUser(u);
      setBooting(false);
    });
  }, []);

  // Load this user's data whenever the signed-in user changes.
  useEffect(() => {
    if (!user) return;
    Promise.all([loadReceipts(user.id), loadInsights(user.id)]).then(([r, i]) => {
      setReceipts(r);
      setInsights(i);
    });
  }, [user?.id]);

  const scheme = currentScheme();
  if (booting) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const content = (() => {
    if (!user) return <LoginScreen onSignedIn={(u) => { setUser(u); setTab("home"); }} />;
    if (!user.name || !user.monthlyBudget) {
      return <OnboardingScreen user={user} onDone={async (u) => setUser(await updateUser(u))} />;
    }

    const updateReceipts = (next: StoredReceipt[]) => {
      setReceipts(next);
      saveReceipts(user.id, next);
      // This month's spending changed, so its AI insights are stale.
      const { [currentMonthKey()]: _, ...rest } = insights;
      setInsights(rest);
      saveInsights(user.id, rest);
    };

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <View style={{ flex: 1 }}>
          {tab === "home" && <HomeScreen user={user} receipts={receipts} goTo={setTab} />}
          {tab === "scan" && (
            <ScanScreen
              receipts={receipts}
              onAdd={(rs) => updateReceipts([...receipts, ...rs])}
              onDelete={(id) => updateReceipts(receipts.filter((r) => r.id !== id))}
              goHome={() => setTab("home")}
            />
          )}
          {tab === "insights" && (
            <InsightsScreen
              user={user}
              receipts={receipts}
              insights={insights[currentMonthKey()] ?? null}
              onInsights={(i) => {
                const next = { ...insights, [currentMonthKey()]: i };
                setInsights(next);
                saveInsights(user.id, next);
              }}
            />
          )}
          {tab === "history" && <HistoryScreen user={user} receipts={receipts} insights={insights} />}
          {tab === "profile" && (
            <ProfileScreen
              user={user}
              receipts={receipts}
              onUpdateUser={async (u) => setUser(await updateUser(u))}
              onSignOut={async () => {
                await signOut();
                setUser(null);
                setReceipts([]);
                setInsights({});
              }}
              onResetData={() => {
                setReceipts([]);
                setInsights({});
                saveReceipts(user.id, []);
                saveInsights(user.id, {});
              }}
            />
          )}
        </View>

        <SafeAreaView edges={["bottom"]} style={styles.tabBar}>
          {TABS.map((t) =>
            t.key === "scan" ? (
              <Pressable key={t.key} style={styles.tab} onPress={() => setTab("scan")}>
                <View style={[styles.scanBtn, tab === "scan" && { transform: [{ scale: 1.05 }] }]}>
                  <Ionicons name="scan" size={26} color={C.onAccent} />
                </View>
              </Pressable>
            ) : (
              <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
                <Ionicons name={tab === t.key ? t.iconOn : t.icon} size={23} color={tab === t.key ? C.accent : C.dim} />
                <Text style={[styles.tabLabel, tab === t.key && { color: C.accentText }]}>{t.label}</Text>
              </Pressable>
            ),
          )}
        </SafeAreaView>
      </SafeAreaView>
    );
  })();

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
      <View key={scheme} style={{ flex: 1, backgroundColor: C.bg }}>{content}</View>
    </SafeAreaProvider>
  );
}

const styles = themed(() => ({
  tabBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.tabBar,
    borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6,
  },
  tab: { flex: 1, alignItems: "center", paddingBottom: 4 },
  tabLabel: { fontSize: 10, fontWeight: "700", color: C.dim, marginTop: 3 },
  scanBtn: {
    width: 58, height: 58, borderRadius: 20, backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
    marginTop: -26, borderWidth: 4, borderColor: C.bg,
    shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
}));

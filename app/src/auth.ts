import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * DEMO-ONLY auth. Apple/Google buttons create a mock account and email
 * "accounts" live on the device. Nothing here is secure - it exists so the
 * judges see a realistic sign-in flow.
 */
export type Provider = "apple" | "google" | "email";

export interface User {
  id: string;
  provider: Provider;
  email: string;
  name: string; // empty until onboarding
  monthlyBudget: number; // 0 until onboarding
  createdAt: number;
}

const SESSION_KEY = "rr.session.v1";
const ACCOUNTS_KEY = "rr.accounts.v1"; // email -> { password, user }

export async function loadSession(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setSession(user: User | null) {
  if (user) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else await AsyncStorage.removeItem(SESSION_KEY);
}

async function loadAccounts(): Promise<Record<string, { password: string; user: User }>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(ACCOUNTS_KEY)) ?? "{}");
  } catch {
    return {};
  }
}

async function saveAccount(user: User, password: string) {
  const accounts = await loadAccounts();
  accounts[user.email.toLowerCase()] = { password, user };
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/** Mock Apple / Google sign-in: one stable demo account per provider. */
export async function signInWithProvider(provider: "apple" | "google"): Promise<User> {
  await new Promise((r) => setTimeout(r, 900)); // feel like a real auth sheet
  const email = provider === "apple" ? "demo@privaterelay.appleid.com" : "demo@gmail.com";
  const accounts = await loadAccounts();
  const existing = accounts[email]?.user;
  const user: User = existing ?? {
    id: `${provider}-demo`, provider, email, name: "", monthlyBudget: 0, createdAt: Date.now(),
  };
  await saveAccount(user, "");
  await setSession(user);
  return user;
}

export async function signInWithEmail(email: string, password: string, create: boolean): Promise<User> {
  const key = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(key)) throw new Error("Enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const accounts = await loadAccounts();
  const found = accounts[key];
  if (create) {
    if (found) throw new Error("An account with that email already exists. Sign in instead.");
    const user: User = {
      id: `email-${key}`, provider: "email", email: key, name: "", monthlyBudget: 0, createdAt: Date.now(),
    };
    await saveAccount(user, password);
    await setSession(user);
    return user;
  }
  if (!found || found.password !== password) throw new Error("Email or password is incorrect.");
  await setSession(found.user);
  return found.user;
}

export async function updateUser(user: User): Promise<User> {
  const accounts = await loadAccounts();
  const prev = accounts[user.email.toLowerCase()];
  await saveAccount(user, prev?.password ?? "");
  await setSession(user);
  return user;
}

export async function signOut() {
  await setSession(null);
}

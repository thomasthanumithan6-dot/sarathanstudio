"use client";

/**
 * Demo-only authentication used when Supabase is not configured.
 * Accounts are stored in this browser's localStorage with SHA-256 hashed
 * passwords. This is NOT secure production auth - connect Supabase for that.
 */

const USERS_KEY = "sarathanDemoUsers";
const SESSION_KEY = "sarathanDemoSession";

export type DemoUser = {
  email: string;
  fullName: string;
};

type StoredUser = DemoUser & { passwordHash: string };

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function demoSignUp(
  fullName: string,
  email: string,
  password: string
): Promise<{ error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (users.some((user) => user.email === normalizedEmail)) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  const passwordHash = await hashPassword(password);
  users.push({ email: normalizedEmail, fullName: fullName.trim(), passwordHash });
  writeUsers(users);
  return {};
}

export async function demoSignIn(
  email: string,
  password: string
): Promise<{ user?: DemoUser; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const found = readUsers().find(
    (user) => user.email === normalizedEmail && user.passwordHash === passwordHash
  );

  if (!found) {
    return { error: "Incorrect email or password." };
  }

  const user: DemoUser = { email: found.email, fullName: found.fullName };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { user };
}

export function demoSignOut() {
  localStorage.removeItem(SESSION_KEY);
}

export function getDemoUser(): DemoUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
}

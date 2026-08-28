import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  PARENT_SESSION_COOKIE,
  PARENT_SESSION_TTL_SECONDS,
} from "./constants";

function secret(): string {
  return process.env.SESSION_SECRET || "kids-english-player-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSessionToken(now: Date = new Date()): string {
  const expiresAt = now.getTime() + PARENT_SESSION_TTL_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function isSessionTokenValid(
  token: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export async function hasParentSession(): Promise<boolean> {
  const store = await cookies();
  return isSessionTokenValid(store.get(PARENT_SESSION_COOKIE)?.value);
}

export async function startParentSession(): Promise<void> {
  const store = await cookies();
  store.set(PARENT_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PARENT_SESSION_TTL_SECONDS,
  });
}

export async function endParentSession(): Promise<void> {
  const store = await cookies();
  store.delete(PARENT_SESSION_COOKIE);
}

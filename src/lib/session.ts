import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./constants";

function secret(): string {
  return process.env.SESSION_SECRET || "kids-english-player-v2-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** 서명된 세션 토큰: "<userId>.<만료시각>.<HMAC>" */
export function createSessionToken(userId: number, now: Date = new Date()): string {
  const payload = `${userId}.${now.getTime() + SESSION_TTL_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

/** 서명·만료를 검증하고 userId 를 돌려준다. 위조/만료면 null. */
export function readSessionToken(
  token: string | undefined,
  now: Date = new Date(),
): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [rawUserId, rawExpiresAt, signature] = parts;
  const expected = sign(`${rawUserId}.${rawExpiresAt}`);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const userId = Number(rawUserId);
  const expiresAt = Number(rawExpiresAt);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return null;
  return userId;
}

export async function readSessionUserId(): Promise<number | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function startSession(userId: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

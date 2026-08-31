import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
} from "./constants";

const KEY_LENGTH = 32;

/** 비밀번호는 평문으로 저장하지 않는다. scrypt(salt) 결과만 저장한다. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(
  password: string,
  stored: string | null | undefined,
): boolean {
  if (!stored) return false;
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  const a = Buffer.from(derived, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 로그인 아이디는 소문자/공백 제거 형태로 통일해 저장·조회한다. */
export function normalizeUsername(username: string): string {
  return (username ?? "").trim().toLowerCase();
}

/**
 * 가입 시에만 형식을 검사한다.
 * 로그인은 이전 계정(이메일 이관분)도 찾을 수 있어야 하므로 형식 검사를 하지 않는다.
 */
export function isValidUsername(username: string): boolean {
  const value = normalizeUsername(username);
  if (value.length < MIN_USERNAME_LENGTH || value.length > MAX_USERNAME_LENGTH) {
    return false;
  }
  return /^[a-z0-9][a-z0-9._-]*$/.test(value);
}

export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

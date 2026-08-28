import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  verifyPassword,
} from "@/lib/password";
import { createSessionToken, readSessionToken } from "@/lib/session";
import { SESSION_TTL_SECONDS } from "@/lib/constants";

describe("비밀번호", () => {
  it("평문을 저장하지 않고 해시로 검증한다", () => {
    const stored = hashPassword("super-secret-1");
    expect(stored).not.toContain("super-secret-1");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("super-secret-1", stored)).toBe(true);
    expect(verifyPassword("wrong-password", stored)).toBe(false);
    expect(verifyPassword("super-secret-1", null)).toBe(false);
    expect(verifyPassword("super-secret-1", "garbage")).toBe(false);
  });

  it("같은 비밀번호라도 salt 때문에 해시가 달라진다", () => {
    expect(hashPassword("same-password")).not.toBe(hashPassword("same-password"));
  });

  it("길이 규칙을 검사한다", () => {
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("1234567")).toBe(false);
  });
});

describe("이메일", () => {
  it("소문자/공백 제거로 정규화한다", () => {
    expect(normalizeEmail("  Parent@Example.COM ")).toBe("parent@example.com");
  });

  it("형식을 검사한다", () => {
    expect(isValidEmail("parent@example.com")).toBe(true);
    expect(isValidEmail("parent@example")).toBe(false);
    expect(isValidEmail("parent.example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("세션 토큰", () => {
  it("userId 를 담고 다시 읽을 수 있다", () => {
    const token = createSessionToken(42);
    expect(readSessionToken(token)).toBe(42);
  });

  it("서명이 위조되면 거부한다", () => {
    const token = createSessionToken(42);
    const [userId, expiresAt] = token.split(".");
    expect(readSessionToken(`${userId}.${expiresAt}.deadbeef`)).toBeNull();
    expect(readSessionToken("garbage")).toBeNull();
    expect(readSessionToken(undefined)).toBeNull();
  });

  it("userId 를 바꿔치기하면 서명 검증에서 걸린다", () => {
    const token = createSessionToken(42);
    const [, expiresAt, signature] = token.split(".");
    expect(readSessionToken(`99.${expiresAt}.${signature}`)).toBeNull();
  });

  it("만료된 토큰은 거부한다", () => {
    const past = new Date(Date.now() - (SESSION_TTL_SECONDS + 60) * 1000);
    expect(readSessionToken(createSessionToken(42, past))).toBeNull();
  });
});

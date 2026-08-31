import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
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
    expect(verifyPassword("wrong", stored)).toBe(false);
    expect(verifyPassword("super-secret-1", null)).toBe(false);
    expect(verifyPassword("super-secret-1", "garbage")).toBe(false);
  });

  it("같은 비밀번호도 salt 때문에 해시가 달라진다", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("최소 길이를 검사한다", () => {
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("1234567")).toBe(false);
  });
});

describe("로그인 아이디", () => {
  it("정규화하고 형식을 검사한다", () => {
    expect(normalizeUsername("  AppA ")).toBe("appa");
    expect(isValidUsername("appa")).toBe(true);
    expect(isValidUsername("app.a_1-2")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(21))).toBe(false);
    expect(isValidUsername("")).toBe(false);
  });

  it("개인정보로 쓰이기 쉬운 형식(이메일·공백·한글)을 가입에서 거부한다", () => {
    expect(isValidUsername("parent@example.com")).toBe(false);
    expect(isValidUsername("app a")).toBe(false);
    expect(isValidUsername("아빠")).toBe(false);
  });
});

describe("세션 토큰", () => {
  it("userId 를 담고 다시 읽는다", () => {
    expect(readSessionToken(createSessionToken(42))).toBe(42);
  });

  it("서명 위조 / userId 치환을 거부한다", () => {
    const token = createSessionToken(42);
    const [userId, expiresAt, signature] = token.split(".");
    expect(readSessionToken(`${userId}.${expiresAt}.deadbeef`)).toBeNull();
    expect(readSessionToken(`99.${expiresAt}.${signature}`)).toBeNull();
    expect(readSessionToken("garbage")).toBeNull();
    expect(readSessionToken(undefined)).toBeNull();
  });

  it("만료된 토큰을 거부한다", () => {
    const past = new Date(Date.now() - (SESSION_TTL_SECONDS + 60) * 1000);
    expect(readSessionToken(createSessionToken(42, past))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { hashPin, isValidPinFormat, verifyPin } from "@/lib/pin";
import { createSessionToken, isSessionTokenValid } from "@/lib/session";
import { PARENT_SESSION_TTL_SECONDS } from "@/lib/constants";

describe("Parent PIN", () => {
  it("4~6자리 숫자만 허용한다", () => {
    expect(isValidPinFormat("1234")).toBe(true);
    expect(isValidPinFormat("123456")).toBe(true);
    expect(isValidPinFormat("123")).toBe(false);
    expect(isValidPinFormat("12a4")).toBe(false);
  });

  it("평문을 저장하지 않고 해시로 검증한다", () => {
    const stored = hashPin("4321");
    expect(stored).not.toContain("4321");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPin("4321", stored)).toBe(true);
    expect(verifyPin("1234", stored)).toBe(false);
    expect(verifyPin("4321", null)).toBe(false);
    expect(verifyPin("4321", "garbage")).toBe(false);
  });

  it("같은 PIN 이라도 salt 때문에 해시가 달라진다", () => {
    expect(hashPin("1234")).not.toBe(hashPin("1234"));
  });
});

describe("Parent 세션 토큰", () => {
  it("서명이 유효하면 통과한다", () => {
    const token = createSessionToken();
    expect(isSessionTokenValid(token)).toBe(true);
  });

  it("변조된 토큰은 거부한다", () => {
    const token = createSessionToken();
    const [payload] = token.split(".");
    expect(isSessionTokenValid(`${payload}.deadbeef`)).toBe(false);
    expect(isSessionTokenValid(undefined)).toBe(false);
    expect(isSessionTokenValid("garbage")).toBe(false);
  });

  it("만료된 토큰은 거부한다", () => {
    const past = new Date(Date.now() - (PARENT_SESSION_TTL_SECONDS + 60) * 1000);
    expect(isSessionTokenValid(createSessionToken(past))).toBe(false);
  });
});

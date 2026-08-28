"use server";

import { redirect } from "next/navigation";
import { SETTING_KEYS } from "@/lib/constants";
import { getSetting, setSetting } from "@/lib/settings";
import { hashPin, isValidPinFormat, verifyPin } from "@/lib/pin";
import { startParentSession } from "@/lib/session";

export type LoginState = { error: string | null };

export async function loginWithPin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "").trim();
  if (!isValidPinFormat(pin)) {
    return { error: "PIN은 숫자 4~6자리입니다." };
  }

  const stored = await ensureParentPinHash();
  if (!stored) {
    return {
      error:
        "PIN이 설정되지 않았습니다. .env 의 PARENT_PIN 을 지정한 뒤 다시 시도해 주세요.",
    };
  }
  if (!verifyPin(pin, stored)) {
    return { error: "PIN이 올바르지 않습니다." };
  }

  await startParentSession();
  redirect("/admin");
}

/**
 * PIN 해시가 없으면 PARENT_PIN 환경변수로 최초 1회 생성한다.
 * seed 를 실행하지 않은 Docker 환경에서도 부모 모드에 들어갈 수 있게 한다.
 */
async function ensureParentPinHash(): Promise<string | null> {
  const stored = await getSetting(SETTING_KEYS.parentPinHash);
  if (stored) return stored;

  const initial = process.env.PARENT_PIN?.trim();
  if (!initial || !isValidPinFormat(initial)) return null;

  const hashed = hashPin(initial);
  await setSetting(SETTING_KEYS.parentPinHash, hashed);
  return hashed;
}

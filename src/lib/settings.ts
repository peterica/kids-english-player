import { prisma } from "./db";
import { DEFAULT_COMPLETION_THRESHOLD, SETTING_KEYS } from "./constants";

export async function getSetting(key: string): Promise<string | null> {
  return (await prisma.setting.findUnique({ where: { key } }))?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** 완료 기준(%)은 magic number 가 아니라 Setting 에서 읽는다. */
export async function getCompletionThreshold(): Promise<number> {
  const parsed = Number(await getSetting(SETTING_KEYS.completionThreshold));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    return DEFAULT_COMPLETION_THRESHOLD;
  }
  return Math.round(parsed);
}

export async function setCompletionThreshold(percent: number): Promise<void> {
  const safe = Math.min(Math.max(Math.round(percent), 10), 100);
  await setSetting(SETTING_KEYS.completionThreshold, String(safe));
}

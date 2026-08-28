import { prisma } from "./db";
import { AppError } from "./errors";
import {
  MAX_CHILDREN_PER_HOUSEHOLD,
  MAX_LEVEL,
  MAX_NAME_LENGTH,
  MIN_LEVEL,
} from "./constants";
import { authorizeChild } from "./auth";

export async function listChildren(householdId: number) {
  return prisma.child.findMany({
    where: { householdId },
    orderBy: [{ enabled: "desc" }, { id: "asc" }],
    include: { preference: { include: { preferredChannels: true } } },
  });
}

export async function getChildWithPreference(householdId: number, childId: number) {
  await authorizeChild(householdId, childId);
  return prisma.child.findUnique({
    where: { id: childId },
    include: { preference: { include: { preferredChannels: true } } },
  });
}

export async function createChild(householdId: number, name: string) {
  const trimmed = validateName(name);
  const count = await prisma.child.count({ where: { householdId } });
  if (count >= MAX_CHILDREN_PER_HOUSEHOLD) {
    throw new AppError(`아이는 최대 ${MAX_CHILDREN_PER_HOUSEHOLD}명까지 등록할 수 있습니다.`);
  }

  // 아이를 만들면 기본 허용 범위(전체 Level)와 개인 Collection 을 함께 만든다.
  return prisma.child.create({
    data: {
      householdId,
      name: trimmed,
      preference: { create: { minLevel: MIN_LEVEL, maxLevel: MAX_LEVEL } },
      collections: {
        create: { householdId, title: `${trimmed} Collection` },
      },
    },
    include: { preference: true },
  });
}

export async function renameChild(householdId: number, childId: number, name: string) {
  await authorizeChild(householdId, childId);
  return prisma.child.update({
    where: { id: childId },
    data: { name: validateName(name) },
  });
}

/** 기록을 잃지 않도록 삭제 대신 비활성화만 제공한다. */
export async function setChildEnabled(
  householdId: number,
  childId: number,
  enabled: boolean,
) {
  await authorizeChild(householdId, childId);
  return prisma.child.update({ where: { id: childId }, data: { enabled } });
}

export type PreferenceInput = {
  minLevel: number;
  maxLevel: number;
  channelIds: number[];
};

/** 아이별 허용 Level 범위와 선호 Channel 을 저장한다. */
export async function updateChildPreference(
  householdId: number,
  childId: number,
  input: PreferenceInput,
) {
  await authorizeChild(householdId, childId);

  const minLevel = clampLevel(input.minLevel);
  const maxLevel = clampLevel(input.maxLevel);
  if (minLevel > maxLevel) {
    throw new AppError("Level 범위가 올바르지 않습니다. 최소 Level 이 더 큽니다.");
  }

  const channels = await prisma.channel.findMany({
    where: { id: { in: input.channelIds }, enabled: true },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    const preference = await tx.childPreference.upsert({
      where: { childId },
      create: { childId, minLevel, maxLevel },
      update: { minLevel, maxLevel },
    });
    await tx.childPreferredChannel.deleteMany({
      where: { preferenceId: preference.id },
    });
    if (channels.length > 0) {
      await tx.childPreferredChannel.createMany({
        data: channels.map((channel) => ({
          preferenceId: preference.id,
          channelId: channel.id,
        })),
      });
    }
    return preference;
  });
}

function validateName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new AppError("이름을 입력해 주세요.");
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new AppError(`이름은 ${MAX_NAME_LENGTH}자 이내로 입력해 주세요.`);
  }
  return trimmed;
}

function clampLevel(level: number): number {
  const value = Math.round(Number(level));
  if (!Number.isFinite(value)) throw new AppError("Level 값이 올바르지 않습니다.");
  return Math.min(Math.max(value, MIN_LEVEL), MAX_LEVEL);
}

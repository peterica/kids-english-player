import { prisma } from "./db";
import { AppError } from "./errors";
import { MAX_NAME_LENGTH, PROGRESS_STATUS } from "./constants";
import { authorizeChild } from "./auth";

export async function listChildren(householdId: number) {
  return prisma.child.findMany({
    where: { householdId },
    orderBy: [{ enabled: "desc" }, { id: "asc" }],
  });
}

export async function createChild(householdId: number, name: string) {
  const trimmed = validateName(name);
  const count = await prisma.child.count({ where: { householdId } });
  if (count >= 10) throw new AppError("아이는 최대 10명까지 등록할 수 있습니다.");
  return prisma.child.create({ data: { householdId, name: trimmed } });
}

export async function renameChild(
  householdId: number,
  childId: number,
  name: string,
) {
  await authorizeChild(householdId, childId);
  const trimmed = validateName(name);
  return prisma.child.update({ where: { id: childId }, data: { name: trimmed } });
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

/**
 * 아이의 현재 학습 과정(Level)을 지정한다.
 * 이전 과정의 진행 기록은 지우지 않고 상태만 바꾼다.
 */
export async function setChildPlaylist(
  householdId: number,
  childId: number,
  playlistId: number,
) {
  await authorizeChild(householdId, childId);

  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, enabled: true },
  });
  if (!playlist) throw new AppError("학습 과정을 찾을 수 없습니다.");

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    // 진행 중이던 다른 과정은 대기 상태로 되돌린다. 완료한 과정은 그대로 둔다.
    await tx.childPlaylist.updateMany({
      where: {
        childId,
        status: PROGRESS_STATUS.IN_PROGRESS,
        NOT: { playlistId },
      },
      data: { status: PROGRESS_STATUS.NOT_STARTED },
    });

    await tx.childPlaylist.upsert({
      where: { childId_playlistId: { childId, playlistId } },
      create: {
        childId,
        playlistId,
        status: PROGRESS_STATUS.IN_PROGRESS,
        startedAt: now,
      },
      update: { status: PROGRESS_STATUS.IN_PROGRESS, startedAt: now },
    });
  });

  return playlist;
}

function validateName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new AppError("이름을 입력해 주세요.");
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new AppError(`이름은 ${MAX_NAME_LENGTH}자 이내로 입력해 주세요.`);
  }
  return trimmed;
}

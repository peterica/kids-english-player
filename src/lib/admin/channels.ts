import { prisma } from "../db";
import { AppError } from "../errors";

/**
 * Channel 이름에서 내부 식별자(slug)를 만든다.
 * 예: "Thomas & Friends" → thomas-and-friends, "Super Why!" → super-why
 */
export function slugify(name: string): string {
  const slug = (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug;
}

export function validateChannelName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new AppError("Channel 이름을 입력해 주세요.");
  if (trimmed.length > 60) throw new AppError("Channel 이름은 60자 이내여야 합니다.");
  if (!slugify(trimmed)) {
    throw new AppError("Channel 이름에서 slug 를 만들 수 없습니다. 영문/숫자를 포함해 주세요.");
  }
  return trimmed;
}

export async function listChannelsForAdmin() {
  const channels = await prisma.channel.findMany({
    orderBy: [{ name: "asc" }],
    include: { _count: { select: { videos: true } } },
  });
  return channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    slug: channel.slug,
    description: channel.description,
    colorKey: channel.colorKey,
    enabled: channel.enabled,
    videoCount: channel._count.videos,
  }));
}

export async function createChannel(input: { name: string; enabled?: boolean }) {
  const name = validateChannelName(input.name);
  const slug = slugify(name);

  const duplicate = await prisma.channel.findFirst({
    where: { OR: [{ slug }, { name }] },
  });
  if (duplicate) {
    throw new AppError(
      `이미 같은 Channel 이 있습니다: ${duplicate.name} (slug: ${duplicate.slug})`,
    );
  }

  return prisma.channel.create({
    data: { name, slug, enabled: input.enabled ?? true },
  });
}

/**
 * 이름과 사용 여부만 바꾼다.
 * slug 는 생성 시점에 고정한다. 이름을 바꿔도 기존 slug 를 유지해
 * `?channel=<slug>` 로 저장된 기존 조회/링크가 깨지지 않게 한다.
 */
export async function updateChannel(
  id: number,
  input: { name: string; enabled?: boolean },
) {
  const channel = await requireChannel(id);
  const name = validateChannelName(input.name);

  const duplicate = await prisma.channel.findFirst({
    where: { name, NOT: { id: channel.id } },
  });
  if (duplicate) throw new AppError(`이미 같은 이름의 Channel 이 있습니다: ${duplicate.name}`);

  return prisma.channel.update({
    where: { id: channel.id },
    data: { name, enabled: input.enabled ?? channel.enabled },
  });
}

export async function setChannelEnabled(id: number, enabled: boolean) {
  await requireChannel(id);
  // Channel.enabled 만 바꾼다. 하위 Video.enabled 는 건드리지 않는다.
  return prisma.channel.update({ where: { id }, data: { enabled } });
}

/**
 * Channel 삭제.
 * 하위 Video 가 있으면 삭제하지 않는다. Video 관계는 cascade 라서 그대로 지우면
 * 학습 기록까지 연쇄 삭제되므로, 데이터 보존을 우선해 차단하고 편수를 알려 준다.
 */
export async function deleteChannel(id: number) {
  const channel = await requireChannel(id);
  const videoCount = await prisma.video.count({ where: { channelId: id } });
  if (videoCount > 0) {
    throw new AppError(
      `이 Channel 에 영상 ${videoCount}편이 있어 삭제할 수 없습니다. 영상을 먼저 옮기거나 삭제해 주세요.`,
    );
  }
  await prisma.channel.delete({ where: { id: channel.id } });
  return channel;
}

export async function requireChannel(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Channel 을 찾을 수 없습니다.");
  const channel = await prisma.channel.findUnique({ where: { id } });
  if (!channel) throw new AppError("Channel 을 찾을 수 없습니다.");
  return channel;
}

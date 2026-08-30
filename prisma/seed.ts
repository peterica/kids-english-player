import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_COMPLETION_THRESHOLD,
  SEQUENCE_STEP,
  SETTING_KEYS,
} from "../src/lib/constants";
import { buildThumbnailUrl, buildYouTubeWatchUrl } from "../src/lib/youtube";
import { SEED_CHANNELS, SEED_VIDEOS } from "./seed-content";

const prisma = new PrismaClient();

async function seedSettings() {
  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.completionThreshold },
    create: {
      key: SETTING_KEYS.completionThreshold,
      value: String(DEFAULT_COMPLETION_THRESHOLD),
    },
    update: {},
  });
  console.log("- settings: 완료 기준 확인");
}

/**
 * 공용 Content Library.
 * 외부 네트워크를 호출하지 않으므로 오프라인에서도 실패하지 않는다.
 * 반복 실행해도 안전하며, 부모가 바꾼 개인화 데이터(Collection)는 건드리지 않는다.
 */
async function seedLibrary() {
  const channelIdBySlug = new Map<string, number>();

  for (const channel of SEED_CHANNELS) {
    const saved = await prisma.channel.upsert({
      where: { slug: channel.slug },
      create: channel,
      update: {
        name: channel.name,
        description: channel.description,
        colorKey: channel.colorKey,
      },
    });
    channelIdBySlug.set(channel.slug, saved.id);
  }
  console.log(`- channels: ${SEED_CHANNELS.length}개`);

  let created = 0;
  let updated = 0;
  let sequence = SEQUENCE_STEP;

  for (const video of SEED_VIDEOS) {
    const channelId = channelIdBySlug.get(video.channelSlug);
    if (!channelId) continue;

    const existing = await prisma.video.findUnique({
      where: { youtubeVideoId: video.youtubeVideoId },
    });

    if (existing) {
      // 공용 Library 항목만 갱신한다. 부모가 직접 등록한 영상은 그대로 둔다.
      // 값이 그대로면 쓰지 않는다(기존 행의 updatedAt 을 건드리지 않기 위함).
      const changed =
        existing.channelId !== channelId ||
        existing.level !== video.level ||
        existing.category !== video.category ||
        existing.sequence !== sequence;

      if (existing.householdId === null && changed) {
        await prisma.video.update({
          where: { id: existing.id },
          data: {
            channelId,
            level: video.level,
            category: video.category,
            sequence,
          },
        });
        updated += 1;
      }
    } else {
      await prisma.video.create({
        data: {
          youtubeVideoId: video.youtubeVideoId,
          youtubeUrl: buildYouTubeWatchUrl(video.youtubeVideoId),
          title: video.title,
          thumbnailUrl: buildThumbnailUrl(video.youtubeVideoId),
          channelId,
          level: video.level,
          category: video.category,
          sequence,
        },
      });
      created += 1;
    }
    sequence += SEQUENCE_STEP;
  }

  console.log(
    `- videos: 전체 ${SEED_VIDEOS.length}편 (신규 ${created}편 / 갱신 ${updated}편)`,
  );
}

async function main() {
  console.log("seed 시작");
  await seedSettings();
  await seedLibrary();
  console.log("seed 완료");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

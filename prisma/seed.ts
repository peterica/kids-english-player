import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_COMPLETION_THRESHOLD,
  SEQUENCE_STEP,
  SETTING_KEYS,
} from "../src/lib/constants";
import { buildThumbnailUrl, buildYouTubeWatchUrl } from "../src/lib/youtube";
import { PLAYLIST_SEEDS } from "./playlist-data";

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
 * Level 1~4 커리큘럼을 만든다.
 * - 이미 등록된 영상은 youtubeVideoId 기준으로 재사용하고 제목을 덮어쓰지 않는다.
 * - 외부 조회 없이 문서 제목을 사용하므로 네트워크가 없어도 seed 가 실패하지 않는다.
 */
async function seedPlaylists() {
  const last = await prisma.video.findFirst({ orderBy: { sequence: "desc" } });
  let nextSequence = (last?.sequence ?? 0) + SEQUENCE_STEP;

  for (const seed of PLAYLIST_SEEDS) {
    const playlist = await prisma.playlist.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        title: seed.title,
        level: seed.level,
        description: seed.description,
      },
      update: { title: seed.title, level: seed.level, description: seed.description },
    });

    let created = 0;
    let linked = 0;

    for (const item of seed.videos) {
      let video = await prisma.video.findUnique({
        where: { youtubeVideoId: item.youtubeVideoId },
      });

      if (!video) {
        video = await prisma.video.create({
          data: {
            youtubeVideoId: item.youtubeVideoId,
            youtubeUrl: buildYouTubeWatchUrl(item.youtubeVideoId),
            title: item.title,
            thumbnailUrl: buildThumbnailUrl(item.youtubeVideoId),
            sequence: nextSequence,
          },
        });
        nextSequence += SEQUENCE_STEP;
        created += 1;
      }

      const link = await prisma.playlistVideo.upsert({
        where: {
          playlistId_videoId: { playlistId: playlist.id, videoId: video.id },
        },
        create: {
          playlistId: playlist.id,
          videoId: video.id,
          sequence: item.sequence,
        },
        update: { sequence: item.sequence },
      });
      if (link) linked += 1;
    }

    console.log(
      `- ${playlist.title}: 영상 ${linked}건 연결 (신규 등록 ${created}건)`,
    );
  }
}

async function main() {
  console.log("seed 시작");
  await seedSettings();
  await seedPlaylists();
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

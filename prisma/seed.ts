import { PrismaClient } from "@prisma/client";
import { hashPin, isValidPinFormat } from "../src/lib/pin";
import {
  DEFAULT_COMPLETION_THRESHOLD,
  SEQUENCE_STEP,
  SETTING_KEYS,
} from "../src/lib/constants";
import {
  buildThumbnailUrl,
  buildYouTubeWatchUrl,
  fetchYouTubeTitle,
} from "../src/lib/youtube";

const prisma = new PrismaClient();

/**
 * 개발용 샘플 영상.
 * 실제 학습 콘텐츠가 아니라 화면과 흐름을 확인하기 위한 공개 영상이다.
 * 부모는 /admin/videos 에서 실제 학습 영상으로 교체해서 사용한다.
 */
const SAMPLE_VIDEOS = [
  { youtubeVideoId: "jNQXAC9IVRw", fallbackTitle: "[개발용 샘플 1] Me at the zoo" },
  { youtubeVideoId: "dQw4w9WgXcQ", fallbackTitle: "[개발용 샘플 2] Never Gonna Give You Up" },
  { youtubeVideoId: "9bZkp7q19f0", fallbackTitle: "[개발용 샘플 3] Gangnam Style" },
];

async function seedSettings() {
  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.completionThreshold },
    create: {
      key: SETTING_KEYS.completionThreshold,
      value: String(DEFAULT_COMPLETION_THRESHOLD),
    },
    update: {},
  });

  const existingPin = await prisma.setting.findUnique({
    where: { key: SETTING_KEYS.parentPinHash },
  });
  if (existingPin) {
    console.log("- parent PIN: 기존 값 유지");
    return;
  }

  const pin = process.env.PARENT_PIN ?? "1234";
  if (!isValidPinFormat(pin)) {
    throw new Error("PARENT_PIN 은 4~6자리 숫자여야 합니다.");
  }
  await prisma.setting.create({
    data: { key: SETTING_KEYS.parentPinHash, value: hashPin(pin) },
  });
  console.log("- parent PIN: .env 의 PARENT_PIN 으로 해시 저장");
}

async function seedVideos() {
  const count = await prisma.video.count();
  if (count > 0) {
    console.log(`- videos: 이미 ${count}건 존재하여 건너뜀`);
    return;
  }

  let sequence = SEQUENCE_STEP;
  for (const sample of SAMPLE_VIDEOS) {
    const fetched = await fetchYouTubeTitle(sample.youtubeVideoId);
    await prisma.video.create({
      data: {
        youtubeVideoId: sample.youtubeVideoId,
        youtubeUrl: buildYouTubeWatchUrl(sample.youtubeVideoId),
        title: fetched ? `[샘플] ${fetched}` : sample.fallbackTitle,
        thumbnailUrl: buildThumbnailUrl(sample.youtubeVideoId),
        sequence,
        enabled: true,
      },
    });
    sequence += SEQUENCE_STEP;
  }
  console.log(`- videos: 개발용 샘플 ${SAMPLE_VIDEOS.length}건 생성`);
}

async function main() {
  console.log("seed 시작");
  await seedSettings();
  await seedVideos();
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

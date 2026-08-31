-- Admin MVP 마이그레이션
--
-- 1) Video.publisher(실제 YouTube 업로더) 필수 컬럼 추가.
--    기존 행은 삭제하지 않고 소속 Channel 이름으로 채운다(데이터 보존형 forward migration).
-- 2) CorrectionRequest(부모 수정 요청) 테이블 추가.
--
-- HouseholdMember.role 은 문자열이라 스키마 변경 없이 ADMIN 값을 수용한다.
-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "videoId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "errorType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "CorrectionRequest_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CorrectionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "youtubeVideoId" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "channelId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "householdId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Video_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Video_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Video" ("category", "channelId", "createdAt", "durationSeconds", "enabled", "householdId", "id", "level", "publisher", "sequence", "thumbnailUrl", "title", "updatedAt", "youtubeUrl", "youtubeVideoId")
SELECT v."category", v."channelId", v."createdAt", v."durationSeconds", v."enabled", v."householdId", v."id", v."level",
       COALESCE((SELECT c."name" FROM "Channel" c WHERE c."id" = v."channelId"), 'Unknown') AS "publisher",
       v."sequence", v."thumbnailUrl", v."title", v."updatedAt", v."youtubeUrl", v."youtubeVideoId"
FROM "Video" v;
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE UNIQUE INDEX "Video_youtubeVideoId_key" ON "Video"("youtubeVideoId");
CREATE INDEX "Video_channelId_level_idx" ON "Video"("channelId", "level");
CREATE INDEX "Video_householdId_idx" ON "Video"("householdId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CorrectionRequest_status_idx" ON "CorrectionRequest"("status");

-- CreateIndex
CREATE INDEX "CorrectionRequest_videoId_idx" ON "CorrectionRequest"("videoId");

-- CreateIndex
CREATE INDEX "CorrectionRequest_requesterId_idx" ON "CorrectionRequest"("requesterId");

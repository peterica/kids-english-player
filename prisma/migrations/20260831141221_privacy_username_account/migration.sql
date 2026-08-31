-- 개인정보 최소화: User.email / User.displayName 제거, username 도입.
--
-- 기존 계정은 삭제하지 않고 이어서 쓴다.
--   username = 이메일의 로컬 파트(@ 앞부분)를 소문자로
--   중복이 생기면 "_<id>" 를 붙여 유일하게 만든다
--   이메일이 비어 있으면 "user<id>"
-- displayName 은 개인정보라 이관하지 않고 폐기한다(가정 이름은 Household.name 에 이미 있다).

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_User" ("id", "username", "passwordHash", "createdAt", "updatedAt")
WITH base AS (
    SELECT
        "id",
        "passwordHash",
        "createdAt",
        "updatedAt",
        lower(trim(
            CASE WHEN instr("email", '@') > 0
                 THEN substr("email", 1, instr("email", '@') - 1)
                 ELSE "email"
            END
        )) AS local
    FROM "User"
)
SELECT
    b."id",
    CASE
        WHEN b.local = '' OR b.local IS NULL THEN 'user' || b."id"
        WHEN (SELECT COUNT(*) FROM base b2 WHERE b2.local = b.local) > 1
            THEN b.local || '_' || b."id"
        ELSE b.local
    END,
    b."passwordHash",
    b."createdAt",
    b."updatedAt"
FROM base b;

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- 역할을 ADMIN / PARENT 두 가지로 정리한다.
--
-- OWNER 는 이메일 계정 시절 "가정을 만든 사람" 표시였으나,
-- self-hosted 단일 가정 구조에서는 PARENT 와 권한이 완전히 같아 의미가 없다.
-- 신규 생성은 이미 없어졌고(첫 계정 ADMIN / 이후 PARENT), 남아 있는 행만 정규화한다.
UPDATE "HouseholdMember" SET "role" = 'PARENT' WHERE "role" = 'OWNER';

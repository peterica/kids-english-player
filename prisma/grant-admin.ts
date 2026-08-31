import { PrismaClient } from "@prisma/client";
import { HOUSEHOLD_ROLE } from "../src/lib/constants";

/**
 * 운영자 권한 부여/회수 스크립트.
 *
 *   npm run admin:grant -- appa
 *   npm run admin:grant -- appa --revoke
 *
 * 첫 계정은 가입할 때 자동으로 ADMIN 이 되므로 보통은 필요 없다.
 * 두 번째 이후 계정에 권한을 줄 때 쓴다.
 */
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const username = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();
  const revoke = args.includes("--revoke");

  if (!username) {
    console.error("사용법: npm run admin:grant -- <아이디> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`계정을 찾을 수 없습니다: ${username}`);
    process.exitCode = 1;
    return;
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId: user.id },
    orderBy: { id: "asc" },
  });
  if (!membership) {
    console.error(`가정 구성원 정보가 없습니다: ${username}`);
    process.exitCode = 1;
    return;
  }

  const nextRole = revoke ? HOUSEHOLD_ROLE.PARENT : HOUSEHOLD_ROLE.ADMIN;
  await prisma.householdMember.update({
    where: { id: membership.id },
    data: { role: nextRole },
  });

  console.log(`${username}: ${membership.role} → ${nextRole}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import { HOUSEHOLD_ROLE } from "../src/lib/constants";

/**
 * 운영자 권한 부여/회수 스크립트.
 *
 *   npm run admin:grant -- parent@example.com
 *   npm run admin:grant -- parent@example.com --revoke
 *
 * 계정을 코드에 하드코딩하지 않고, seed 도 role 을 건드리지 않는다.
 */
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();
  const revoke = args.includes("--revoke");

  if (!email) {
    console.error("사용법: npm run admin:grant -- <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`계정을 찾을 수 없습니다: ${email}`);
    process.exitCode = 1;
    return;
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId: user.id },
    orderBy: { id: "asc" },
  });
  if (!membership) {
    console.error(`가정 구성원 정보가 없습니다: ${email}`);
    process.exitCode = 1;
    return;
  }

  const nextRole = revoke ? HOUSEHOLD_ROLE.OWNER : HOUSEHOLD_ROLE.ADMIN;
  await prisma.householdMember.update({
    where: { id: membership.id },
    data: { role: nextRole },
  });

  console.log(`${email}: ${membership.role} → ${nextRole}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

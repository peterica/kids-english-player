import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

/**
 * 비밀번호 재설정 스크립트 (Self-hosted 계정 복구 수단).
 *
 *   npm run admin:passwd -- appa                 # 임시 비밀번호를 만들어 출력
 *   npm run admin:passwd -- appa 새비밀번호8자이상   # 지정한 값으로 변경
 *
 * 이메일 기반 복구를 두지 않는 대신, 서버에 접근할 수 있는 사람만
 * 이 명령으로 복구한다. 비밀번호는 scrypt 해시로만 저장된다.
 */
const prisma = new PrismaClient();

async function main() {
  const [rawUsername, rawPassword] = process.argv.slice(2);
  const username = rawUsername?.trim().toLowerCase();

  if (!username) {
    console.error("사용법: npm run admin:passwd -- <아이디> [새 비밀번호]");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`계정을 찾을 수 없습니다: ${username}`);
    process.exitCode = 1;
    return;
  }

  const generated = !rawPassword;
  const password = rawPassword ?? randomBytes(9).toString("base64url");
  if (password.length < 8) {
    console.error("비밀번호는 8자 이상이어야 합니다.");
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(password) },
  });

  console.log(`${username}: 비밀번호를 변경했습니다.`);
  if (generated) {
    console.log(`임시 비밀번호: ${password}`);
    console.log("로그인 후 반드시 변경하세요.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

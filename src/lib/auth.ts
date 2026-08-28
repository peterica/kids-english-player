import { prisma } from "./db";
import { AppError } from "./errors";
import { HOUSEHOLD_ROLE, MAX_NAME_LENGTH, type HouseholdRole } from "./constants";
import {
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  verifyPassword,
} from "./password";
import { readSessionUserId } from "./session";

export type SessionUser = {
  userId: number;
  email: string;
  displayName: string;
  householdId: number;
  householdName: string;
  role: HouseholdRole;
};

/**
 * userId 로 세션 사용자와 소속 Household 를 확정한다.
 * householdId 는 서버에서만 결정하며 클라이언트 입력을 신뢰하지 않는다.
 */
export async function resolveSessionUser(
  userId: number | null,
): Promise<SessionUser | null> {
  if (!userId) return null;

  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
    include: { user: true, household: true },
  });
  if (!membership) return null;

  return {
    userId: membership.userId,
    email: membership.user.email,
    displayName: membership.user.displayName,
    householdId: membership.householdId,
    householdName: membership.household.name,
    role: membership.role as HouseholdRole,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return resolveSessionUser(await readSessionUserId());
}

/** Server Action / API 용. 세션이 없으면 사용자에게 보여줄 오류를 던진다. */
export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError("로그인이 필요합니다. 다시 로그인해 주세요.");
  return session;
}

/**
 * 다른 가정의 아이에 접근하지 못하도록 childId 를 반드시 householdId 와 함께 조회한다.
 * URL 이나 요청 body 의 childId 를 그대로 신뢰하지 않는다.
 */
export async function authorizeChild(householdId: number, childId: number) {
  if (!Number.isInteger(childId) || childId <= 0) {
    throw new AppError("아이를 찾을 수 없습니다.");
  }
  const child = await prisma.child.findFirst({
    where: { id: childId, householdId },
  });
  if (!child) throw new AppError("아이를 찾을 수 없습니다.");
  return child;
}

export type SignupInput = {
  email: string;
  password: string;
  displayName: string;
};

/**
 * 회원가입: User + Household + HouseholdMember(OWNER) 를 한 트랜잭션으로 만든다.
 * 단일 아이 버전에서 넘어온 "구성원이 없는" Household 가 있으면
 * 새로 만들지 않고 그 가정을 인계받아 기존 학습 기록을 이어서 쓴다.
 */
export async function signupUser(input: SignupInput) {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName?.trim() ?? "";

  if (!isValidEmail(email)) throw new AppError("이메일 형식을 확인해 주세요.");
  if (!isValidPassword(input.password)) {
    throw new AppError("비밀번호는 8자 이상이어야 합니다.");
  }
  if (!displayName) throw new AppError("이름을 입력해 주세요.");
  if (displayName.length > MAX_NAME_LENGTH) {
    throw new AppError(`이름은 ${MAX_NAME_LENGTH}자 이내로 입력해 주세요.`);
  }

  const duplicate = await prisma.user.findUnique({ where: { email } });
  if (duplicate) throw new AppError("이미 가입된 이메일입니다.");

  const orphanHousehold = await prisma.household.findFirst({
    where: { members: { none: {} } },
    orderBy: { id: "asc" },
  });

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashPassword(input.password),
        displayName,
      },
    });

    const household =
      orphanHousehold ??
      (await tx.household.create({ data: { name: `${displayName}님의 가족` } }));

    await tx.householdMember.create({
      data: {
        householdId: household.id,
        userId: user.id,
        role: HOUSEHOLD_ROLE.OWNER,
      },
    });

    return { user, household, adoptedLegacyHousehold: Boolean(orphanHousehold) };
  });
}

/** 로그인. 실패 사유를 이메일/비밀번호로 구분해 알려주지 않는다. */
export async function loginUser(email: string, password: string) {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const stored = user?.passwordHash ?? null;

  if (!verifyPassword(password ?? "", stored)) {
    throw new AppError("이메일 또는 비밀번호가 올바르지 않습니다.");
  }
  return user!;
}

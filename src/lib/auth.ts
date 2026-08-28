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

/** Server Action / Route Handler 용. 세션이 없으면 사용자용 오류를 던진다. */
export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError("로그인이 필요합니다. 다시 로그인해 주세요.");
  return session;
}

/**
 * IDOR 방지의 핵심.
 * childId 는 URL 이든 body 든 신뢰하지 않고 항상 householdId 와 함께 조회한다.
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

/** Collection 도 같은 방식으로 가정 소유를 확인한다. */
export async function authorizeCollection(householdId: number, collectionId: number) {
  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    throw new AppError("Collection 을 찾을 수 없습니다.");
  }
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, householdId },
  });
  if (!collection) throw new AppError("Collection 을 찾을 수 없습니다.");
  return collection;
}

/** Auto Play 세션 소유 확인 (childId 를 통해 가정까지 검증). */
export async function authorizeAutoPlaySession(
  householdId: number,
  sessionId: number,
) {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new AppError("Auto Play 세션을 찾을 수 없습니다.");
  }
  const session = await prisma.autoPlaySession.findFirst({
    where: { id: sessionId, child: { householdId } },
  });
  if (!session) throw new AppError("Auto Play 세션을 찾을 수 없습니다.");
  return session;
}

export type SignupInput = {
  email: string;
  password: string;
  displayName: string;
};

/** 회원가입: User + Household + HouseholdMember(OWNER) 를 한 트랜잭션으로 만든다. */
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
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new AppError("이미 가입된 이메일입니다.");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash: hashPassword(input.password), displayName },
    });
    const household = await tx.household.create({
      data: { name: `${displayName}님의 가족` },
    });
    await tx.householdMember.create({
      data: {
        householdId: household.id,
        userId: user.id,
        role: HOUSEHOLD_ROLE.OWNER,
      },
    });
    return { user, household };
  });
}

/** 로그인. 실패 사유를 이메일/비밀번호로 구분해 알려주지 않는다. */
export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });
  if (!verifyPassword(password ?? "", user?.passwordHash ?? null)) {
    throw new AppError("이메일 또는 비밀번호가 올바르지 않습니다.");
  }
  return user!;
}

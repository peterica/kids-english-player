import { prisma } from "./db";
import { AppError, ForbiddenError, UnauthorizedError } from "./errors";
import {
  DEFAULT_HOUSEHOLD_NAME,
  HOUSEHOLD_ROLE,
  MAX_NAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  type HouseholdRole,
} from "./constants";
import {
  hashPassword,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
  verifyPassword,
} from "./password";
import { readSessionUserId } from "./session";

export type SessionUser = {
  userId: number;
  username: string;
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
    username: membership.user.username,
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
 * 역할별 capability.
 * PARENT 는 Parent 기능만, ADMIN 은 Parent 기능 + 운영자 기능을 가진다.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === HOUSEHOLD_ROLE.ADMIN;
}

export function hasParentCapability(role: string | null | undefined): boolean {
  return role === HOUSEHOLD_ROLE.PARENT || role === HOUSEHOLD_ROLE.ADMIN;
}

export function isAdminSession(session: SessionUser | null): boolean {
  return Boolean(session && isAdminRole(session.role));
}

/** Admin API 용 guard. 미인증 401, 권한 부족 403 을 구분한다. */
export async function requireAdminSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new UnauthorizedError("로그인이 필요합니다.");
  if (!isAdminRole(session.role)) {
    throw new ForbiddenError("운영자 권한이 필요합니다.");
  }
  return session;
}

/** Parent API 용 guard. 미인증 401 을 명시적으로 구분한다. */
export async function requireParentSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new UnauthorizedError("로그인이 필요합니다.");
  if (!hasParentCapability(session.role)) {
    throw new ForbiddenError("권한이 없습니다.");
  }
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
  username: string;
  password: string;
  /** 가정 이름. 비우면 기본값을 쓴다. 개인 실명을 요구하지 않는다. */
  householdName?: string;
};

/**
 * 계정 생성: User + Household + HouseholdMember 를 한 트랜잭션으로 만든다.
 *
 * Self-hosted 단일 가정 인스턴스이므로 **첫 계정은 자동으로 ADMIN** 이 된다.
 * (별도 CLI 로 권한을 부여하지 않아도 바로 운영 화면을 쓸 수 있다.)
 * 이후 추가되는 계정은 PARENT 로 만든다.
 */
export async function signupUser(input: SignupInput) {
  const username = normalizeUsername(input.username);
  const householdName = input.householdName?.trim() || DEFAULT_HOUSEHOLD_NAME;

  if (!isValidUsername(username)) {
    throw new AppError(
      `아이디는 ${MIN_USERNAME_LENGTH}~${MAX_USERNAME_LENGTH}자의 영문 소문자·숫자·(. _ -) 로 입력해 주세요.`,
    );
  }
  if (!isValidPassword(input.password)) {
    throw new AppError("비밀번호는 8자 이상이어야 합니다.");
  }
  if (householdName.length > MAX_NAME_LENGTH) {
    throw new AppError(`가정 이름은 ${MAX_NAME_LENGTH}자 이내로 입력해 주세요.`);
  }
  if (await prisma.user.findUnique({ where: { username } })) {
    throw new AppError("이미 사용 중인 아이디입니다.");
  }

  const isFirstUser = (await prisma.user.count()) === 0;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username, passwordHash: hashPassword(input.password) },
    });
    const household = await tx.household.create({ data: { name: householdName } });
    await tx.householdMember.create({
      data: {
        householdId: household.id,
        userId: user.id,
        role: isFirstUser ? HOUSEHOLD_ROLE.ADMIN : HOUSEHOLD_ROLE.PARENT,
      },
    });
    return { user, household };
  });
}

/** 로그인. 실패 사유를 아이디/비밀번호로 구분해 알려주지 않는다. */
export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(username) },
  });
  if (!verifyPassword(password ?? "", user?.passwordHash ?? null)) {
    throw new AppError("아이디 또는 비밀번호가 올바르지 않습니다.");
  }
  return user!;
}

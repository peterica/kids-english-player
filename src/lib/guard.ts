import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./auth";
import { prisma } from "./db";

/** 서버 컴포넌트 전용. 로그인하지 않았으면 /login 으로 보낸다. */
export async function requirePageSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return session;
}

/** 서버 컴포넌트 전용. 다른 가정의 아이면 아이 선택 화면으로 보낸다. */
export async function requirePageChild(childId: number) {
  const session = await requirePageSession();
  const child = Number.isInteger(childId)
    ? await prisma.child.findFirst({
        where: { id: childId, householdId: session.householdId },
        include: {
          preference: { include: { preferredChannels: true } },
        },
      })
    : null;
  if (!child) redirect("/kids");
  return { session, child };
}

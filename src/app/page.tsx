import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 진입점.
 * 로그인 전 → /login, 아이가 없으면 → 아이 등록, 아이가 있으면 → 아이 선택.
 */
export default async function RootPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const childCount = await prisma.child.count({
    where: { householdId: session.householdId, enabled: true },
  });
  redirect(childCount === 0 ? "/admin/children" : "/kids");
}

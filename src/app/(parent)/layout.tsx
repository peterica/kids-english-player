import { isAdminSession } from "@/lib/auth";
import { requirePageSession } from "@/lib/guard";
import { ParentShell } from "@/components/ParentShell";

export const dynamic = "force-dynamic";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageSession();
  return (
    <ParentShell
      username={session.username}
      householdName={session.householdName}
      isAdmin={isAdminSession(session)}
    >
      {children}
    </ParentShell>
  );
}

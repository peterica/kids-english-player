import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/admin");

  return (
    <main className="page" style={{ maxWidth: 460 }}>
      <div className="topbar">
        <div>
          <h1>로그인</h1>
          <p>부모 계정으로 로그인하면 아이 화면과 관리 화면을 쓸 수 있어요.</p>
        </div>
      </div>
      <div className="card">
        <AuthForm mode="login" />
        <p className="muted small" style={{ marginTop: 18 }}>
          아직 계정이 없나요? <Link href="/signup">회원가입</Link>
        </p>
      </div>
    </main>
  );
}

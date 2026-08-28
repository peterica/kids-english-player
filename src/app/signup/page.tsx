import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/admin");

  return (
    <main className="page" style={{ maxWidth: 460 }}>
      <div className="topbar">
        <div>
          <h1>회원가입</h1>
          <p>가족 계정을 만들고 첫 아이를 등록해요.</p>
        </div>
      </div>
      <div className="card">
        <AuthForm mode="signup" />
        <p className="muted small" style={{ marginTop: 18 }}>
          이미 계정이 있나요? <Link href="/login">로그인</Link>
        </p>
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";
import { hasParentSession } from "@/lib/session";
import { PinForm } from "./PinForm";

export const dynamic = "force-dynamic";

export default async function ParentLoginPage() {
  if (await hasParentSession()) redirect("/admin");

  return (
    <main className="page" style={{ maxWidth: 460 }}>
      <div className="topbar">
        <div>
          <h1>부모 모드</h1>
          <p>PIN을 입력하면 관리 화면으로 이동합니다.</p>
        </div>
      </div>
      <div className="card">
        <PinForm />
      </div>
    </main>
  );
}

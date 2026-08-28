import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 진입점: 로그인 전에는 서비스 소개, 로그인 후에는 부모 Dashboard */
export default async function RootPage() {
  redirect((await getSessionUser()) ? "/admin" : "/intro");
}

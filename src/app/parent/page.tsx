import { redirect } from "next/navigation";

/** 이전 버전의 부모 PIN 화면. 이메일 로그인으로 대체되어 리다이렉트만 남긴다. */
export default function DeprecatedParentPage() {
  redirect("/login");
}

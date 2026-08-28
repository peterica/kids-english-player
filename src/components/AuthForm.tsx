"use client";

import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { emptyActionState } from "@/lib/action-state";

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  marginBottom: 14,
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "#fbfcfe",
};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, formAction, pending] = useActionState(
    mode === "login" ? loginAction : signupAction,
    emptyActionState,
  );

  return (
    <form action={formAction}>
      {mode === "signup" ? (
        <>
          <label className="label" htmlFor="displayName">
            부모 이름
          </label>
          <input id="displayName" name="displayName" style={inputStyle} required maxLength={20} />
        </>
      ) : null}

      <label className="label" htmlFor="email">
        이메일
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        style={inputStyle}
        required
      />

      <label className="label" htmlFor="password">
        비밀번호 {mode === "signup" ? "(8자 이상)" : ""}
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        style={inputStyle}
        required
      />

      {mode === "signup" ? (
        <>
          <label className="label" htmlFor="childName">
            첫 아이 이름 (나중에 추가해도 돼요)
          </label>
          <input id="childName" name="childName" style={inputStyle} maxLength={20} />
        </>
      ) : null}

      <button type="submit" className="btn" style={{ width: "100%" }} disabled={pending}>
        {pending ? "처리 중..." : mode === "login" ? "로그인" : "가입하고 시작하기"}
      </button>

      {state.error ? <div className="alert error">{state.error}</div> : null}
    </form>
  );
}

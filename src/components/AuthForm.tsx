"use client";

import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { emptyActionState } from "@/lib/action-state";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, formAction, pending] = useActionState(
    mode === "login" ? loginAction : signupAction,
    emptyActionState,
  );

  return (
    <form action={formAction}>
      {mode === "signup" ? (
        <label className="field">
          <span>부모 이름</span>
          <input name="displayName" maxLength={20} required />
        </label>
      ) : null}

      <label className="field">
        <span>이메일</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>

      <label className="field">
        <span>비밀번호{mode === "signup" ? " (8자 이상)" : ""}</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
      </label>

      {mode === "signup" ? (
        <label className="field">
          <span>첫 아이 이름 (나중에 추가해도 돼요)</span>
          <input name="childName" maxLength={20} />
        </label>
      ) : null}

      <button type="submit" className="btn primary block" disabled={pending}>
        {pending ? "처리 중..." : mode === "login" ? "로그인" : "가입하고 시작하기"}
      </button>

      {state.error ? <div className="alert error">{state.error}</div> : null}
    </form>
  );
}

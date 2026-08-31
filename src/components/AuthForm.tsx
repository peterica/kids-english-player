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
      <label className="field">
        <span>아이디</span>
        <input
          name="username"
          autoComplete="username"
          maxLength={20}
          required
          placeholder={mode === "signup" ? "영문 소문자·숫자 3~20자" : undefined}
        />
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
        <>
          <label className="field">
            <span>가정 이름 (비워도 돼요)</span>
            <input name="householdName" maxLength={20} placeholder="우리 가족" />
          </label>
          <label className="field">
            <span>첫 아이 별명 (나중에 추가해도 돼요)</span>
            <input name="childName" maxLength={20} placeholder="실명 대신 별명" />
          </label>
          <p className="muted small">
            이메일·실명은 받지 않아요. 이 서버 안에서만 쓰는 아이디예요.
          </p>
        </>
      ) : null}

      <button type="submit" className="btn primary block" disabled={pending}>
        {pending ? "처리 중..." : mode === "login" ? "로그인" : "가입하고 시작하기"}
      </button>

      {state.error ? <div className="alert error">{state.error}</div> : null}
    </form>
  );
}

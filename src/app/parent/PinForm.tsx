"use client";

import { useActionState } from "react";
import { loginWithPin, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function PinForm() {
  const [state, formAction, pending] = useActionState(loginWithPin, initialState);

  return (
    <form action={formAction}>
      <label className="label" htmlFor="pin">
        Parent PIN
      </label>
      <input
        id="pin"
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        placeholder="••••"
        style={{
          width: "100%",
          marginTop: 8,
          padding: "14px 16px",
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "#fbfcfe",
          letterSpacing: "0.4em",
        }}
      />
      <button type="submit" className="btn" style={{ width: "100%", marginTop: 16 }} disabled={pending}>
        {pending ? "확인 중..." : "들어가기"}
      </button>
      {state.error ? <div className="alert error">{state.error}</div> : null}
    </form>
  );
}

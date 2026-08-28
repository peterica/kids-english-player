"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "./actions";
import { emptyActionState } from "@/lib/action-state";

export function SettingsForm({ completionThreshold }: { completionThreshold: number }) {
  const [state, formAction, pending] = useActionState(
    updateSettingsAction,
    emptyActionState,
  );

  return (
    <form action={formAction}>
      <label className="label" htmlFor="completionThreshold">
        완료 기준 (%)
      </label>
      <input
        id="completionThreshold"
        name="completionThreshold"
        type="number"
        min={10}
        max={100}
        defaultValue={completionThreshold}
        style={inputStyle}
      />

      <label className="label" htmlFor="pin" style={{ display: "block", marginTop: 16 }}>
        새 PIN (변경할 때만 입력, 숫자 4~6자리)
      </label>
      <input
        id="pin"
        name="pin"
        type="password"
        inputMode="numeric"
        maxLength={6}
        autoComplete="off"
        placeholder="변경하지 않으려면 비워 두세요"
        style={inputStyle}
      />

      <button type="submit" className="btn" style={{ marginTop: 16 }} disabled={pending}>
        {pending ? "저장 중..." : "저장"}
      </button>

      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.message ? <div className="alert ok">{state.message}</div> : null}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "#fbfcfe",
};

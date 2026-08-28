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
    <form action={formAction} style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          id="completionThreshold"
          name="completionThreshold"
          type="number"
          min={10}
          max={100}
          defaultValue={completionThreshold}
          aria-label="완료 기준 (%)"
          style={{
            width: 90,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "#fbfcfe",
          }}
        />
        <span className="label">% 이상 시청 시 완료</span>
        <button type="submit" className="btn small" disabled={pending}>
          저장
        </button>
      </div>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.message ? <div className="alert ok">{state.message}</div> : null}
    </form>
  );
}

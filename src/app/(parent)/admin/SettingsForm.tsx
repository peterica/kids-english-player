"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/app/actions/parent";
import { emptyActionState } from "@/lib/action-state";

export function SettingsForm({ completionThreshold }: { completionThreshold: number }) {
  const [state, formAction, pending] = useActionState(
    updateSettingsAction,
    emptyActionState,
  );

  return (
    <form action={formAction}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          name="completionThreshold"
          type="number"
          min={10}
          max={100}
          defaultValue={completionThreshold}
          aria-label="완료 기준 (%)"
          style={{
            width: 100,
            minHeight: 42,
            padding: "0 12px",
            borderRadius: 13,
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
          }}
        />
        <span className="muted small">% 이상 시청하면 완료로 기록합니다 (기본 90%)</span>
        <button type="submit" className="btn" disabled={pending}>
          저장
        </button>
      </div>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.message ? <div className="alert ok">{state.message}</div> : null}
    </form>
  );
}

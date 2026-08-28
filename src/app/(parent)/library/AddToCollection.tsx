"use client";

import { useActionState } from "react";
import { addToCollectionAction } from "@/app/actions/parent";
import { emptyActionState } from "@/lib/action-state";

type ChildOption = { id: number; name: string };

/** Library 영상을 아이 Collection 으로 담는 버튼 */
export function AddToCollection({
  videoId,
  kids,
}: {
  videoId: number;
  kids: ChildOption[];
}) {
  const [state, formAction, pending] = useActionState(
    addToCollectionAction,
    emptyActionState,
  );

  if (kids.length === 0) {
    return (
      <p className="muted small" style={{ marginTop: "auto" }}>
        아이를 먼저 등록하면 Collection에 담을 수 있어요.
      </p>
    );
  }

  return (
    <form action={formAction} style={{ marginTop: "auto" }}>
      <input type="hidden" name="videoId" value={videoId} />
      <div style={{ display: "flex", gap: 6 }}>
        <select
          name="childId"
          defaultValue={kids[0].id}
          aria-label="아이 선택"
          style={{
            flex: 1,
            minHeight: 38,
            borderRadius: 11,
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            padding: "0 10px",
          }}
        >
          {kids.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn soft small" disabled={pending}>
          담기
        </button>
      </div>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.message ? <div className="alert ok">{state.message}</div> : null}
    </form>
  );
}

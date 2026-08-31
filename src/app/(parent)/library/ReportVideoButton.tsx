"use client";

import { useState } from "react";
import { CORRECTION_ERROR_TYPES } from "@/lib/constants";
import { CORRECTION_ERROR_LABEL } from "@/lib/admin/view-model";

/** 공용 Content Library 영상의 오류를 부모가 신고한다. */
export function ReportVideoButton({
  videoId,
  title,
}: {
  videoId: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/correction-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          errorType: form.get("errorType"),
          description: form.get("description"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "신고하지 못했습니다.");
        return;
      }
      setDone(true);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <div className="alert ok">신고를 접수했습니다. 운영자가 확인합니다.</div>;
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" className="btn small" onClick={() => setOpen(!open)}>
        {open ? "신고 취소" : "오류 신고"}
      </button>

      {open ? (
        <form onSubmit={submit} style={{ marginTop: 10 }}>
          <label className="field">
            <span>어떤 문제인가요?</span>
            <select name="errorType" defaultValue={CORRECTION_ERROR_TYPES[0]}>
              {CORRECTION_ERROR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CORRECTION_ERROR_LABEL[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>설명</span>
            <input
              name="description"
              required
              maxLength={500}
              placeholder={`${title} 의 어떤 점이 문제인가요?`}
            />
          </label>
          <button type="submit" className="btn small primary" disabled={busy}>
            {busy ? "보내는 중..." : "신고 보내기"}
          </button>
          {error ? <div className="alert error">{error}</div> : null}
        </form>
      ) : null}
    </div>
  );
}

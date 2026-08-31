"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CORRECTION_ERROR_LABEL,
  CORRECTION_STATUS_LABEL,
  correctionStatusClass,
} from "@/lib/admin/view-model";
import type { CorrectionRequestView } from "@/lib/correction-requests";
import { formatTimeOfDay } from "@/lib/format";

export function CorrectionRequestAdmin({
  requests,
}: {
  requests: CorrectionRequestView[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateStatus = async (id: number, status: "RESOLVED" | "REJECTED") => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/correction-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "처리하지 못했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ marginTop: 18 }}>
      {error ? <div className="alert error">{error}</div> : null}
      {requests.length === 0 ? (
        <p className="muted small">조건에 맞는 요청이 없습니다.</p>
      ) : (
        <div className="list">
          {requests.map((request) => (
            <div className="collection-row" key={request.id}>
              <div className="order">{request.id}</div>
              <div style={{ minWidth: 0 }}>
                <strong>{request.videoTitle ?? `Video ${request.videoId}`}</strong>
                <div className="muted small">
                  {CORRECTION_ERROR_LABEL[request.errorType]} · 신고자{" "}
                  {request.requesterName ?? request.requesterId} ·{" "}
                  {new Date(request.createdAt).toLocaleDateString("ko-KR")}{" "}
                  {formatTimeOfDay(new Date(request.createdAt))}
                </div>
                <div className="muted small">{request.description}</div>
              </div>
              <div className="row-actions">
                <span className={correctionStatusClass(request.status)}>
                  {CORRECTION_STATUS_LABEL[request.status]}
                </span>
                <Link
                  href={`/admin/content/videos/${request.videoId}`}
                  className="btn small"
                >
                  영상 수정
                </Link>
                {request.status === "OPEN" ? (
                  <>
                    <button
                      type="button"
                      className="btn small primary"
                      disabled={busy}
                      onClick={() => void updateStatus(request.id, "RESOLVED")}
                    >
                      처리 완료
                    </button>
                    <button
                      type="button"
                      className="btn small danger"
                      disabled={busy}
                      onClick={() => void updateStatus(request.id, "REJECTED")}
                    >
                      반려
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

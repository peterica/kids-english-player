"use client";

import { useActionState, useState } from "react";
import { addVideoAction, updateVideoAction } from "../actions";
import { emptyActionState } from "@/lib/action-state";
import type { ProgressStatus } from "@/lib/constants";
import { formatClock } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export type ManagedVideo = {
  id: number;
  title: string;
  youtubeVideoId: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  enabled: boolean;
  status: ProgressStatus;
  progressPercent: number;
};

export function VideoManager({ videos }: { videos: ManagedVideo[] }) {
  const [addState, addAction, adding] = useActionState(addVideoAction, emptyActionState);
  const [rowState, rowAction] = useActionState(updateVideoAction, emptyActionState);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <>
      <section className="card">
        <div className="section-title">
          <h3>새 영상 추가</h3>
        </div>
        <form action={addAction} className="form-row">
          <input
            name="url"
            placeholder="https://www.youtube.com/watch?v=..."
            aria-label="YouTube URL"
            required
          />
          <input name="title" placeholder="제목 (비우면 자동으로 가져옵니다)" aria-label="제목" />
          <button type="submit" className="btn" disabled={adding}>
            {adding ? "가져오는 중..." : "영상 추가"}
          </button>
        </form>
        <div className="hint">
          watch, youtu.be, shorts, embed 주소를 지원합니다. 제목은 YouTube oEmbed로 자동
          조회하며, 실패하면 직접 입력할 수 있습니다.
        </div>
        {addState.error ? <div className="alert error">{addState.error}</div> : null}
        {addState.message ? <div className="alert ok">{addState.message}</div> : null}
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-title">
          <h3>학습 영상 목록</h3>
          <span className="label">위/아래 버튼으로 순서를 바꿉니다</span>
        </div>

        {rowState.error ? <div className="alert error">{rowState.error}</div> : null}

        {videos.length === 0 ? (
          <p className="hint">등록된 영상이 없습니다. 위에서 YouTube 주소를 추가해 주세요.</p>
        ) : (
          <div className="list">
            {videos.map((video, index) => (
              <div className="list-row" key={video.id}>
                <div className="num">{index + 1}</div>
                <div style={{ minWidth: 0 }}>
                  {editingId === video.id ? (
                    <form action={rowAction} className="form-row" onSubmit={() => setEditingId(null)}>
                      <input type="hidden" name="videoId" value={video.id} />
                      <input type="hidden" name="intent" value="rename" />
                      <input name="title" defaultValue={video.title} aria-label="제목" />
                      <button type="submit" className="btn small">
                        저장
                      </button>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => setEditingId(null)}
                      >
                        취소
                      </button>
                    </form>
                  ) : (
                    <>
                      <strong>{video.title}</strong>
                      <div className="hint">
                        {video.durationSeconds ? `${formatClock(video.durationSeconds)} · ` : ""}
                        {video.enabled ? "활성" : "비활성"} · {video.progressPercent}% ·{" "}
                        {video.youtubeVideoId}
                      </div>
                    </>
                  )}
                </div>

                <StatusBadge status={video.status} enabled={video.enabled} />

                <div className="row-actions">
                  <RowButton action={rowAction} videoId={video.id} intent="up" label="↑" />
                  <RowButton action={rowAction} videoId={video.id} intent="down" label="↓" />
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => setEditingId(editingId === video.id ? null : video.id)}
                  >
                    제목
                  </button>
                  <RowButton
                    action={rowAction}
                    videoId={video.id}
                    intent={video.enabled ? "disable" : "enable"}
                    label={video.enabled ? "비활성" : "활성"}
                  />
                  <RowButton
                    action={rowAction}
                    videoId={video.id}
                    intent="reset"
                    label="진행 초기화"
                    confirmMessage={`'${video.title}'의 학습 기록을 초기화할까요?`}
                  />
                  <RowButton
                    action={rowAction}
                    videoId={video.id}
                    intent="delete"
                    label="삭제"
                    danger
                    confirmMessage={`'${video.title}'을(를) 삭제할까요? 학습 기록도 함께 삭제됩니다.`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function RowButton({
  action,
  videoId,
  intent,
  label,
  danger,
  confirmMessage,
}: {
  action: (formData: FormData) => void;
  videoId: number;
  intent: string;
  label: string;
  danger?: boolean;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="videoId" value={videoId} />
      <input type="hidden" name="intent" value={intent} />
      <button type="submit" className={`btn ${danger ? "danger" : "ghost"} small`}>
        {label}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { addVideoAction, updateVideoAction } from "../actions";
import { emptyActionState } from "@/lib/action-state";
import { formatClock } from "@/lib/format";

export type ManagedVideo = {
  id: number;
  title: string;
  youtubeVideoId: string;
  durationSeconds: number | null;
  enabled: boolean;
  playlistTitles: string[];
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
          watch, youtu.be, shorts, embed 주소를 지원합니다. 여기서 추가한 영상은 카탈로그에만
          등록되며, 아이에게 보여주려면 학습 과정에 포함된 영상이어야 합니다.
        </div>
        {addState.error ? <div className="alert error">{addState.error}</div> : null}
        {addState.message ? <div className="alert ok">{addState.message}</div> : null}
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-title">
          <h3>영상 목록</h3>
          <span className="label">위/아래 버튼은 카탈로그 정렬 순서입니다</span>
        </div>

        {rowState.error ? <div className="alert error">{rowState.error}</div> : null}

        {videos.length === 0 ? (
          <p className="hint">등록된 영상이 없습니다.</p>
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
                      <button type="submit" className="btn small">저장</button>
                      <button type="button" className="btn ghost small" onClick={() => setEditingId(null)}>
                        취소
                      </button>
                    </form>
                  ) : (
                    <>
                      <strong>{video.title}</strong>
                      <div className="hint">
                        {video.durationSeconds ? `${formatClock(video.durationSeconds)} · ` : ""}
                        {video.enabled ? "활성" : "비활성"} · {video.youtubeVideoId}
                        {video.playlistTitles.length > 0
                          ? ` · ${video.playlistTitles.join(", ")}`
                          : " · 학습 과정 없음"}
                      </div>
                    </>
                  )}
                </div>

                <span className={`status ${video.enabled ? "done" : "off"}`}>
                  {video.enabled ? "활성" : "비활성"}
                </span>

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
                    label={video.enabled ? "비활성으로" : "활성으로"}
                  />
                  <RowButton
                    action={rowAction}
                    videoId={video.id}
                    intent="delete"
                    label="삭제"
                    danger
                    confirmMessage={`'${video.title}'을(를) 삭제할까요? 모든 아이의 학습 기록도 함께 삭제됩니다.`}
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

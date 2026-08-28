"use client";

import { useActionState } from "react";
import { updateChildAction } from "../../actions";
import { emptyActionState } from "@/lib/action-state";
import { PROGRESS_STATUS } from "@/lib/constants";

type PlaylistRow = {
  id: number;
  title: string;
  description: string | null;
  videoCount: number;
  status: string;
};

export function ChildPlaylistControls({
  childId,
  activePlaylistId,
  playlists,
}: {
  childId: number;
  activePlaylistId: number | null;
  playlists: PlaylistRow[];
}) {
  const [state, formAction] = useActionState(updateChildAction, emptyActionState);

  return (
    <>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.message ? <div className="alert ok">{state.message}</div> : null}

      <div className="list">
        {playlists.map((playlist) => {
          const active = playlist.id === activePlaylistId;
          return (
            <div className="list-row" key={playlist.id}>
              <div className="num">{playlist.title.replace(/[^0-9]/g, "")}</div>
              <div style={{ minWidth: 0 }}>
                <strong>{playlist.title}</strong>
                <div className="hint">
                  {playlist.videoCount}편
                  {playlist.description ? ` · ${playlist.description}` : ""}
                </div>
              </div>
              <span
                className={`status ${
                  active
                    ? "doing"
                    : playlist.status === PROGRESS_STATUS.COMPLETED
                      ? "done"
                      : "wait"
                }`}
              >
                {active ? "학습 중" : playlist.status === PROGRESS_STATUS.COMPLETED ? "완료" : "대기"}
              </span>
              <div className="row-actions">
                <form action={formAction}>
                  <input type="hidden" name="childId" value={childId} />
                  <input type="hidden" name="intent" value="playlist" />
                  <input type="hidden" name="playlistId" value={playlist.id} />
                  <button type="submit" className="btn ghost small" disabled={active}>
                    {active ? "선택됨" : "이 과정으로"}
                  </button>
                </form>
                <form
                  action={formAction}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `${playlist.title}의 학습 기록을 초기화할까요? 이 아이의 기록만 지워집니다.`,
                      )
                    ) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="childId" value={childId} />
                  <input type="hidden" name="intent" value="reset-playlist" />
                  <input type="hidden" name="playlistId" value={playlist.id} />
                  <button type="submit" className="btn danger small">
                    기록 초기화
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

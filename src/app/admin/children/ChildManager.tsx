"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addChildAction, updateChildAction } from "../actions";
import { emptyActionState } from "@/lib/action-state";

type ManagedChild = {
  id: number;
  name: string;
  enabled: boolean;
  playlistTitle: string | null;
  completedCount: number;
  activeCount: number;
};

type PlaylistOption = { id: number; title: string; videoCount: number };

export function ChildManager({
  kids,
  playlists,
}: {
  kids: ManagedChild[];
  playlists: PlaylistOption[];
}) {
  const [addState, addAction, adding] = useActionState(addChildAction, emptyActionState);
  const [rowState, rowAction] = useActionState(updateChildAction, emptyActionState);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <>
      <section className="card">
        <div className="section-title">
          <h3>아이 추가</h3>
        </div>
        <form action={addAction} className="form-row">
          <input name="name" placeholder="아이 이름" aria-label="아이 이름" maxLength={20} required />
          <button type="submit" className="btn" disabled={adding}>
            {adding ? "등록 중..." : "아이 추가"}
          </button>
        </form>
        {addState.error ? <div className="alert error">{addState.error}</div> : null}
        {addState.message ? <div className="alert ok">{addState.message}</div> : null}
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-title">
          <h3>아이 목록</h3>
          <span className="label">학습 과정을 고르면 아이 화면에 바로 반영됩니다</span>
        </div>

        {rowState.error ? <div className="alert error">{rowState.error}</div> : null}
        {rowState.message ? <div className="alert ok">{rowState.message}</div> : null}

        {kids.length === 0 ? (
          <p className="hint">아직 등록된 아이가 없습니다.</p>
        ) : (
          <div className="list">
            {kids.map((child) => (
              <div className="list-row" key={child.id}>
                <div className="num">{child.name.slice(0, 1)}</div>
                <div style={{ minWidth: 0 }}>
                  {editingId === child.id ? (
                    <form action={rowAction} className="form-row" onSubmit={() => setEditingId(null)}>
                      <input type="hidden" name="childId" value={child.id} />
                      <input type="hidden" name="intent" value="rename" />
                      <input name="name" defaultValue={child.name} maxLength={20} aria-label="아이 이름" />
                      <button type="submit" className="btn small">저장</button>
                      <button type="button" className="btn ghost small" onClick={() => setEditingId(null)}>
                        취소
                      </button>
                    </form>
                  ) : (
                    <>
                      <strong>{child.name}</strong>
                      <div className="hint">
                        {child.playlistTitle ?? "학습 과정 미지정"} · {child.completedCount} /{" "}
                        {child.activeCount} 완료 · {child.enabled ? "활성" : "비활성"}
                      </div>
                    </>
                  )}

                  <form action={rowAction} className="form-row" style={{ marginTop: 10 }}>
                    <input type="hidden" name="childId" value={child.id} />
                    <input type="hidden" name="intent" value="playlist" />
                    <select
                      name="playlistId"
                      aria-label="학습 과정"
                      defaultValue={
                        playlists.find((p) => p.title === child.playlistTitle)?.id ?? ""
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--line)",
                        background: "#fbfcfe",
                      }}
                    >
                      <option value="" disabled>
                        학습 과정 선택
                      </option>
                      {playlists.map((playlist) => (
                        <option key={playlist.id} value={playlist.id}>
                          {playlist.title} ({playlist.videoCount}편)
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn small">
                      학습 과정 적용
                    </button>
                  </form>
                </div>

                <span className={`status ${child.enabled ? "done" : "off"}`}>
                  {child.enabled ? "활성" : "비활성"}
                </span>

                <div className="row-actions">
                  <Link href={`/admin/children/${child.id}`} className="btn ghost small">
                    상세
                  </Link>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => setEditingId(editingId === child.id ? null : child.id)}
                  >
                    이름
                  </button>
                  <form action={rowAction}>
                    <input type="hidden" name="childId" value={child.id} />
                    <input type="hidden" name="intent" value={child.enabled ? "disable" : "enable"} />
                    <button type="submit" className="btn ghost small">
                      {child.enabled ? "비활성" : "활성"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

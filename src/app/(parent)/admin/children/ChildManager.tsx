"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addChildAction,
  updateChildAction,
  updatePreferenceAction,
} from "@/app/actions/parent";
import { emptyActionState } from "@/lib/action-state";
import { LEVELS } from "@/lib/constants";
import type { ChildSummary } from "@/lib/household";

type ChannelOption = { id: number; name: string; colorKey: string };

export function ChildManager({
  kids,
  channels,
}: {
  kids: ChildSummary[];
  channels: ChannelOption[];
}) {
  const [addState, addAction, adding] = useActionState(addChildAction, emptyActionState);
  const [rowState, rowAction] = useActionState(updateChildAction, emptyActionState);
  const [prefState, prefAction] = useActionState(
    updatePreferenceAction,
    emptyActionState,
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <>
      <section className="card">
        <div className="section-title">
          <h2>아이 추가</h2>
        </div>
        <form action={addAction} className="filterbar" style={{ marginBottom: 0 }}>
          <input
            name="name"
            placeholder="아이 별명 (실명 아니어도 돼요)"
            maxLength={20}
            required
            aria-label="아이 별명"
          />
          <button type="submit" className="btn primary" disabled={adding}>
            {adding ? "등록 중..." : "아이 추가"}
          </button>
        </form>
        {addState.error ? <div className="alert error">{addState.error}</div> : null}
        {addState.message ? <div className="alert ok">{addState.message}</div> : null}
      </section>

      {rowState.error ? <div className="alert error">{rowState.error}</div> : null}
      {prefState.error ? <div className="alert error">{prefState.error}</div> : null}
      {prefState.message ? <div className="alert ok">{prefState.message}</div> : null}

      <div className="grid equal2" style={{ marginTop: 18 }}>
        {kids.map((child) => (
          <section className="card" key={child.id}>
            <div className="section-title">
              {editingId === child.id ? (
                <form
                  action={rowAction}
                  className="filterbar"
                  style={{ marginBottom: 0 }}
                  onSubmit={() => setEditingId(null)}
                >
                  <input type="hidden" name="childId" value={child.id} />
                  <input type="hidden" name="intent" value="rename" />
                  <input
                    name="name"
                    defaultValue={child.name}
                    maxLength={20}
                    aria-label="아이 별명"
                  />
                  <button type="submit" className="btn small primary">
                    저장
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => setEditingId(null)}
                  >
                    취소
                  </button>
                </form>
              ) : (
                <h2>{child.name}</h2>
              )}
              <span className={`status ${child.enabled ? "done" : "wait"}`}>
                {child.enabled ? "활성" : "비활성"}
              </span>
            </div>

            <div className="muted small">
              볼 수 있는 영상 {child.catalogSize}편 · 완료 {child.completedCount}편 · Collection{" "}
              {child.collectionCount}편
            </div>

            <form action={prefAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="childId" value={child.id} />

              <div className="grid equal2" style={{ gap: 12 }}>
                <label className="field">
                  <span>허용 Level (최소)</span>
                  <select name="minLevel" defaultValue={child.minLevel}>
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>
                        Level {level}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>허용 Level (최대)</span>
                  <select name="maxLevel" defaultValue={child.maxLevel}>
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>
                        Level {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="field">
                <span>선호 Channel (선택하지 않으면 모든 Channel 허용)</span>
                <div className="checkbox-row">
                  {channels.map((channel) => (
                    <label className="checkbox-chip" key={channel.id}>
                      <input
                        type="checkbox"
                        name="channelIds"
                        value={channel.id}
                        defaultChecked={child.preferredChannels.some(
                          (row) => row.id === channel.id,
                        )}
                      />
                      {channel.name}
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn primary">
                콘텐츠 설정 저장
              </button>
            </form>

            <div className="row-actions" style={{ marginTop: 16, justifyContent: "flex-start" }}>
              <Link href={`/admin/children/${child.id}`} className="btn small">
                상세 보기
              </Link>
              <Link href={`/kids/${child.id}`} className="btn small">
                아이 화면
              </Link>
              <button
                type="button"
                className="btn small"
                onClick={() => setEditingId(editingId === child.id ? null : child.id)}
              >
                이름 변경
              </button>
              <form action={rowAction}>
                <input type="hidden" name="childId" value={child.id} />
                <input type="hidden" name="intent" value={child.enabled ? "disable" : "enable"} />
                <button type="submit" className="btn small">
                  {child.enabled ? "비활성" : "활성"}
                </button>
              </form>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

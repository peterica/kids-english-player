"use client";

import { useActionState, useState } from "react";
import {
  addCustomVideoAction,
  collectionVideoAction,
} from "@/app/actions/parent";
import { emptyActionState } from "@/lib/action-state";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import { formatCategory } from "@/lib/format";

type CollectionRow = {
  videoId: number;
  title: string;
  channelName: string;
  level: number;
  category: string;
  enabled: boolean;
  isCustom: boolean;
};

type CollectionData = {
  id: number;
  title: string;
  childId: number | null;
  childName: string;
  videos: CollectionRow[];
};

export function CollectionManager({
  collections,
  channels,
}: {
  collections: CollectionData[];
  channels: { id: number; name: string }[];
}) {
  const [rowState, rowAction] = useActionState(collectionVideoAction, emptyActionState);
  const [customState, customAction, customPending] = useActionState(
    addCustomVideoAction,
    emptyActionState,
  );
  const [openFormId, setOpenFormId] = useState<number | null>(null);

  return (
    <>
      {rowState.error ? <div className="alert error">{rowState.error}</div> : null}
      {customState.error ? <div className="alert error">{customState.error}</div> : null}
      {customState.message ? <div className="alert ok">{customState.message}</div> : null}

      <div className="grid autofit">
        {collections.map((collection) => (
          <section className="card" key={collection.id}>
            <div className="section-title">
              <h2>{collection.childName} Collection</h2>
              <span className="tag blue">{collection.videos.length}편</span>
            </div>

            <div className="note">
              담은 영상은 허용 Level 범위를 벗어나도 아이가 볼 수 있습니다. 숨긴 영상은 아이 화면에
              나타나지 않습니다.
            </div>

            <div style={{ marginTop: 14 }}>
              {collection.videos.length === 0 ? (
                <p className="muted small">
                  아직 담은 영상이 없습니다. Library에서 &quot;담기&quot;를 눌러 추가하세요.
                </p>
              ) : (
                collection.videos.map((row, index) => (
                  <div className="collection-row" key={row.videoId}>
                    <div className="order">{index + 1}</div>
                    <div style={{ minWidth: 0 }}>
                      <strong>{row.title}</strong>
                      <div className="muted small">
                        {row.channelName} · Level {row.level} · {formatCategory(row.category)}
                        {row.isCustom ? " · 직접 등록" : ""}
                        {row.enabled ? "" : " · 숨김"}
                      </div>
                    </div>
                    <div className="row-actions">
                      <RowButton
                        action={rowAction}
                        collectionId={collection.id}
                        videoId={row.videoId}
                        intent="up"
                        label="↑"
                      />
                      <RowButton
                        action={rowAction}
                        collectionId={collection.id}
                        videoId={row.videoId}
                        intent="down"
                        label="↓"
                      />
                      <RowButton
                        action={rowAction}
                        collectionId={collection.id}
                        videoId={row.videoId}
                        intent={row.enabled ? "hide" : "show"}
                        label={row.enabled ? "숨기기" : "보이기"}
                      />
                      <RowButton
                        action={rowAction}
                        collectionId={collection.id}
                        videoId={row.videoId}
                        intent="remove"
                        label="빼기"
                        danger
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn"
              style={{ marginTop: 16 }}
              onClick={() =>
                setOpenFormId(openFormId === collection.id ? null : collection.id)
              }
            >
              {openFormId === collection.id ? "직접 등록 닫기" : "YouTube 직접 등록"}
            </button>

            {openFormId === collection.id ? (
              <form action={customAction} style={{ marginTop: 14 }}>
                <input type="hidden" name="collectionId" value={collection.id} />
                <label className="field">
                  <span>YouTube 주소</span>
                  <input
                    name="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                </label>
                <label className="field">
                  <span>제목 (비우면 자동으로 가져옵니다)</span>
                  <input name="title" />
                </label>
                <div className="grid three" style={{ gap: 10 }}>
                  <label className="field">
                    <span>Channel</span>
                    <select name="channelId" defaultValue={channels[0]?.id}>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Level</span>
                    <select name="level" defaultValue={3}>
                      {LEVELS.map((level) => (
                        <option key={level} value={level}>
                          Level {level}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Category</span>
                    <select name="category" defaultValue="STORY">
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {formatCategory(category)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="submit" className="btn primary" disabled={customPending}>
                  {customPending ? "등록 중..." : "이 Collection에 등록"}
                </button>
              </form>
            ) : null}
          </section>
        ))}
      </div>
    </>
  );
}

function RowButton({
  action,
  collectionId,
  videoId,
  intent,
  label,
  danger,
}: {
  action: (formData: FormData) => void;
  collectionId: number;
  videoId: number;
  intent: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="collectionId" value={collectionId} />
      <input type="hidden" name="videoId" value={videoId} />
      <input type="hidden" name="intent" value={intent} />
      <button type="submit" className={`btn small ${danger ? "danger" : ""}`}>
        {label}
      </button>
    </form>
  );
}

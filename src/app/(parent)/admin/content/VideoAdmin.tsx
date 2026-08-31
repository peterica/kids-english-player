"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminVideoRow = {
  id: number;
  title: string;
  publisher: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  level: number;
  category: string;
  enabled: boolean;
  channelId: number;
  channelName: string;
  channelSlug: string;
};

type ChannelOption = { id: number; name: string; slug: string; enabled: boolean };

export function VideoAdmin({
  videos,
  channels,
  categories,
  levels,
  filter,
}: {
  videos: AdminVideoRow[];
  channels: ChannelOption[];
  categories: string[];
  levels: number[];
  filter: { channel: string; level: string; category: string; enabled: string; q: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = async (url: string, init: RequestInit) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(url, init);
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "요청을 처리하지 못했습니다.");
        return null;
      }
      return data;
    } finally {
      setBusy(false);
    }
  };

  const create = async (form: FormData) => {
    const data = await call("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: Number(form.get("channelId")),
        level: Number(form.get("level")),
        title: form.get("title"),
        category: form.get("category"),
        publisher: form.get("publisher"),
        youtubeUrl: form.get("youtubeUrl"),
      }),
    });
    if (data) {
      setMessage(`등록했습니다: ${data.video.title}`);
      router.refresh();
    }
  };

  const toggle = async (video: AdminVideoRow) => {
    const data = await call(`/api/admin/videos/${video.id}/enabled`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !video.enabled }),
    });
    if (data) {
      setMessage(`${video.title} → ${data.video.enabled ? "노출" : "숨김"}`);
      router.refresh();
    }
  };

  const remove = async (video: AdminVideoRow) => {
    if (
      !window.confirm(
        `'${video.title}'을(를) 완전히 삭제할까요?\n이 영상의 학습 기록·Collection 항목·수정 요청도 함께 삭제됩니다.`,
      )
    ) {
      return;
    }
    const data = await call(`/api/admin/videos/${video.id}`, { method: "DELETE" });
    if (data) {
      setMessage(`삭제했습니다: ${data.deleted.title}`);
      router.refresh();
    }
  };

  return (
    <>
      <section className="card">
        <div className="section-title">
          <h2>검색 / 필터</h2>
        </div>
        <form className="filterbar" method="get" style={{ marginBottom: 0 }}>
          <select name="channel" defaultValue={filter.channel} aria-label="Channel">
            <option value="">Channel 전체</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.slug}>
                {channel.name}
              </option>
            ))}
          </select>
          <select name="level" defaultValue={filter.level} aria-label="Level">
            <option value="">Level 전체</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={filter.category} aria-label="Category">
            <option value="">Category 전체</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select name="enabled" defaultValue={filter.enabled} aria-label="Enabled">
            <option value="">노출 상태 전체</option>
            <option value="true">노출</option>
            <option value="false">숨김</option>
          </select>
          <input
            name="q"
            defaultValue={filter.q}
            placeholder="제목 / Publisher / URL / Video ID"
            aria-label="검색"
          />
          <button type="submit" className="btn primary">
            검색
          </button>
          <Link href="/admin/content" className="btn">
            초기화
          </Link>
        </form>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="section-title">
          <h2>영상 등록</h2>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void create(form).then(() => event.currentTarget?.reset?.());
          }}
        >
          <div className="grid three" style={{ gap: 12 }}>
            <label className="field">
              <span>Channel</span>
              <select name="channelId" required defaultValue="">
                <option value="" disabled>
                  선택
                </option>
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
                {levels.map((level) => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Category</span>
              <select name="category" defaultValue={categories[0]}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid equal2" style={{ gap: 12 }}>
            <label className="field">
              <span>Title</span>
              <input name="title" required maxLength={200} />
            </label>
            <label className="field">
              <span>Publisher (실제 YouTube 업로더)</span>
              <input name="publisher" required maxLength={100} />
            </label>
          </div>
          <label className="field">
            <span>YouTube URL (https://www.youtube.com/watch?v=...)</span>
            <input name="youtubeUrl" required placeholder="https://www.youtube.com/watch?v=" />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>
            등록
          </button>
        </form>
        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert ok">{message}</div> : null}
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="section-title">
          <h2>영상 목록</h2>
          <span className="muted small">{videos.length}편</span>
        </div>
        {videos.length === 0 ? (
          <p className="muted small">조건에 맞는 영상이 없습니다.</p>
        ) : (
          <div className="list">
            {videos.map((video) => (
              <div className="collection-row" key={video.id}>
                <div className="order">{video.enabled ? "노출" : "숨김"}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{video.title}</strong>
                  <div className="muted small">
                    {video.channelName} · Level {video.level} · {video.category} ·{" "}
                    {video.publisher}
                  </div>
                  <div className="muted small">{video.youtubeUrl}</div>
                </div>
                <div className="row-actions">
                  <Link href={`/admin/content/videos/${video.id}`} className="btn small">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn small"
                    disabled={busy}
                    onClick={() => void toggle(video)}
                  >
                    {video.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className="btn small danger"
                    disabled={busy}
                    onClick={() => void remove(video)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

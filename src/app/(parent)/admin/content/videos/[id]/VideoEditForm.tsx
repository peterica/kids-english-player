"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminVideo } from "@/lib/admin/videos";

export function VideoEditForm({
  video,
  channels,
  categories,
  levels,
}: {
  video: AdminVideo;
  channels: { id: number; name: string }[];
  categories: string[];
  levels: number[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/videos/${video.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: Number(form.get("channelId")),
          level: Number(form.get("level")),
          title: form.get("title"),
          category: form.get("category"),
          publisher: form.get("publisher"),
          youtubeUrl: form.get("youtubeUrl"),
          enabled: form.get("enabled") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "저장하지 못했습니다.");
        return;
      }
      setMessage("저장했습니다.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <form onSubmit={submit}>
        <div className="grid three" style={{ gap: 12 }}>
          <label className="field">
            <span>Channel</span>
            <select name="channelId" defaultValue={video.channelId}>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Level</span>
            <select name="level" defaultValue={video.level}>
              {levels.map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue={video.category}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Title</span>
          <input name="title" defaultValue={video.title} required maxLength={200} />
        </label>
        <label className="field">
          <span>Publisher (실제 YouTube 업로더)</span>
          <input name="publisher" defaultValue={video.publisher} required maxLength={100} />
        </label>
        <label className="field">
          <span>YouTube URL</span>
          <input name="youtubeUrl" defaultValue={video.youtubeUrl} required />
        </label>

        <label className="checkbox-chip" style={{ marginBottom: 16 }}>
          <input type="checkbox" name="enabled" defaultChecked={video.enabled} />
          아이 화면에 노출
        </label>

        <div>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
    </section>
  );
}

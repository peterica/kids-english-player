"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ChannelRow = {
  id: number;
  name: string;
  slug: string;
  enabled: boolean;
  videoCount: number;
};

export function ChannelAdmin({ channels }: { channels: ChannelRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
      router.refresh();
      return data;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="card">
        <div className="section-title">
          <h2>Channel 추가</h2>
        </div>
        <form
          className="filterbar"
          style={{ marginBottom: 0 }}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const data = await call("/api/admin/channels", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: form.get("name") }),
            });
            if (data) setMessage(`추가했습니다: ${data.channel.name} (${data.channel.slug})`);
          }}
        >
          <input name="name" placeholder="Channel 이름" required maxLength={60} />
          <button type="submit" className="btn primary" disabled={busy}>
            추가
          </button>
        </form>
        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert ok">{message}</div> : null}
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="section-title">
          <h2>Channel 목록</h2>
        </div>
        <div className="list">
          {channels.map((channel) => (
            <div className="collection-row" key={channel.id}>
              <div className="order">{channel.videoCount}</div>
              <div style={{ minWidth: 0 }}>
                {editingId === channel.id ? (
                  <form
                    className="filterbar"
                    style={{ marginBottom: 0 }}
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const data = await call(`/api/admin/channels/${channel.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: form.get("name"),
                          enabled: channel.enabled,
                        }),
                      });
                      if (data) {
                        setMessage("이름을 바꿨습니다. slug 는 그대로 유지됩니다.");
                        setEditingId(null);
                      }
                    }}
                  >
                    <input name="name" defaultValue={channel.name} required maxLength={60} />
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
                  <>
                    <strong>{channel.name}</strong>
                    <div className="muted small">
                      slug: {channel.slug} · 영상 {channel.videoCount}편 ·{" "}
                      {channel.enabled ? "사용" : "미사용"}
                    </div>
                  </>
                )}
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn small"
                  onClick={() => setEditingId(editingId === channel.id ? null : channel.id)}
                >
                  이름
                </button>
                <button
                  type="button"
                  className="btn small"
                  disabled={busy}
                  onClick={() =>
                    void call(`/api/admin/channels/${channel.id}/enabled`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ enabled: !channel.enabled }),
                    })
                  }
                >
                  {channel.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  className="btn small danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `'${channel.name}' Channel 을 삭제할까요? 영상이 남아 있으면 삭제되지 않습니다.`,
                      )
                    ) {
                      return;
                    }
                    void call(`/api/admin/channels/${channel.id}`, { method: "DELETE" });
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

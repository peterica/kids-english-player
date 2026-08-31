"use client";

import { useState } from "react";
import {
  canImport,
  defaultSelectedRows,
  importStatusLabel,
  importSummaryText,
  rowErrorText,
} from "@/lib/admin/view-model";
import type { ImportPreview } from "@/lib/admin/markdown-import";

export function ImportWorkbench({
  channels,
}: {
  channels: { id: number; name: string }[];
}) {
  const [channelId, setChannelId] = useState<string>(String(channels[0]?.id ?? ""));
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setMarkdown(await file.text());
    setPreview(null);
    setSummary(null);
  };

  const validate = async () => {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const response = await fetch("/api/admin/videos/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: Number(channelId), markdown }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPreview(null);
        setError(data?.error ?? "검증하지 못했습니다.");
        return;
      }
      const next: ImportPreview = {
        validCount: data.validCount,
        duplicateCount: data.duplicateCount,
        invalidCount: data.invalidCount,
        rows: data.rows,
        errors: data.errors ?? [],
      };
      setPreview(next);
      setSelected(defaultSelectedRows(next));
      if (next.errors.length > 0) setError(next.errors.join(" "));
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/videos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: Number(channelId),
          markdown,
          selectedRows: selected,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "등록하지 못했습니다.");
        return;
      }
      setSummary(
        `등록 ${data.importedCount}건 · 제외 ${data.skippedCount}건 (중복 ${data.duplicateCount} / 오류 ${data.invalidCount})`,
      );
      setPreview({
        validCount: data.validCount,
        duplicateCount: data.duplicateCount,
        invalidCount: data.invalidCount,
        rows: data.rows,
        errors: [],
      });
      setSelected([]);
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (row: number) =>
    setSelected((current) =>
      current.includes(row) ? current.filter((value) => value !== row) : [...current, row],
    );

  return (
    <>
      <section className="card">
        <div className="grid equal2" style={{ gap: 12 }}>
          <label className="field">
            <span>대상 Channel</span>
            <select value={channelId} onChange={(event) => setChannelId(event.target.value)}>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>.md 파일 선택</span>
            <input
              type="file"
              accept=".md,text/markdown,text/plain"
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
          </label>
        </div>

        <label className="field">
          <span>Markdown 직접 붙여넣기</span>
          <textarea
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              setPreview(null);
            }}
            rows={10}
            placeholder="| Level | Title | Category | Publisher | YouTube URL |"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 13,
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
            }}
          />
        </label>

        <div className="top-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => void validate()}
            disabled={busy || !markdown.trim() || !channelId}
          >
            검증하기
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void runImport()}
            disabled={busy || !preview || !canImport(preview, selected)}
          >
            선택한 행 등록
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {summary ? <div className="alert ok">{summary}</div> : null}
      </section>

      {preview ? (
        <section className="card" style={{ marginTop: 18 }}>
          <div className="section-title">
            <h2>검증 결과</h2>
            <span className="muted small">{importSummaryText(preview)}</span>
          </div>
          <div className="list">
            {preview.rows.map((row) => {
              const label = importStatusLabel(row.status);
              return (
                <div className="collection-row" key={row.row}>
                  <div className="order">
                    {row.status === "VALID" ? (
                      <input
                        type="checkbox"
                        checked={selected.includes(row.row)}
                        onChange={() => toggleRow(row.row)}
                        aria-label={`${row.row}행 선택`}
                      />
                    ) : (
                      row.row
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong>
                      {row.row}. {row.title || "(제목 없음)"}
                    </strong>
                    <div className="muted small">
                      Level {row.level ?? "-"} · {row.category || "-"} · {row.publisher || "-"}
                    </div>
                    <div className="muted small">{row.youtubeUrl || "(URL 없음)"}</div>
                    {row.errors.length > 0 ? (
                      <div className="muted small" style={{ color: "var(--danger)" }}>
                        {rowErrorText(row)}
                      </div>
                    ) : null}
                  </div>
                  <span className={label.className}>{label.text}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}

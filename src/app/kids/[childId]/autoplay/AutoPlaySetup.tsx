"use client";

import { useState } from "react";
import { AUTO_PLAY_DURATION_OPTIONS, LEVELS, PLAY_MODE } from "@/lib/constants";
import type { StartedAutoPlay } from "./AutoPlayShell";

/** 선택지는 상수 한 곳에서만 정의한다. null 은 "제한 없음". */
const DURATIONS = AUTO_PLAY_DURATION_OPTIONS.map((minutes) => ({
  label: minutes === null ? "제한 없음" : `${minutes}분`,
  value: minutes === null ? "" : String(minutes),
}));

export function AutoPlaySetup({
  childId,
  childName,
  channels,
  minLevel,
  maxLevel,
  catalogSize,
  onStarted,
}: {
  childId: number;
  childName: string;
  channels: { id: number; name: string; count: number }[];
  minLevel: number;
  maxLevel: number;
  catalogSize: number;
  onStarted: (started: StartedAutoPlay) => void;
}) {
  const [playMode, setPlayMode] = useState<string>(PLAY_MODE.SEQUENTIAL);
  const [replay, setReplay] = useState("true");
  const [minutes, setMinutes] = useState("30");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 페이지를 이동하지 않고 여기서 세션을 만든다.
   * 이 클릭이 그대로 재생 제스처가 되어 첫 영상이 바로 시작된다.
   */
  const start = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/autoplay/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          channelId: form.get("channelId") || null,
          minLevel: Number(form.get("minLevel")),
          maxLevel: Number(form.get("maxLevel")),
          playMode,
          replayCompleted: replay === "true",
          maxMinutes: minutes ? Number(minutes) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.video) {
        setError(data?.error ?? "Auto Play 를 시작하지 못했습니다.");
        return;
      }
      onStarted(data as StartedAutoPlay);
    } catch {
      setError("Auto Play 를 시작하지 못했습니다. 연결을 확인해 주세요.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={start}>

      <div className="grid two">
        <div className="card">
          <div className="section-title">
            <h2>재생 설정</h2>
            <span className="tag blue">{childName}</span>
          </div>

          <div className="grid equal2" style={{ gap: 12 }}>
            <label className="field">
              <span>Channel</span>
              <select name="channelId" defaultValue="">
                <option value="">전체 Channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} ({channel.count}편)
                  </option>
                ))}
              </select>
            </label>

            <div className="field">
              <span>Level 범위</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select name="minLevel" defaultValue={minLevel} aria-label="최소 Level">
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>
                <span className="muted">~</span>
                <select name="maxLevel" defaultValue={maxLevel} aria-label="최대 Level">
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="muted small" style={{ marginBottom: 8 }}>
              재생 순서
            </div>
            <div className="browse-tabs">
              <button
                type="button"
                className={playMode === PLAY_MODE.SEQUENTIAL ? "active" : ""}
                onClick={() => setPlayMode(PLAY_MODE.SEQUENTIAL)}
              >
                순차
              </button>
              <button
                type="button"
                className={playMode === PLAY_MODE.RANDOM ? "active" : ""}
                onClick={() => setPlayMode(PLAY_MODE.RANDOM)}
              >
                랜덤
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="muted small" style={{ marginBottom: 8 }}>
              이미 본 영상
            </div>
            <div className="browse-tabs">
              <button
                type="button"
                className={replay === "true" ? "active" : ""}
                onClick={() => setReplay("true")}
              >
                다시 포함
              </button>
              <button
                type="button"
                className={replay === "false" ? "active" : ""}
                onClick={() => setReplay("false")}
              >
                미시청만
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="muted small" style={{ marginBottom: 8 }}>
              재생 시간
            </div>
            <div className="browse-tabs">
              {DURATIONS.map((duration) => (
                <button
                  type="button"
                  key={duration.label}
                  className={minutes === duration.value ? "active" : ""}
                  onClick={() => setMinutes(duration.value)}
                >
                  {duration.label}
                </button>
              ))}
            </div>
          </div>

          <div className="note" style={{ marginTop: 18 }}>
            브라우저 정책상 첫 재생은 직접 시작 버튼을 눌러야 합니다. 한 번 시작하면 같은
            세션에서 다음 영상으로 자동 전환됩니다.
          </div>

          <button
            type="submit"
            className="btn primary block big"
            style={{ marginTop: 16 }}
            disabled={pending || catalogSize === 0}
          >
            {pending ? "준비 중..." : "▶ Auto Play 시작"}
          </button>

          {error ? <div className="alert error">{error}</div> : null}
        </div>

        <div className="card">
          <div className="section-title">
            <h2>이렇게 재생돼요</h2>
          </div>
          <ul className="muted small" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li>선택한 Channel과 Level 범위 안에서만 재생합니다.</li>
            <li>영상이 끝나면 다음 영상으로 자동 전환합니다.</li>
            <li>재생 시간이 끝나면 자동으로 멈춥니다.</li>
            <li>Auto Play로 본 영상도 진행률과 시청 기록에 그대로 남습니다.</li>
          </ul>
          <div className="muted small" style={{ marginTop: 14 }}>
            {childName}이(가) 볼 수 있는 영상: {catalogSize}편
          </div>
        </div>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { startAutoPlayAction } from "@/app/actions/autoplay";
import { emptyActionState } from "@/lib/action-state";
import { LEVELS, PLAY_MODE } from "@/lib/constants";

const DURATIONS: { label: string; value: string }[] = [
  { label: "15분", value: "15" },
  { label: "30분", value: "30" },
  { label: "60분", value: "60" },
  { label: "제한 없음", value: "" },
];

export function AutoPlaySetup({
  childId,
  childName,
  channels,
  minLevel,
  maxLevel,
  catalogSize,
}: {
  childId: number;
  childName: string;
  channels: { id: number; name: string; count: number }[];
  minLevel: number;
  maxLevel: number;
  catalogSize: number;
}) {
  const [state, formAction, pending] = useActionState(
    startAutoPlayAction,
    emptyActionState,
  );
  const [playMode, setPlayMode] = useState<string>(PLAY_MODE.SEQUENTIAL);
  const [replay, setReplay] = useState("true");
  const [minutes, setMinutes] = useState("30");

  return (
    <form action={formAction}>
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="playMode" value={playMode} />
      <input type="hidden" name="replayCompleted" value={replay} />
      <input type="hidden" name="maxMinutes" value={minutes} />

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

          {state.error ? <div className="alert error">{state.error}</div> : null}
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

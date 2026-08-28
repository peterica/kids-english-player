"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PROGRESS_SAVE_INTERVAL_SECONDS,
  PROGRESS_STATUS,
  type ProgressStatus,
} from "@/lib/constants";
import { formatClock } from "@/lib/format";
import {
  PLAYER_STATE,
  loadYouTubeIframeApi,
  type YTPlayer,
} from "@/lib/youtube-iframe";
import { ProgressBar } from "@/components/ProgressBar";

type Props = {
  videoId: number;
  youtubeVideoId: string;
  initialPositionSeconds: number;
  initialPercent: number;
  initialStatus: ProgressStatus;
  completionThreshold: number;
  nextVideo: { id: number; title: string } | null;
};

export function WatchPlayer({
  videoId,
  youtubeVideoId,
  initialPositionSeconds,
  initialPercent,
  initialStatus,
  completionThreshold,
  nextVideo,
}: Props) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const sessionRequestedRef = useRef(false);
  const playingSinceRef = useRef<number | null>(null);
  const pendingWatchMsRef = useRef(0);
  const sinceLastSaveMsRef = useRef(0);

  const [position, setPosition] = useState(initialPositionSeconds);
  const [duration, setDuration] = useState(0);
  const [percent, setPercent] = useState(initialPercent);
  const [status, setStatus] = useState<ProgressStatus>(initialStatus);
  const [justCompleted, setJustCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** PLAYING 상태로 실제 흐른 시간만 확정한다. seek 는 시청 시간에 반영되지 않는다. */
  const settlePlayingTime = useCallback(() => {
    if (playingSinceRef.current === null) return;
    const elapsed = Date.now() - playingSinceRef.current;
    playingSinceRef.current = Date.now();
    pendingWatchMsRef.current += elapsed;
    sinceLastSaveMsRef.current += elapsed;
  }, []);

  const sendProgress = useCallback(
    async (options?: { ended?: boolean; useBeacon?: boolean }) => {
      const player = playerRef.current;
      if (!player) return;

      const currentTime = safeCall(() => player.getCurrentTime(), 0);
      const totalTime = safeCall(() => player.getDuration(), 0);
      const watchDeltaSeconds = pendingWatchMsRef.current / 1000;
      pendingWatchMsRef.current = 0;
      sinceLastSaveMsRef.current = 0;

      // 재생하지 않고 페이지만 열었다 나간 경우에는 기록을 만들지 않는다.
      // (0% IN_PROGRESS 기록이 생겨 학습 기록과 다음 영상 선택을 오염시키는 것을 막는다)
      if (watchDeltaSeconds <= 0 && options?.ended !== true) return;

      const payload = {
        videoId,
        sessionId: sessionIdRef.current,
        positionSeconds: Math.max(0, currentTime),
        durationSeconds: Math.max(0, totalTime),
        watchDeltaSeconds,
        ended: options?.ended === true,
      };

      if (options?.useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/progress",
          new Blob([JSON.stringify(payload)], { type: "application/json" }),
        );
        return;
      }

      try {
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        if (!response.ok) throw new Error("save failed");
        const result = (await response.json()) as {
          status: ProgressStatus;
          progressPercent: number;
          completed: boolean;
        };
        setStatus(result.status);
        setPercent(result.progressPercent);
        if (result.completed) setJustCompleted(true);
        setError(null);
      } catch {
        setError("시청 기록을 저장하지 못했습니다. 연결을 확인해 주세요.");
      }
    },
    [videoId],
  );

  const ensureSession = useCallback(async () => {
    if (sessionRequestedRef.current) return;
    sessionRequestedRef.current = true;
    try {
      const player = playerRef.current;
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          positionSeconds: safeCall(() => player?.getCurrentTime() ?? 0, 0),
        }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { sessionId: number };
      sessionIdRef.current = data.sessionId;
    } catch {
      // 세션 기록 실패는 재생을 막지 않는다. 진행률은 계속 저장된다.
    }
  }, [videoId]);

  useEffect(() => {
    let disposed = false;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (disposed || !mountRef.current) return;
        playerRef.current = new YT.Player(mountRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            start: Math.max(0, Math.floor(initialPositionSeconds)),
          },
          events: {
            onReady: (event) => {
              setDuration(safeCall(() => event.target.getDuration(), 0));
            },
            onStateChange: (event) => {
              if (event.data === PLAYER_STATE.PLAYING) {
                playingSinceRef.current = Date.now();
                void ensureSession();
                setDuration(safeCall(() => event.target.getDuration(), 0));
                return;
              }

              settlePlayingTime();
              playingSinceRef.current = null;

              if (event.data === PLAYER_STATE.ENDED) {
                void sendProgress({ ended: true });
              } else if (event.data === PLAYER_STATE.PAUSED) {
                void sendProgress();
              }
            },
            onError: () => {
              setError(
                "영상을 재생할 수 없습니다. 삭제되었거나 외부 재생이 제한된 영상일 수 있어요.",
              );
            },
          },
        });
      })
      .catch(() => {
        setError("YouTube 플레이어를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
      });

    return () => {
      disposed = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [youtubeVideoId, initialPositionSeconds, ensureSession, sendProgress, settlePlayingTime]);

  // 1초마다 화면을 갱신하고, 저장 주기가 되면 진행 상태를 서버에 보낸다.
  useEffect(() => {
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      const currentTime = safeCall(() => player.getCurrentTime(), 0);
      const totalTime = safeCall(() => player.getDuration(), 0);
      setPosition(currentTime);
      if (totalTime > 0) setDuration(totalTime);

      if (playingSinceRef.current !== null) {
        settlePlayingTime();
        if (totalTime > 0) {
          setPercent((prev) => {
            const live = Math.floor((currentTime / totalTime) * 100);
            return status === PROGRESS_STATUS.COMPLETED ? Math.max(prev, live) : live;
          });
        }
      }

      if (sinceLastSaveMsRef.current >= PROGRESS_SAVE_INTERVAL_SECONDS * 1000) {
        void sendProgress();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sendProgress, settlePlayingTime, status]);

  // 탭을 닫거나 숨길 때 마지막 상태를 저장한다.
  useEffect(() => {
    const flush = () => {
      settlePlayingTime();
      void sendProgress({ useBeacon: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sendProgress, settlePlayingTime]);

  const restart = () => {
    const player = playerRef.current;
    if (!player) return;
    settlePlayingTime();
    player.seekTo(0, true);
    player.playVideo();
  };

  const goNext = async () => {
    settlePlayingTime();
    await sendProgress();
    if (nextVideo) router.push(`/watch/${nextVideo.id}`);
    else router.push("/");
  };

  const completed = status === PROGRESS_STATUS.COMPLETED;

  return (
    <div className="grid two">
      <section className="card">
        <div className="video-frame">
          <div ref={mountRef} />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong style={{ fontSize: 18 }}>
              {formatClock(position)} / {duration > 0 ? formatClock(duration) : "--:--"}
            </strong>
            <div className="hint">시청 상태는 자동으로 저장됩니다.</div>
          </div>
          <button type="button" className="btn ghost" onClick={restart}>
            처음부터 보기
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
      </section>

      <section className="card">
        <span className="eyebrow">Learning progress</span>
        <div className="metric">{percent}%</div>
        <ProgressBar percent={percent} />
        <div className="hint">
          {completed
            ? "이 영상은 완료했어요. 다시 봐도 완료 상태는 유지돼요."
            : `${completionThreshold}% 이상 시청하면 완료 처리됩니다.`}
        </div>

        {justCompleted ? (
          <div className="alert ok">잘 봤어요! 영상을 끝까지 완료했어요 🎉</div>
        ) : null}

        <div style={{ height: 1, background: "var(--line)", margin: "24px 0" }} />

        <h3 style={{ marginTop: 0 }}>다음 영상</h3>
        <p style={{ color: "var(--muted)" }}>
          {nextVideo ? nextVideo.title : "다음에 볼 영상이 없어요."}
        </p>
        <button type="button" className="btn" style={{ width: "100%" }} onClick={goNext}>
          {nextVideo ? "다음 영상 보기" : "홈으로 가기"}
        </button>
        <Link
          href="/"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => {
            settlePlayingTime();
            void sendProgress({ useBeacon: true });
          }}
        >
          홈으로
        </Link>
      </section>
    </div>
  );
}

function safeCall<T>(fn: () => T, fallback: T): T {
  try {
    const value = fn();
    return typeof value === "number" && !Number.isFinite(value) ? fallback : value;
  } catch {
    return fallback;
  }
}

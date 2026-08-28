"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PROGRESS_SAVE_INTERVAL_SECONDS,
  PROGRESS_STATUS,
  type ProgressStatus,
} from "@/lib/constants";
import { safeCall, type YTPlayer } from "@/lib/youtube-iframe";

export type ProgressReport = {
  status: ProgressStatus;
  progressPercent: number;
  completed: boolean;
};

/**
 * Player 재생 상태를 추적하고 진행률을 서버에 저장하는 공통 훅.
 *
 * - PLAYING 상태로 실제 흐른 시간만 watchDelta 로 보낸다(seek 로 부풀지 않음)
 * - 10초 주기 + 일시정지/종료/이탈 시 저장
 */
export function useYouTubeProgress(options: {
  childId: number;
  videoId: number;
  onCompleted?: () => void;
  onEnded?: () => void;
}) {
  const { childId, videoId, onCompleted, onEnded } = options;

  const playerRef = useRef<YTPlayer | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const sessionRequestedRef = useRef(false);
  const playingSinceRef = useRef<number | null>(null);
  const pendingWatchMsRef = useRef(0);
  const sinceLastSaveMsRef = useRef(0);
  const videoIdRef = useRef(videoId);

  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState<ProgressStatus>(PROGRESS_STATUS.NOT_STARTED);
  const [error, setError] = useState<string | null>(null);

  /**
   * Auto Play 처럼 같은 플레이어에서 다음 영상으로 넘어갈 때 호출한다.
   * 세션과 누적 시간을 새 영상 기준으로 초기화한다.
   */
  const prepareForVideo = useCallback((nextVideoId: number) => {
    videoIdRef.current = nextVideoId;
    sessionIdRef.current = null;
    sessionRequestedRef.current = false;
    pendingWatchMsRef.current = 0;
    sinceLastSaveMsRef.current = 0;
    playingSinceRef.current = null;
    setPercent(0);
    setPosition(0);
    setStatus(PROGRESS_STATUS.NOT_STARTED);
  }, []);

  const settlePlayingTime = useCallback(() => {
    if (playingSinceRef.current === null) return;
    const elapsed = Date.now() - playingSinceRef.current;
    playingSinceRef.current = Date.now();
    pendingWatchMsRef.current += elapsed;
    sinceLastSaveMsRef.current += elapsed;
  }, []);

  const sendProgress = useCallback(
    async (opts?: { ended?: boolean; useBeacon?: boolean }) => {
      const player = playerRef.current;
      if (!player) return;

      const currentTime = safeCall(() => player.getCurrentTime(), 0);
      const totalTime = safeCall(() => player.getDuration(), 0);
      const watchDeltaSeconds = pendingWatchMsRef.current / 1000;
      pendingWatchMsRef.current = 0;
      sinceLastSaveMsRef.current = 0;

      // 재생하지 않고 화면만 열었다 나간 경우에는 저장하지 않는다.
      if (watchDeltaSeconds <= 0 && opts?.ended !== true) return;

      const payload = {
        childId,
        videoId: videoIdRef.current,
        sessionId: sessionIdRef.current,
        positionSeconds: Math.max(0, currentTime),
        durationSeconds: Math.max(0, totalTime),
        watchDeltaSeconds,
        ended: opts?.ended === true,
      };

      if (opts?.useBeacon && navigator.sendBeacon) {
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
        const result = (await response.json()) as ProgressReport;
        setStatus(result.status);
        setPercent(result.progressPercent);
        if (result.completed) onCompleted?.();
        setError(null);
      } catch {
        setError("시청 기록을 저장하지 못했습니다. 연결을 확인해 주세요.");
      }
    },
    [childId, onCompleted],
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
          childId,
          videoId: videoIdRef.current,
          positionSeconds: safeCall(() => player?.getCurrentTime() ?? 0, 0),
        }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { sessionId: number };
      sessionIdRef.current = data.sessionId;
    } catch {
      // 세션 기록 실패가 재생을 막지는 않는다.
    }
  }, [childId]);

  const handleStateChange = useCallback(
    (state: number, player: YTPlayer) => {
      playerRef.current = player;
      if (state === 1) {
        playingSinceRef.current = Date.now();
        void ensureSession();
        setDuration(safeCall(() => player.getDuration(), 0));
        return;
      }

      settlePlayingTime();
      playingSinceRef.current = null;

      if (state === 0) {
        void sendProgress({ ended: true }).then(() => onEnded?.());
      } else if (state === 2) {
        void sendProgress();
      }
    },
    [ensureSession, onEnded, sendProgress, settlePlayingTime],
  );

  // 1초마다 화면 갱신, 저장 주기가 되면 서버 저장
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
          const live = Math.floor((currentTime / totalTime) * 100);
          setPercent((prev) =>
            status === PROGRESS_STATUS.COMPLETED ? Math.max(prev, live) : live,
          );
        }
      }

      if (sinceLastSaveMsRef.current >= PROGRESS_SAVE_INTERVAL_SECONDS * 1000) {
        void sendProgress();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sendProgress, settlePlayingTime, status]);

  // 탭을 닫거나 숨길 때 마지막 상태 저장
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

  return {
    playerRef,
    position,
    duration,
    percent,
    status,
    error,
    setError,
    setStatus,
    setPercent,
    setDuration,
    handleStateChange,
    settlePlayingTime,
    sendProgress,
    prepareForVideo,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatClock, formatKoreanDuration } from "@/lib/format";
import { loadYouTubeIframeApi, safeCall } from "@/lib/youtube-iframe";
import { useYouTubeProgress } from "@/components/useYouTubeProgress";
import { ProgressBar } from "@/components/ProgressBar";

type CurrentVideo = {
  id: number;
  youtubeVideoId: string;
  title: string;
  channelName: string;
  level: number;
};

type QueueItem = {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  level: number;
};

type NextResponse = {
  ended: boolean;
  reason?: string;
  videoId: number | null;
  title: string | null;
  youtubeVideoId?: string | null;
  channelName?: string | null;
  level?: number | null;
  remainingSeconds: number | null;
  playedVideoCount: number;
};

export function AutoPlayRunner({
  childId,
  sessionId,
  initialVideo,
  initialRemainingSeconds,
  playedVideoCount,
  queue,
}: {
  childId: number;
  sessionId: number;
  initialVideo: CurrentVideo;
  initialRemainingSeconds: number | null;
  playedVideoCount: number;
  queue: QueueItem[];
}) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState<CurrentVideo>(initialVideo);
  const [remaining, setRemaining] = useState<number | null>(initialRemainingSeconds);
  const [playedCount, setPlayedCount] = useState(playedVideoCount);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 영상 종료 콜백은 hook 보다 먼저 필요하므로 ref 로 연결한다.
  const goNextRef = useRef<() => void>(() => {});

  const progress = useYouTubeProgress({
    childId,
    videoId: current.id,
    onEnded: () => goNextRef.current(),
  });
  const {
    playerRef,
    position,
    duration,
    percent,
    error,
    setError,
    handleStateChange,
    prepareForVideo,
  } = progress;

  const advancingRef = useRef(false);

  const goNext = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      const response = await fetch("/api/autoplay/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await response.json()) as NextResponse;

      if (!response.ok || data.ended || !data.videoId || !data.youtubeVideoId) {
        setFinished(
          data.reason === "NO_CANDIDATE"
            ? "더 재생할 영상이 없어요."
            : "정해진 재생 시간이 끝났어요.",
        );
        return;
      }

      prepareForVideo(data.videoId);
      setCurrent({
        id: data.videoId,
        youtubeVideoId: data.youtubeVideoId,
        title: data.title ?? "",
        channelName: data.channelName ?? "",
        level: data.level ?? 0,
      });
      setRemaining(data.remainingSeconds);
      setPlayedCount(data.playedVideoCount);
    } catch {
      setNotice("다음 영상을 불러오지 못했어요.");
    } finally {
      advancingRef.current = false;
    }
  }, [prepareForVideo, sessionId]);

  useEffect(() => {
    goNextRef.current = () => {
      void goNext();
    };
  }, [goNext]);


  // 플레이어 생성 (최초 1회)
  useEffect(() => {
    let disposed = false;
    loadYouTubeIframeApi()
      .then((YT) => {
        if (disposed || !mountRef.current) return;
        playerRef.current = new YT.Player(mountRef.current, {
          videoId: initialVideo.youtubeVideoId,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: (event) => {
              playerRef.current = event.target;
            },
            onStateChange: (event) => handleStateChange(event.data, event.target),
            onError: () => {
              setError("영상을 재생할 수 없어 다음 영상으로 넘어갈게요.");
              void goNext();
            },
          },
        });
      })
      .catch(() =>
        setError("YouTube 플레이어를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요."),
      );

    return () => {
      disposed = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 현재 영상이 바뀌면 같은 플레이어에서 이어서 재생한다(사용자 제스처 재사용).
  useEffect(() => {
    if (!started) return;
    const player = playerRef.current;
    if (!player) return;
    if (current.youtubeVideoId === initialVideo.youtubeVideoId && playedCount <= 1) return;
    safeCall(() => player.loadVideoById({ videoId: current.youtubeVideoId }), undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.youtubeVideoId, started]);

  // 남은 시간 카운트다운
  const countdownEnabled = remaining !== null && !finished;
  useEffect(() => {
    if (!countdownEnabled) return;
    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value === null) return null;
        if (value <= 1) {
          void goNext();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownEnabled, goNext]);

  const start = () => {
    const player = playerRef.current;
    if (!player) return;
    setStarted(true);
    safeCall(() => player.playVideo(), undefined);
  };

  const stop = async () => {
    try {
      await fetch("/api/autoplay/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } finally {
      router.push(`/kids/${childId}`);
    }
  };

  if (finished) {
    return (
      <div className="card">
        <div className="section-title">
          <h2>Auto Play가 끝났어요</h2>
        </div>
        <p className="muted">
          {finished} 영상 {playedCount}편을 재생했어요.
        </p>
        <div className="top-actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn primary" onClick={stop}>
            아이 Home으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="player-layout">
      <div className="card">
        <div className="player-stage">
          <div ref={mountRef} />
        </div>

        {!started ? (
          <button
            type="button"
            className="btn primary block big"
            style={{ marginTop: 16 }}
            onClick={start}
          >
            ▶ 재생 시작
          </button>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <ProgressBar percent={percent} />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong>{current.title}</strong>
            <div className="muted small">
              {current.channelName} · Level {current.level} · {playedCount}번째 영상 ·{" "}
              {formatClock(position)} / {duration > 0 ? formatClock(duration) : "--:--"}
            </div>
          </div>
          <div className="top-actions">
            <button type="button" className="btn" onClick={() => void goNext()}>
              다음 영상
            </button>
            <button type="button" className="btn danger" onClick={stop}>
              ⏹ Auto Play 종료
            </button>
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert error">{notice}</div> : null}
      </div>

      <div className="card">
        <div className="section-title">
          <h3>재생 예정</h3>
          <span className="status doing">
            {remaining === null ? "제한 없음" : `${formatKoreanDuration(remaining)} 남음`}
          </span>
        </div>
        {queue.length === 0 ? (
          <p className="muted small">조건에 맞는 다음 영상이 준비되면 이어서 재생돼요.</p>
        ) : (
          <div className="mini-list">
            {queue.map((item) => (
              <div className="mini-video" key={item.id}>
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="mini-thumb" src={item.thumbnailUrl} alt="" />
                ) : (
                  <div className="mini-thumb" />
                )}
                <div>
                  <strong className="small">{item.title}</strong>
                  <div className="muted small">Level {item.level} · 자동 재생 예정</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

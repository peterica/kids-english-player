"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PROGRESS_STATUS, type ProgressStatus } from "@/lib/constants";
import { formatClock } from "@/lib/format";
import { loadYouTubeIframeApi, safeCall } from "@/lib/youtube-iframe";
import { useYouTubeProgress } from "./useYouTubeProgress";
import { ProgressBar } from "./ProgressBar";

type NextVideo = { id: number; title: string; thumbnailUrl: string | null };

export function WatchPlayer({
  childId,
  videoId,
  youtubeVideoId,
  initialPositionSeconds,
  initialPercent,
  initialStatus,
  completionThreshold,
  nextVideo,
}: {
  childId: number;
  videoId: number;
  youtubeVideoId: string;
  initialPositionSeconds: number;
  initialPercent: number;
  initialStatus: ProgressStatus;
  completionThreshold: number;
  nextVideo: NextVideo | null;
}) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const progress = useYouTubeProgress({
    childId,
    videoId,
    onCompleted: () => setJustCompleted(true),
  });

  const {
    playerRef,
    position,
    duration,
    percent,
    status,
    error,
    setError,
    setPercent,
    setStatus,
    setDuration,
    handleStateChange,
    settlePlayingTime,
    sendProgress,
  } = progress;

  useEffect(() => {
    setPercent(initialPercent);
    setStatus(initialStatus);
  }, [initialPercent, initialStatus, setPercent, setStatus]);

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
              playerRef.current = event.target;
              setDuration(safeCall(() => event.target.getDuration(), 0));
            },
            onStateChange: (event) => handleStateChange(event.data, event.target),
            onError: () =>
              setError(
                "영상을 재생할 수 없습니다. 삭제되었거나 외부 재생이 제한된 영상일 수 있어요.",
              ),
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
    // 최초 1회만 플레이어를 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeVideoId]);

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
    router.push(
      nextVideo
        ? `/kids/${childId}/watch/${nextVideo.id}`
        : `/kids/${childId}/browse`,
    );
  };

  const completed = status === PROGRESS_STATUS.COMPLETED;

  return (
    <div className="player-layout">
      <div className="card">
        <div className="player-stage">
          <div ref={mountRef} />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong>
              {formatClock(position)} / {duration > 0 ? formatClock(duration) : "--:--"}
            </strong>
            <div className="muted small">진행률과 시청시간은 자동으로 저장됩니다.</div>
          </div>
          <button type="button" className="btn" onClick={restart}>
            처음부터 보기
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <ProgressBar percent={percent} />
          <div className="muted small" style={{ marginTop: 8 }}>
            {completed
              ? "이 영상은 다 봤어요. 다시 봐도 기록은 그대로예요."
              : `${completionThreshold}% 이상 보면 완료로 기록돼요.`}
          </div>
        </div>

        {justCompleted ? <div className="alert ok">잘 봤어요! 끝까지 다 봤어요 🎉</div> : null}
        {error ? <div className="alert error">{error}</div> : null}
      </div>

      <div className="card">
        <div className="section-title">
          <h3>다음에 볼 영상</h3>
        </div>
        {nextVideo ? (
          <div className="mini-list">
            <div className="mini-video">
              {nextVideo.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="mini-thumb" src={nextVideo.thumbnailUrl} alt="" />
              ) : (
                <div className="mini-thumb" />
              )}
              <div>
                <strong className="small">{nextVideo.title}</strong>
                <div className="muted small">이어서 추천</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="muted small">지금은 추천할 다음 영상이 없어요.</p>
        )}

        <button
          type="button"
          className="btn primary block"
          style={{ marginTop: 16 }}
          onClick={goNext}
        >
          {nextVideo ? "다음 영상 보기" : "다른 영상 찾기"}
        </button>
        <Link
          href={`/kids/${childId}`}
          className="btn block"
          style={{ marginTop: 10 }}
          onClick={() => {
            settlePlayingTime();
            void sendProgress({ useBeacon: true });
          }}
        >
          아이 Home
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { AutoPlaySetup } from "./AutoPlaySetup";
import { AutoPlayRunner } from "./AutoPlayRunner";

export type StartedAutoPlay = {
  sessionId: number;
  playedVideoCount: number;
  remainingSeconds: number | null;
  channelName: string | null;
  minLevel: number;
  maxLevel: number;
  playMode: string;
  video: {
    id: number;
    youtubeVideoId: string;
    title: string;
    channelName: string;
    level: number;
  };
  queue: { id: number; title: string; thumbnailUrl: string | null; level: number }[];
};

type ActiveSession = StartedAutoPlay;

/**
 * 설정과 재생 화면을 한 페이지에서 전환한다.
 * 페이지를 이동하지 않아야 "Auto Play 시작" 클릭이 그대로 재생 제스처로 이어진다.
 */
export function AutoPlayShell({
  childId,
  childName,
  channels,
  minLevel,
  maxLevel,
  catalogSize,
  activeSession,
}: {
  childId: number;
  childName: string;
  channels: { id: number; name: string; count: number }[];
  minLevel: number;
  maxLevel: number;
  catalogSize: number;
  /** 새로고침 등으로 이미 진행 중인 세션이 있으면 서버가 넘겨준다. */
  activeSession: ActiveSession | null;
}) {
  const [started, setStarted] = useState<StartedAutoPlay | null>(null);
  const running = started ?? activeSession;

  if (running) {
    const config = `${running.channelName ?? "모든 Channel"} · Level ${running.minLevel}–${running.maxLevel} · ${
      running.playMode === "RANDOM" ? "랜덤" : "순차"
    } 재생`;

    return (
      <>
        <div className="topbar">
          <div>
            <h1>Auto Play 재생 중</h1>
            <p>{config}</p>
          </div>
          <Link href={`/kids/${childId}`} className="btn">
            아이 Home
          </Link>
        </div>

        <AutoPlayRunner
          childId={childId}
          sessionId={running.sessionId}
          initialVideo={running.video}
          initialRemainingSeconds={running.remainingSeconds}
          playedVideoCount={running.playedVideoCount}
          queue={running.queue}
          autoStart={started !== null}
        />
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Auto Play</h1>
          <p>선택한 Channel과 Level의 영상을 일정 시간 계속 재생합니다.</p>
        </div>
        <Link href={`/kids/${childId}`} className="btn">
          아이 Home
        </Link>
      </div>

      <AutoPlaySetup
        childId={childId}
        childName={childName}
        channels={channels}
        minLevel={minLevel}
        maxLevel={maxLevel}
        catalogSize={catalogSize}
        onStarted={setStarted}
      />
    </>
  );
}

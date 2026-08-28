/** YouTube IFrame Player API 중 이 앱이 쓰는 최소 타입만 선언한다. */
export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};

export type YTPlayerEvent = { target: YTPlayer; data: number };

type YTNamespace = {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: YTPlayerEvent) => void;
        onStateChange?: (event: YTPlayerEvent) => void;
        onError?: (event: YTPlayerEvent) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

let loader: Promise<YTNamespace> | null = null;

/** IFrame API 스크립트를 한 번만 로드한다. */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("browser only"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loader) return loader;

  loader = new Promise<YTNamespace>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("YouTube Player를 불러오지 못했습니다.")),
      15000,
    );

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube Player를 불러오지 못했습니다."));
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("YouTube Player를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return loader;
}

export function safeCall<T>(fn: () => T, fallback: T): T {
  try {
    const value = fn();
    return typeof value === "number" && !Number.isFinite(value) ? fallback : value;
  } catch {
    return fallback;
  }
}

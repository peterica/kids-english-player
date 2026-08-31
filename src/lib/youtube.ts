const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/**
 * 다양한 YouTube 주소에서 videoId 를 추출한다.
 * watch?v= / youtu.be / shorts / embed / live / videoId 직접 입력 지원.
 */
export function parseYouTubeVideoId(input: string): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  if (VIDEO_ID_PATTERN.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const allowed =
    host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be";
  if (!allowed) return null;

  if (host === "youtu.be") return pickId(url.pathname.split("/")[1]);

  const [, first, second] = url.pathname.split("/");
  if (first === "watch") return pickId(url.searchParams.get("v"));
  if (["shorts", "embed", "live", "v"].includes(first ?? "")) return pickId(second);
  return pickId(url.searchParams.get("v"));
}

function pickId(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

export function buildYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** API Key 없이 쓸 수 있는 정형 썸네일 URL */
export function buildThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export type YouTubeMetadata = { title: string | null; author: string | null };

/**
 * oEmbed 로 제목과 업로더를 조회한다. API Key 가 필요 없다.
 * 실패하면 null 값을 돌려주고 호출부에서 직접 입력값이나 기본값을 쓰게 한다.
 */
export async function fetchYouTubeMetadata(
  videoId: string,
): Promise<YouTubeMetadata> {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      buildYouTubeWatchUrl(videoId),
    )}&format=json`;
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return { title: null, author: null };
    const data = (await response.json()) as {
      title?: unknown;
      author_name?: unknown;
    };
    const text = (value: unknown) =>
      typeof value === "string" && value.trim() ? value.trim() : null;
    return { title: text(data.title), author: text(data.author_name) };
  } catch {
    return { title: null, author: null };
  }
}

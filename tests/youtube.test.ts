import { describe, expect, it } from "vitest";
import {
  buildThumbnailUrl,
  buildYouTubeWatchUrl,
  parseYouTubeVideoId,
} from "@/lib/youtube";

describe("parseYouTubeVideoId", () => {
  it("watch URL 에서 videoId 를 추출한다", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=30s"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("youtu.be 단축 URL 을 지원한다", () => {
    expect(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ");
  });

  it("shorts / embed / live URL 을 지원한다", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(parseYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(parseYouTubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("m. / nocookie / 스킴 없는 주소도 처리한다", () => {
    expect(parseYouTubeVideoId("m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(
      parseYouTubeVideoId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("videoId 를 직접 입력해도 인식한다", () => {
    expect(parseYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("잘못된 입력은 null 을 반환한다", () => {
    expect(parseYouTubeVideoId("")).toBeNull();
    expect(parseYouTubeVideoId("https://vimeo.com/12345")).toBeNull();
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseYouTubeVideoId("not a url")).toBeNull();
  });
});

describe("URL builders", () => {
  it("정규 watch URL 과 썸네일 URL 을 만든다", () => {
    expect(buildYouTubeWatchUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(buildThumbnailUrl("dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });
});

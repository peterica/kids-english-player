import { describe, expect, it } from "vitest";
import { slugify, validateChannelName } from "@/lib/admin/channels";
import {
  parseCanonicalYouTubeUrl,
  validateCategory,
  validateLevel,
  validateRequiredText,
} from "@/lib/admin/videos";
import { hasParentCapability, isAdminRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import {
  validateDescription,
  validateErrorType,
} from "@/lib/correction-requests";
import {
  CORRECTION_ERROR_LABEL,
  CORRECTION_STATUS_LABEL,
  canImport,
  correctionStatusClass,
  defaultSelectedRows,
  importStatusLabel,
  importSummaryText,
} from "@/lib/admin/view-model";
import { validateMarkdownImport } from "@/lib/admin/markdown-import";

describe("slugify", () => {
  it("설계 문서 예시대로 slug 를 만든다", () => {
    expect(slugify("Caillou")).toBe("caillou");
    expect(slugify("Thomas & Friends")).toBe("thomas-and-friends");
    expect(slugify("Super Why!")).toBe("super-why");
    expect(slugify("  Blue's Clues & You!  ")).toBe("blue-s-clues-and-you");
  });

  it("이름이 비었거나 slug 를 만들 수 없으면 거부한다", () => {
    expect(() => validateChannelName("")).toThrow(AppError);
    expect(() => validateChannelName("   ")).toThrow(AppError);
    expect(() => validateChannelName("!!!")).toThrow(AppError);
  });
});

describe("Video 값 검증", () => {
  it("표준 watch URL 만 허용하고 Video ID 를 뽑는다", () => {
    expect(parseCanonicalYouTubeUrl("https://www.youtube.com/watch?v=abcdefghijk")).toBe(
      "abcdefghijk",
    );
    for (const bad of [
      "https://youtu.be/abcdefghijk",
      "https://www.youtube.com/watch?v=short",
      "https://www.youtube.com/watch?v=abcdefghijk&t=30",
      "http://www.youtube.com/watch?v=abcdefghijk",
      "",
    ]) {
      expect(() => parseCanonicalYouTubeUrl(bad)).toThrow(AppError);
    }
  });

  it("Level 은 1~5 정수만 허용한다", () => {
    expect(validateLevel(3)).toBe(3);
    expect(validateLevel("5")).toBe(5);
    for (const bad of [0, 6, 2.5, "abc", null]) {
      expect(() => validateLevel(bad)).toThrow(AppError);
    }
  });

  it("Category 는 allowlist 만 허용한다", () => {
    expect(validateCategory("STORY")).toBe("STORY");
    expect(() => validateCategory("MATH")).toThrow(AppError);
  });

  it("필수 텍스트는 trim 후 빈 값을 거부한다", () => {
    expect(validateRequiredText("  제목  ", "제목")).toBe("제목");
    expect(() => validateRequiredText("   ", "제목")).toThrow(AppError);
    expect(() => validateRequiredText("a".repeat(201), "제목")).toThrow(AppError);
  });
});

describe("role capability", () => {
  it("ADMIN 만 운영자 기능을 가진다", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("OWNER")).toBe(false);
    expect(isAdminRole("PARENT")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it("OWNER / PARENT / ADMIN 모두 Parent 기능을 가진다", () => {
    expect(hasParentCapability("OWNER")).toBe(true);
    expect(hasParentCapability("PARENT")).toBe(true);
    expect(hasParentCapability("ADMIN")).toBe(true);
    expect(hasParentCapability("GUEST")).toBe(false);
  });
});

describe("Correction Request 값 검증", () => {
  it("정의된 오류 종류만 허용한다", () => {
    expect(validateErrorType("WRONG_LEVEL")).toBe("WRONG_LEVEL");
    expect(() => validateErrorType("SOMETHING")).toThrow(AppError);
  });

  it("설명은 비어 있으면 안 되고 길이 제한이 있다", () => {
    expect(validateDescription("  재생이 안 돼요  ")).toBe("재생이 안 돼요");
    expect(() => validateDescription("")).toThrow(AppError);
    expect(() => validateDescription("a".repeat(501))).toThrow(AppError);
  });
});

describe("Admin 화면 표시 로직", () => {
  const preview = validateMarkdownImport(
    `| Level | Title | Category | Publisher | YouTube URL |
|---|---|---|---|---|
| 3 | A | STORY | PBS | https://www.youtube.com/watch?v=aaaaaaaaaaa |
| 9 | B | STORY | PBS | https://www.youtube.com/watch?v=bbbbbbbbbbb |
| 3 | C | STORY | PBS | https://www.youtube.com/watch?v=aaaaaaaaaaa |`,
  );

  it("행 상태 배지와 요약 문구를 만든다", () => {
    expect(importStatusLabel("VALID").text).toBe("등록 가능");
    expect(importStatusLabel("DUPLICATE").text).toBe("중복");
    expect(importStatusLabel("INVALID").text).toBe("오류");
    expect(importSummaryText(preview)).toBe("등록 가능 1건 · 중복 1건 · 오류 1건");
  });

  it("기본 선택은 VALID 행이고, 선택이 없으면 등록할 수 없다", () => {
    expect(defaultSelectedRows(preview)).toEqual([1]);
    expect(canImport(preview, [1])).toBe(true);
    expect(canImport(preview, [2, 3])).toBe(false);
    expect(canImport(preview, [])).toBe(false);
    expect(canImport({ ...preview, errors: ["헤더 오류"] }, [1])).toBe(false);
  });

  it("수정 요청 상태/오류 종류 라벨이 있다", () => {
    expect(CORRECTION_STATUS_LABEL.OPEN).toBe("접수됨");
    expect(CORRECTION_STATUS_LABEL.RESOLVED).toBe("처리 완료");
    expect(CORRECTION_ERROR_LABEL.PLAYBACK_UNAVAILABLE).toBe("재생 불가");
    expect(correctionStatusClass("OPEN")).toContain("doing");
    expect(correctionStatusClass("RESOLVED")).toContain("done");
  });
});

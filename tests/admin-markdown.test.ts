import { describe, expect, it } from "vitest";
import {
  parseMarkdownTable,
  validateMarkdownImport,
} from "@/lib/admin/markdown-import";

const HEADER = `| # | Level | Title | Category | Publisher | YouTube URL |
|---:|---:|---|---|---|---|`;

const row = (
  n: number,
  level: string,
  title: string,
  category: string,
  publisher: string,
  id: string,
) =>
  `| ${n} | ${level} | ${title} | ${category} | ${publisher} | https://www.youtube.com/watch?v=${id} |`;

const doc = (...rows: string[]) => `# Sample\n\n${HEADER}\n${rows.join("\n")}\n`;

describe("parseMarkdownTable", () => {
  it("헤더와 데이터 행을 분리한다", () => {
    const table = parseMarkdownTable(doc(row(1, "3", "A", "STORY", "PBS", "aaaaaaaaaaa")));
    expect(table?.headers).toEqual([
      "#",
      "Level",
      "Title",
      "Category",
      "Publisher",
      "YouTube URL",
    ]);
    expect(table?.rows).toHaveLength(1);
  });

  it("표가 없으면 null", () => {
    expect(parseMarkdownTable("표가 없는 문서")).toBeNull();
  });
});

describe("validateMarkdownImport", () => {
  it("정상 행은 VALID 로 분류한다", () => {
    const preview = validateMarkdownImport(
      doc(
        row(1, "3", "Caillou Goes to School", "SCHOOL", "Caillou - WildBrain", "aaaaaaaaaaa"),
        row(2, "5", "Bluey Movies", "STORY", "Bluey - Official Channel", "bbbbbbbbbbb"),
      ),
    );
    expect(preview.validCount).toBe(2);
    expect(preview.duplicateCount).toBe(0);
    expect(preview.invalidCount).toBe(0);
    expect(preview.rows[0]).toMatchObject({
      row: 1,
      level: 3,
      category: "SCHOOL",
      youtubeVideoId: "aaaaaaaaaaa",
      status: "VALID",
    });
  });

  it("필수 헤더가 없으면 행을 만들지 않고 오류를 돌려준다", () => {
    const preview = validateMarkdownImport(
      `| # | Level | Title | YouTube URL |\n|---|---|---|---|\n| 1 | 3 | A | https://www.youtube.com/watch?v=aaaaaaaaaaa |`,
    );
    expect(preview.rows).toHaveLength(0);
    expect(preview.errors[0]).toContain("Category");
    expect(preview.errors[0]).toContain("Publisher");
  });

  it("컬럼 순서가 달라도 헤더 이름으로 매핑한다", () => {
    const preview = validateMarkdownImport(
      `| Title | YouTube URL | Publisher | Category | Level |\n|---|---|---|---|---|\n| A | https://www.youtube.com/watch?v=aaaaaaaaaaa | PBS | STORY | 4 |`,
    );
    expect(preview.validCount).toBe(1);
    expect(preview.rows[0].level).toBe(4);
    expect(preview.rows[0].publisher).toBe("PBS");
  });

  it("Level / Category / 빈 값 / URL 오류를 행 단위로 표시한다", () => {
    const preview = validateMarkdownImport(
      doc(
        row(1, "9", "A", "STORY", "PBS", "aaaaaaaaaaa"),
        row(2, "3", "B", "MATH", "PBS", "bbbbbbbbbbb"),
        row(3, "3", "", "STORY", "PBS", "ccccccccccc"),
        row(4, "3", "D", "STORY", "", "ddddddddddd"),
        `| 5 | 3 | E | STORY | PBS | https://youtu.be/eeeeeeeeeee |`,
      ),
    );
    expect(preview.invalidCount).toBe(5);
    expect(preview.rows[0].errors[0]).toContain("Level");
    expect(preview.rows[1].errors[0]).toContain("Category");
    expect(preview.rows[2].errors[0]).toContain("Title");
    expect(preview.rows[3].errors[0]).toContain("Publisher");
    expect(preview.rows[4].errors[0]).toContain("YouTube URL");
  });

  it("batch 내부 Video ID 중복을 잡는다", () => {
    const preview = validateMarkdownImport(
      doc(
        row(1, "3", "A", "STORY", "PBS", "aaaaaaaaaaa"),
        row(2, "3", "A 복사본", "STORY", "PBS", "aaaaaaaaaaa"),
      ),
    );
    expect(preview.validCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.rows[1].status).toBe("DUPLICATE");
    expect(preview.rows[1].errors[0]).toContain("1행");
  });

  it("기존 Library 의 Video ID 중복을 잡는다", () => {
    const preview = validateMarkdownImport(
      doc(row(1, "3", "A", "STORY", "PBS", "aaaaaaaaaaa")),
      ["aaaaaaaaaaa"],
    );
    expect(preview.duplicateCount).toBe(1);
    expect(preview.rows[0].errors[0]).toContain("이미 Content Library");
  });

  it("BOM / CRLF 가 있어도 같은 결과를 낸다", () => {
    const plain = doc(row(1, "3", "A", "STORY", "PBS", "aaaaaaaaaaa"));
    const messy = `﻿${plain.replace(/\n/g, "\r\n")}`;
    expect(validateMarkdownImport(messy)).toEqual(validateMarkdownImport(plain));
  });

  it("행 번호는 표의 데이터 순서를 따른다", () => {
    const preview = validateMarkdownImport(
      doc(
        row(1, "3", "A", "STORY", "PBS", "aaaaaaaaaaa"),
        row(2, "9", "B", "STORY", "PBS", "bbbbbbbbbbb"),
        row(3, "3", "C", "STORY", "PBS", "ccccccccccc"),
      ),
    );
    expect(preview.rows.map((r) => r.row)).toEqual([1, 2, 3]);
    expect(preview.rows.map((r) => r.status)).toEqual(["VALID", "INVALID", "VALID"]);
  });
});

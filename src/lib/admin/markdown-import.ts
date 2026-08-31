import { CATEGORIES, MAX_LEVEL, MIN_LEVEL } from "../constants";

export const REQUIRED_HEADERS = [
  "Level",
  "Title",
  "Category",
  "Publisher",
  "YouTube URL",
] as const;

const CANONICAL_WATCH_URL =
  /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/;

export type ImportRowStatus = "VALID" | "DUPLICATE" | "INVALID";

export type ImportRow = {
  /** 안정적인 행 번호(표의 데이터 행 순서, 1부터) */
  row: number;
  level: number | null;
  title: string;
  category: string;
  publisher: string;
  youtubeUrl: string;
  youtubeVideoId: string | null;
  status: ImportRowStatus;
  errors: string[];
};

export type ImportPreview = {
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ImportRow[];
  /** 표 자체를 읽지 못한 경우(헤더 누락 등) */
  errors: string[];
};

/** BOM/CRLF 제거처럼 무해한 정규화만 한다. 값 자체는 고치지 않는다. */
function normalizeText(text: string): string {
  return (text ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const isSeparator = (cells: string[]) =>
  cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s/g, "")));

export type ParsedTable = {
  headers: string[];
  rows: string[][];
};

/** Markdown 문서에서 필수 헤더를 가진 첫 번째 표를 찾는다. */
export function parseMarkdownTable(source: string): ParsedTable | null {
  const lines = normalizeText(source)
    .split("\n")
    .filter((line) => line.trim().startsWith("|"));

  for (let i = 0; i < lines.length - 1; i += 1) {
    const headers = splitRow(lines[i]);
    const next = splitRow(lines[i + 1]);
    if (!isSeparator(next)) continue;

    const rows: string[][] = [];
    for (let j = i + 2; j < lines.length; j += 1) {
      const cells = splitRow(lines[j]);
      if (isSeparator(cells)) continue;
      rows.push(cells);
    }
    return { headers, rows };
  }
  return null;
}

function headerIndex(headers: string[], name: string): number {
  const target = name.toLowerCase().replace(/\s+/g, "");
  return headers.findIndex(
    (header) => header.toLowerCase().replace(/\s+/g, "") === target,
  );
}

/**
 * Markdown 표를 행 단위로 검증한다. 순수 함수이며 DB 를 알지 못한다.
 * 중복 판단의 핵심 키는 youtubeVideoId 다.
 */
export function validateMarkdownImport(
  source: string,
  existingVideoIds: Iterable<string> = [],
): ImportPreview {
  const empty: ImportPreview = {
    validCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
    rows: [],
    errors: [],
  };

  const table = parseMarkdownTable(source);
  if (!table) {
    return { ...empty, errors: ["Markdown 표를 찾지 못했습니다. 헤더 행과 구분선이 필요합니다."] };
  }

  const missing = REQUIRED_HEADERS.filter(
    (header) => headerIndex(table.headers, header) === -1,
  );
  if (missing.length > 0) {
    return {
      ...empty,
      errors: [`필수 컬럼이 없습니다: ${missing.join(", ")}`],
    };
  }

  const index = {
    level: headerIndex(table.headers, "Level"),
    title: headerIndex(table.headers, "Title"),
    category: headerIndex(table.headers, "Category"),
    publisher: headerIndex(table.headers, "Publisher"),
    url: headerIndex(table.headers, "YouTube URL"),
  };

  const existing = new Set(existingVideoIds);
  const seenIds = new Map<string, number>();
  const seenUrls = new Map<string, number>();
  const rows: ImportRow[] = [];

  table.rows.forEach((cells, position) => {
    const cell = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : "");
    const rawLevel = cell(index.level);
    const title = cell(index.title);
    const category = cell(index.category);
    const publisher = cell(index.publisher);
    const youtubeUrl = cell(index.url);

    const errors: string[] = [];

    const levelNumber = Number(rawLevel);
    const level =
      rawLevel !== "" && Number.isInteger(levelNumber) &&
      levelNumber >= MIN_LEVEL && levelNumber <= MAX_LEVEL
        ? levelNumber
        : null;
    if (level === null) {
      errors.push(`Level 은 ${MIN_LEVEL}~${MAX_LEVEL} 사이의 정수여야 합니다. (입력: "${rawLevel}")`);
    }
    if (!title) errors.push("Title 이 비어 있습니다.");
    if (!publisher) errors.push("Publisher 가 비어 있습니다.");
    if (!(CATEGORIES as readonly string[]).includes(category)) {
      errors.push(`Category 가 올바르지 않습니다. (입력: "${category}")`);
    }

    const matched = CANONICAL_WATCH_URL.exec(youtubeUrl);
    const youtubeVideoId = matched ? matched[1] : null;
    if (!youtubeVideoId) {
      errors.push(
        `YouTube URL 은 https://www.youtube.com/watch?v=<11자 ID> 형식이어야 합니다. (입력: "${youtubeUrl}")`,
      );
    }

    const row = position + 1;
    let status: ImportRowStatus = errors.length > 0 ? "INVALID" : "VALID";

    if (status === "VALID" && youtubeVideoId) {
      const duplicateErrors: string[] = [];
      const seenIdRow = seenIds.get(youtubeVideoId);
      const seenUrlRow = seenUrls.get(youtubeUrl);

      if (seenIdRow) {
        duplicateErrors.push(`같은 batch 의 ${seenIdRow}행과 Video ID 가 중복됩니다.`);
      } else if (seenUrlRow) {
        duplicateErrors.push(`같은 batch 의 ${seenUrlRow}행과 URL 이 중복됩니다.`);
      } else if (existing.has(youtubeVideoId)) {
        duplicateErrors.push("이미 Content Library 에 등록된 Video ID 입니다.");
      }

      if (duplicateErrors.length > 0) {
        status = "DUPLICATE";
        errors.push(...duplicateErrors);
      } else {
        seenIds.set(youtubeVideoId, row);
        seenUrls.set(youtubeUrl, row);
      }
    }

    rows.push({
      row,
      level,
      title,
      category,
      publisher,
      youtubeUrl,
      youtubeVideoId,
      status,
      errors,
    });
  });

  return {
    validCount: rows.filter((r) => r.status === "VALID").length,
    duplicateCount: rows.filter((r) => r.status === "DUPLICATE").length,
    invalidCount: rows.filter((r) => r.status === "INVALID").length,
    rows,
    errors: [],
  };
}

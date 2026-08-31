import type { ImportPreview, ImportRow, ImportRowStatus } from "./markdown-import";
import type { CorrectionStatus, CorrectionErrorType } from "../constants";

/** Import Preview 행 상태 표시용 */
export function importStatusLabel(status: ImportRowStatus): {
  text: string;
  className: string;
} {
  if (status === "VALID") return { text: "등록 가능", className: "status done" };
  if (status === "DUPLICATE") return { text: "중복", className: "status doing" };
  return { text: "오류", className: "status off" };
}

export function importSummaryText(preview: ImportPreview): string {
  return `등록 가능 ${preview.validCount}건 · 중복 ${preview.duplicateCount}건 · 오류 ${preview.invalidCount}건`;
}

/** 기본 선택은 등록 가능한 행 전체다. */
export function defaultSelectedRows(preview: ImportPreview): number[] {
  return preview.rows.filter((row) => row.status === "VALID").map((row) => row.row);
}

export function canImport(preview: ImportPreview, selected: number[]): boolean {
  if (preview.errors.length > 0) return false;
  const valid = new Set(defaultSelectedRows(preview));
  return selected.some((row) => valid.has(row));
}

export function rowErrorText(row: ImportRow): string {
  return row.errors.join(" / ");
}

export const CORRECTION_STATUS_LABEL: Record<CorrectionStatus, string> = {
  OPEN: "접수됨",
  RESOLVED: "처리 완료",
  REJECTED: "반려",
};

export const CORRECTION_ERROR_LABEL: Record<CorrectionErrorType, string> = {
  PLAYBACK_UNAVAILABLE: "재생 불가",
  WRONG_LEVEL: "Level 오류",
  WRONG_CATEGORY: "Category 오류",
  TITLE_ERROR: "제목 오류",
  OTHER: "기타",
};

export function correctionStatusClass(status: CorrectionStatus): string {
  if (status === "RESOLVED") return "status done";
  if (status === "REJECTED") return "status off";
  return "status doing";
}

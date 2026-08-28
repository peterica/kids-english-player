import { PROGRESS_STATUS, type ProgressStatus } from "@/lib/constants";

const LABELS: Record<ProgressStatus, { text: string; className: string }> = {
  [PROGRESS_STATUS.COMPLETED]: { text: "완료", className: "done" },
  [PROGRESS_STATUS.IN_PROGRESS]: { text: "진행 중", className: "doing" },
  [PROGRESS_STATUS.NOT_STARTED]: { text: "대기", className: "wait" },
};

export function StatusBadge({
  status,
  enabled = true,
}: {
  status: ProgressStatus;
  enabled?: boolean;
}) {
  if (!enabled) return <span className="status off">비활성</span>;
  const label = LABELS[status];
  return <span className={`status ${label.className}`}>{label.text}</span>;
}

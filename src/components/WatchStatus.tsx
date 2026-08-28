import { PROGRESS_STATUS, type ProgressStatus } from "@/lib/constants";

/** 아이 화면에서 쓰는 시청 상태 배지 (새 영상 / 진행률 / 봤어요) */
export function WatchStatus({
  status,
  percent,
}: {
  status: ProgressStatus;
  percent: number;
}) {
  if (status === PROGRESS_STATUS.COMPLETED) {
    return <span className="status done">봤어요</span>;
  }
  if (status === PROGRESS_STATUS.IN_PROGRESS) {
    return <span className="status doing">{percent}%</span>;
  }
  return <span className="status wait">새 영상</span>;
}

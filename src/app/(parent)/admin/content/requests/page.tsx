import { requirePageAdmin } from "@/lib/guard";
import { listCorrectionRequestsForAdmin } from "@/lib/correction-requests";
import { CORRECTION_ERROR_TYPES, CORRECTION_STATUS } from "@/lib/constants";
import { CorrectionRequestAdmin } from "./CorrectionRequestAdmin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; errorType?: string; videoId?: string }>;

export default async function AdminCorrectionRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePageAdmin();
  const params = await searchParams;

  const requests = await listCorrectionRequestsForAdmin({
    status: params.status || null,
    errorType: params.errorType || null,
    videoId: params.videoId ? Number(params.videoId) : null,
  });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>수정 요청</h1>
          <p>부모가 신고한 영상 오류를 확인하고 처리합니다.</p>
        </div>
        <div className="tag blue">{requests.length}건</div>
      </div>

      <section className="card">
        <form className="filterbar" method="get" style={{ marginBottom: 0 }}>
          <select name="status" defaultValue={params.status ?? ""} aria-label="Status">
            <option value="">상태 전체</option>
            {Object.values(CORRECTION_STATUS).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select name="errorType" defaultValue={params.errorType ?? ""} aria-label="Error Type">
            <option value="">오류 종류 전체</option>
            {CORRECTION_ERROR_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            name="videoId"
            defaultValue={params.videoId ?? ""}
            placeholder="Video ID"
            aria-label="Video"
          />
          <button type="submit" className="btn primary">
            필터
          </button>
        </form>
      </section>

      <CorrectionRequestAdmin requests={requests} />
    </>
  );
}

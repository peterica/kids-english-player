import Link from "next/link";
import { requirePageSession } from "@/lib/guard";
import { listMyCorrectionRequests } from "@/lib/correction-requests";
import {
  CORRECTION_ERROR_LABEL,
  CORRECTION_STATUS_LABEL,
  correctionStatusClass,
} from "@/lib/admin/view-model";

export const dynamic = "force-dynamic";

/** 부모가 자기 수정 요청과 처리 상태를 확인하는 화면 */
export default async function MyCorrectionRequestsPage() {
  const session = await requirePageSession();
  const requests = await listMyCorrectionRequests(session.userId);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>내 수정 요청</h1>
          <p>Content Library 영상에서 신고한 내용과 처리 상태입니다.</p>
        </div>
        <Link href="/library" className="btn">
          Content Library
        </Link>
      </div>

      <section className="card">
        {requests.length === 0 ? (
          <p className="muted small">
            아직 신고한 내용이 없습니다. Content Library 의 영상 카드에서 오류를 신고할 수 있어요.
          </p>
        ) : (
          <div className="list">
            {requests.map((request) => (
              <div className="collection-row" key={request.id}>
                <div className="order">{request.id}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{request.videoTitle ?? `Video ${request.videoId}`}</strong>
                  <div className="muted small">
                    {CORRECTION_ERROR_LABEL[request.errorType]} ·{" "}
                    {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                  </div>
                  <div className="muted small">{request.description}</div>
                </div>
                <span className={correctionStatusClass(request.status)}>
                  {CORRECTION_STATUS_LABEL[request.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

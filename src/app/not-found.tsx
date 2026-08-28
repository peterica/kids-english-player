import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page child">
      <div className="card">
        <h1>영상을 찾을 수 없어요</h1>
        <p className="hint">주소가 바뀌었거나 삭제된 영상일 수 있어요.</p>
        <Link href="/" className="btn" style={{ marginTop: 16 }}>
          홈으로 가기
        </Link>
      </div>
    </main>
  );
}

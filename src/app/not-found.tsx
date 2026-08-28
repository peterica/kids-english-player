import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="card">
        <h1>페이지를 찾을 수 없어요</h1>
        <p className="muted">주소가 바뀌었거나 삭제된 화면일 수 있어요.</p>
        <Link href="/" className="btn primary" style={{ marginTop: 16 }}>
          처음으로
        </Link>
      </div>
    </main>
  );
}

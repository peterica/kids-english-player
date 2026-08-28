"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page child">
      <div className="card">
        <h1>문제가 생겼어요</h1>
        <p className="hint">잠시 후 다시 시도해 주세요.</p>
        <button type="button" className="btn" style={{ marginTop: 16 }} onClick={reset}>
          다시 시도
        </button>
      </div>
    </main>
  );
}

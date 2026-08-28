export function ProgressBar({ percent }: { percent: number }) {
  const width = Math.min(Math.max(percent, 0), 100);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${width}%` }} />
    </div>
  );
}

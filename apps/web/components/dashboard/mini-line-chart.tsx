type MiniLineChartProps = {
  points: number[];
};

export function MiniLineChart({ points }: MiniLineChartProps) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);

  const polyline = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-36 w-full rounded-xl border border-card-border bg-background/60 p-3">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <polyline
          points={polyline}
          fill="none"
          stroke="rgba(37,99,235,0.9)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
  height?: number;
}

export default function Sparkline({
  data,
  className,
  strokeClassName = "stroke-brand-500",
  fillClassName = "fill-brand-500/10",
  height = 32,
}: SparklineProps) {
  if (data.length === 0) return null;

  const width = 100;
  const max = Math.max(...data, 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((value, i) => {
    const x = i * stepX;
    const y = height - (value / max) * (height - 2) - 1;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    `${linePath} L${(points[points.length - 1][0]).toFixed(2)},${height} ` +
    `L0,${height} Z`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={areaPath} className={fillClassName} />
      <path
        d={linePath}
        className={strokeClassName}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

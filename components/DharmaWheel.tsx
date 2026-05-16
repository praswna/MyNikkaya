interface DharmaWheelProps {
  size?: number;
  color?: string;
}

export function DharmaWheel({ size = 34, color = "#FFFBF7" }: DharmaWheelProps) {
  const center = 50;
  const outerRadius = 45;
  const innerRadius = 10;
  const strokeWidth = 5;
  const spokeAngles = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {spokeAngles.map((angle, i) => {
        const x1 = center + innerRadius * Math.cos(angle);
        const y1 = center + innerRadius * Math.sin(angle);
        const x2 = center + outerRadius * Math.cos(angle);
        const y2 = center + outerRadius * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={center} cy={center} r={innerRadius} fill={color} />
    </svg>
  );
}

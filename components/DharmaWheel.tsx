"use client";

import { useEffect, useRef } from "react";

interface DharmaWheelProps {
  size?: number;
  color?: string;
  rotate?: number; // 현재 회전 각도
}

export function DharmaWheel({ size = 34, color = "#FFFBF7", rotate = 0 }: DharmaWheelProps) {
  const center = 50;
  const outerRadius = 45;
  const innerRadius = 10;
  const strokeWidth = 5;
  const spokeAngles = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);
  const prevRotateRef = useRef(rotate);
  const currentRotateRef = useRef(rotate);

  // 누적 회전각 계산 (항상 증가 방향)
  useEffect(() => {
    if (rotate !== prevRotateRef.current) {
      currentRotateRef.current += 45;
      prevRotateRef.current = rotate;
    }
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `rotate(${currentRotateRef.current}deg)`,
        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transformOrigin: "center",
      }}
    >
      <circle
        cx={center} cy={center} r={outerRadius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
      />
      {spokeAngles.map((angle, i) => {
        const x1 = center + innerRadius * Math.cos(angle);
        const y1 = center + innerRadius * Math.sin(angle);
        const x2 = center + outerRadius * Math.cos(angle);
        const y2 = center + outerRadius * Math.sin(angle);
        return (
          <line key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          />
        );
      })}
      <circle cx={center} cy={center} r={innerRadius} fill={color} />
    </svg>
  );
}

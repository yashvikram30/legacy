"use client";

import React from "react";

export interface ChronometerThresholds {
  /** end of the green (safe) zone, in the same unit as `value` */
  green: number;
  /** end of the amber (grace) zone, in the same unit as `value` */
  amber: number;
  /** full-scale value mapped to a complete 360° sweep */
  max: number;
}

export interface ChronometerColors {
  green: string;
  amber: string;
  red: string;
}

export interface RadialChronometerProps {
  /** current position along the scale (e.g. seconds elapsed since last check-in) */
  value: number;
  thresholds: ChronometerThresholds;
  colors?: ChronometerColors;
  /** outer diameter in px */
  size?: number;
  strokeWidth?: number;
  /** center content (status word, countdown, etc.) */
  children?: React.ReactNode;
  className?: string;
}

const DEFAULT_COLORS: ChronometerColors = {
  green: "var(--status-green)",
  amber: "var(--status-amber)",
  red: "var(--status-red)",
};

const TICK_COUNT = 60;

function zoneOf(value: number, t: ChronometerThresholds): keyof ChronometerColors {
  if (value < t.green) return "green";
  if (value < t.amber) return "amber";
  return "red";
}

export function RadialChronometer({
  value,
  thresholds,
  colors = DEFAULT_COLORS,
  size = 220,
  strokeWidth = 12,
  children,
  className,
}: RadialChronometerProps) {
  const max = Math.max(thresholds.max, 1);
  const r = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const clampFrac = (v: number) => Math.max(0, Math.min(1, v / max));
  const greenFrac = clampFrac(thresholds.green);
  const amberFrac = clampFrac(thresholds.amber);
  const valueFrac = clampFrac(value);

  const activeZone = zoneOf(value, thresholds);
  const fillColor = colors[activeZone];

  // Rotate the whole ring so drawing starts at 12 o'clock and sweeps clockwise.
  const ringTransform = `rotate(-90 ${cx} ${cy})`;

  // A zone band spans [from, to] as a fraction of the full circle.
  const band = (from: number, to: number) => ({
    strokeDasharray: `${(to - from) * circumference} ${circumference}`,
    strokeDashoffset: `${-from * circumference}`,
  });

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const frac = i / TICK_COUNT;
    // Emphasize ticks that fall on a zone boundary.
    const isBoundary =
      Math.abs(frac - greenFrac) < 1 / TICK_COUNT / 2 ||
      Math.abs(frac - amberFrac) < 1 / TICK_COUNT / 2 ||
      i === 0;
    const angle = frac * 2 * Math.PI - Math.PI / 2;
    const inner = r - strokeWidth / 2 - (isBoundary ? 8 : 4);
    const outer = r - strokeWidth / 2 - 1;
    return {
      x1: cx + Math.cos(angle) * inner,
      y1: cy + Math.sin(angle) * inner,
      x2: cx + Math.cos(angle) * outer,
      y2: cy + Math.sin(angle) * outer,
      isBoundary,
      key: i,
    };
  });

  return (
    <div
      className={className}
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Liveness chronometer, ${activeZone} zone`}
      >
        {/* base track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border-hairline)"
          strokeWidth={strokeWidth}
        />

        {/* calibrated zone bands (dim) */}
        <g transform={ringTransform} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" opacity={0.28}>
          <circle cx={cx} cy={cy} r={r} stroke={colors.green} {...band(0, greenFrac)} />
          <circle cx={cx} cy={cy} r={r} stroke={colors.amber} {...band(greenFrac, amberFrac)} />
          <circle cx={cx} cy={cy} r={r} stroke={colors.red} {...band(amberFrac, 1)} />
        </g>

        {/* fill arc — fills to the current position, colored by active zone */}
        <g transform={ringTransform}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              strokeDasharray: `${valueFrac * circumference} ${circumference}`,
              transition: "stroke-dasharray var(--dur-5, 500ms) var(--ease-out-quart, ease-out), stroke var(--dur-3, 240ms) ease",
              filter: `drop-shadow(0 0 6px ${fillColor})`,
            }}
          />
        </g>

        {/* tick marks */}
        <g>
          {ticks.map((t) => (
            <line
              key={t.key}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isBoundary ? "var(--text-secondary)" : "var(--border-mid)"}
              strokeWidth={t.isBoundary ? 2 : 1}
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: strokeWidth + 8,
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

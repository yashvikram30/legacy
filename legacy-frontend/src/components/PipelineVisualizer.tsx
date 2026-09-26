"use client";

import React from "react";

export interface PipelineStage {
  key: string;
  label: string;
  hint?: string;
  /** accent color used when this stage is the active/current one */
  color?: string;
}

export interface PipelineVisualizerProps {
  stages: PipelineStage[];
  /** index of the current stage; earlier stages render completed, later ones dimmed */
  currentIndex: number;
  /** color for completed stages and filled connectors */
  completedColor?: string;
  className?: string;
}

const DEFAULT_ACCENT = "var(--accent-brass)";
const DIM = "var(--border-mid)";

export function PipelineVisualizer({
  stages,
  currentIndex,
  completedColor = "var(--status-green)",
  className,
}: PipelineVisualizerProps) {
  const NODE = 40;

  return (
    <div
      className={className}
      style={{ width: "100%", overflowX: "auto", padding: "4px 0 2px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          minWidth: 520,
          gap: 0,
        }}
      >
        {stages.map((stage, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const accent = stage.color || DEFAULT_ACCENT;

          const nodeColor = isCompleted ? completedColor : isCurrent ? accent : DIM;
          const labelColor = isCompleted
            ? "var(--text-primary)"
            : isCurrent
            ? "#ffffff"
            : "var(--text-secondary)";
          // Connector leading INTO this node is filled once this node is reached.
          const connectorFilled = i <= currentIndex;

          return (
            <React.Fragment key={stage.key}>
              {i > 0 && (
                <div
                  aria-hidden="true"
                  style={{
                    flex: 1,
                    height: 2,
                    marginTop: NODE / 2,
                    minWidth: 24,
                    background: connectorFilled ? completedColor : DIM,
                    transition: "background var(--dur-3, 240ms) ease",
                  }}
                />
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                  width: 120,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: NODE,
                    height: NODE,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-data)",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: isCurrent ? "#0A0D10" : nodeColor,
                    background: isCurrent ? accent : "transparent",
                    border: `2px solid ${nodeColor}`,
                    boxShadow: isCurrent ? `0 0 12px ${accent}` : "none",
                    transition: "all var(--dur-3, 240ms) var(--ease-out-quad, ease)",
                  }}
                >
                  {isCompleted ? "✓" : i + 1}
                  {isCurrent && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        width: NODE + 10,
                        height: NODE + 10,
                        borderRadius: "50%",
                        border: `1px solid ${accent}`,
                        opacity: 0.5,
                        animation: "pulse-glow 1.8s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>

                <span
                  style={{
                    marginTop: 10,
                    fontSize: "0.75rem",
                    fontWeight: isCurrent ? 700 : 600,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    color: labelColor,
                    lineHeight: 1.25,
                    transition: "color var(--dur-3, 240ms) ease",
                  }}
                >
                  {stage.label}
                </span>

                {stage.hint && (
                  <span
                    style={{
                      marginTop: 4,
                      fontSize: "0.6875rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.3,
                    }}
                  >
                    {stage.hint}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

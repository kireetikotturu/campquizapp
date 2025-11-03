import React from "react";
import "./CircularTimer.css";

/*
  Updated CircularTimer:
  - wrapper class is "circular-timer-wrapper" (keeps "overlapped" compatibility)
  - svg is responsive (viewBox) so wrapper controls visible size via CSS
  - kept same API: ({ value, max, paused, onClick })
*/

const OUTER = 120; // viewBox coordinate system (keeps circle math simple)
const STROKE = 12;
const RADIUS = (OUTER - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CircularTimer({ value = 0, max = 30, paused = false, onClick, className = "" }) {
  const progress = max > 0 ? Math.max(0, value) / max : 0;
  const offset = CIRCUMFERENCE * (1 - progress);
  const danger = progress <= 0.2;

  // Compose classes so user-provided className is preserved
  const wrapperClass = `circular-timer-wrapper overlapped ${className}`.trim();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={paused ? "Timer paused - click to start" : `Timer ${value} seconds left`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick();
        }
      }}
      className={wrapperClass}
    >
      {/* svg uses viewBox so it scales with the wrapper size */}
      <svg viewBox={`0 0 ${OUTER} ${OUTER}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {/* Background ring */}
        <circle
          className="timer-bg"
          cx={OUTER / 2}
          cy={OUTER / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Foreground ring (progress) */}
        <circle
          className={`timer-fg${danger ? " danger" : ""}`}
          cx={OUTER / 2}
          cy={OUTER / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 0.95s cubic-bezier(.23,1,.32,1), stroke 0.25s",
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />
        {/* Timer text (centered) */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className={`timer-text${paused ? " paused" : ""}${danger ? " danger" : ""}`}
        >
          {Math.max(0, Math.floor(value))}s
        </text>
      </svg>
    </div>
  );
}
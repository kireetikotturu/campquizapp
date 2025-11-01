import React from "react";
import "./CircularTimer.css";

const OUTER = 96;
const STROKE = 8;
const RADIUS = (OUTER - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CircularTimer({ value, max, paused, onClick }) {
  const progress = Math.max(0, value) / max;
  const offset = CIRCUMFERENCE * (1 - progress);
  const danger = progress <= 0.2;

  return (
    <div
      className="circular-timer-wrapper overlapped"
      onClick={onClick}
      title={paused ? "Play" : "Pause"}
      style={{ cursor: "pointer" }}
    >
      <svg
        width={OUTER}
        height={OUTER}
        style={{ display: "block" }}
      >
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
              "stroke-dashoffset 0.98s cubic-bezier(.23,1,.32,1), stroke 0.25s",
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />
        {/* Timer text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className={`timer-text${paused ? " paused" : ""}${danger ? " danger" : ""}`}
        >
          {value}s
        </text>
      </svg>
    </div>
  );
}
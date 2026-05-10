import React from 'react'

export default function ProbabilityBar({ probability }) {
  const pct = Math.round(probability * 100)

  const color =
    pct >= 70 ? '#39d353' :
    pct <= 30 ? '#f85149' :
    '#e3b341'

  const isHighConviction = pct >= 80 || pct <= 20

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted font-sans">Probability</span>
        <span
          className={`font-mono text-lg font-semibold ${isHighConviction ? 'glow-pulse' : ''}`}
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: isHighConviction ? `0 0 8px ${color}` : 'none',
          }}
        />
      </div>
    </div>
  )
}

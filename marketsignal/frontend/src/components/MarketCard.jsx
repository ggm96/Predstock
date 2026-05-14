import React, { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import ProbabilityBar from './ProbabilityBar'
import PriceSparkline from './PriceSparkline'

const SOURCE_COLORS = {
  kalshi: '#6e40c9',
  polymarket: '#0052ff',
  manifold: '#4337c9',
  metaculus: '#2563eb',
}

const CATEGORY_COLORS = {
  macro: '#e3b341',
  equities: '#39d353',
  crypto: '#58a6ff',
  politics: '#f85149',
  commodities: '#d29922',
  rates: '#a371f7',
  other: '#8b949e',
}

function formatVolume(v) {
  if (!v) return null
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

function relativeTime(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  const diff = d - Date.now()
  const days = Math.round(diff / 86400000)
  if (days < 0) return 'closed'
  if (days === 0) return 'closes today'
  if (days === 1) return 'closes tomorrow'
  return `closes in ${days} days`
}

export default function MarketCard({ market, instruments, index }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState(null)
  const sourceColor = SOURCE_COLORS[market.source] || '#8b949e'
  const categoryColor = CATEGORY_COLORS[market.category] || '#8b949e'
  const closeLabel = relativeTime(market.close_date)
  const vol = formatVolume(market.volume_usd)

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 hover:border-text-muted transition-all duration-200 cursor-pointer"
      style={{
        animationName: 'fadeUp',
        animationDuration: '0.4s',
        animationFillMode: 'both',
        animationDelay: `${index * 50}ms`,
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full font-sans"
            style={{ backgroundColor: sourceColor + '22', color: sourceColor, border: `1px solid ${sourceColor}44` }}
          >
            {market.source.charAt(0).toUpperCase() + market.source.slice(1)}
          </span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full font-sans"
            style={{ backgroundColor: categoryColor + '18', color: categoryColor, border: `1px solid ${categoryColor}33` }}
          >
            {market.category}
          </span>
        </div>
        <div className="flex items-center gap-1 text-text-muted shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Title */}
      <p className="text-text-primary text-sm font-medium leading-snug line-clamp-2 font-sans mb-2">
        {market.title}
      </p>

      {/* Probability bar */}
      <ProbabilityBar probability={market.probability} />

      {/* Meta row */}
      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted font-sans">
        {vol && <span>{vol} vol</span>}
        {closeLabel && <span>{closeLabel}</span>}
      </div>

      {/* Ticker chips + per-ticker rationale */}
      {instruments.length > 0 && (
        <div className="mt-3" onClick={e => e.stopPropagation()}>
          <div className="flex flex-wrap gap-1.5">
            {instruments.map(inst => (
              <PriceSparkline
                key={inst.ticker}
                instrument={inst}
                active={selectedTicker === inst.ticker}
                onClick={() => setSelectedTicker(t => t === inst.ticker ? null : inst.ticker)}
              />
            ))}
          </div>
          {selectedTicker && market.ticker_rationales?.[selectedTicker] && (
            <div className="mt-2 px-2 py-1.5 rounded bg-surface border border-border">
              <span className="font-mono text-xs font-semibold" style={{ color: '#58a6ff' }}>
                {selectedTicker}
              </span>
              <p className="text-text-muted text-xs mt-0.5 leading-relaxed font-sans">
                {market.ticker_rationales[selectedTicker]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
          <p className="text-text-muted text-xs leading-relaxed font-sans mb-3">
            {market.question}
          </p>
          <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-sans"
          >
            View on {market.source.charAt(0).toUpperCase() + market.source.slice(1)}
            <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  )
}

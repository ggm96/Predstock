import React from 'react'

// Minimal sparkline placeholder — full chart data would need historical OHLCV
// Shows the ticker chip with price and change
export default function PriceSparkline({ instrument }) {
  const { ticker, price, change_pct, currency } = instrument
  const isPositive = change_pct >= 0

  const formatPrice = (p) => {
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 })
    if (p >= 1) return p.toFixed(2)
    return p.toFixed(4)
  }

  return (
    <div className="flex items-center gap-1.5 bg-surface rounded px-2 py-1 border border-border hover:border-text-muted transition-colors cursor-default">
      <span className="font-mono text-xs font-semibold text-text-primary">{ticker}</span>
      <span className="font-mono text-xs text-text-muted">
        {currency === 'USD' ? '$' : ''}{formatPrice(price)}
      </span>
      <span
        className="font-mono text-xs font-medium"
        style={{ color: isPositive ? '#39d353' : '#f85149' }}
      >
        {isPositive ? '+' : ''}{change_pct.toFixed(2)}%
      </span>
    </div>
  )
}

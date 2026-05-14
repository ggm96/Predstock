import React from 'react'

export default function PriceSparkline({ instrument, active, onClick }) {
  const { ticker, name, price, change_pct, currency } = instrument
  const isPositive = change_pct >= 0

  const formatPrice = (p) => {
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 })
    if (p >= 1) return p.toFixed(2)
    return p.toFixed(4)
  }

  const shortName = name && name !== ticker
    ? (name.length > 22 ? name.slice(0, 20) + '…' : name)
    : null

  return (
    <div
      onClick={onClick}
      className="flex flex-col bg-surface rounded px-2 py-1.5 border transition-all duration-150 min-w-0"
      style={{
        borderColor: active ? '#58a6ff' : '#30363d',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: active ? '0 0 0 1px #58a6ff44' : 'none',
      }}
    >
      <div className="flex items-center gap-1.5">
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
      {shortName && (
        <span className="text-text-muted font-sans mt-0.5" style={{ fontSize: '10px' }}>
          {shortName}
        </span>
      )}
    </div>
  )
}

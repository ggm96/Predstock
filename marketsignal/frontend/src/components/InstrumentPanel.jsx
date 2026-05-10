import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

function formatPrice(p, currency) {
  const sym = currency === 'USD' ? '$' : ''
  if (p >= 1000) return `${sym}${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  if (p >= 1) return `${sym}${p.toFixed(2)}`
  return `${sym}${p.toFixed(4)}`
}

export default function InstrumentPanel({ markets }) {
  // Deduplicate tickers across all visible markets, count mentions
  const tickerMap = new Map()

  for (const { market, instruments } of markets) {
    for (const inst of instruments) {
      const t = inst.ticker
      if (!tickerMap.has(t)) {
        tickerMap.set(t, { instrument: inst, count: 0 })
      }
      tickerMap.get(t).count++
    }
  }

  const sorted = [...tickerMap.values()].sort((a, b) => b.count - a.count)

  return (
    <div className="bg-surface border border-border rounded-lg p-4 sticky top-4">
      <h2 className="text-text-primary text-sm font-semibold font-sans mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent-green inline-block" />
        Related Instruments
      </h2>

      {sorted.length === 0 ? (
        <p className="text-text-muted text-xs font-sans">No instruments in current view</p>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {sorted.map(({ instrument: inst, count }) => {
            const isPos = inst.change_pct >= 0
            return (
              <div
                key={inst.ticker}
                className="flex items-center justify-between p-2.5 rounded bg-card border border-border hover:border-text-muted transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-text-primary">{inst.ticker}</span>
                    <span className="text-xs text-text-muted font-sans bg-surface px-1.5 py-0.5 rounded">
                      {count} {count === 1 ? 'market' : 'markets'}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted font-sans truncate mt-0.5 max-w-[160px]">{inst.name}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-mono text-sm text-text-primary">
                    {formatPrice(inst.price, inst.currency)}
                  </p>
                  <div
                    className="flex items-center justify-end gap-0.5 text-xs font-mono"
                    style={{ color: isPos ? '#39d353' : '#f85149' }}
                  >
                    {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isPos ? '+' : ''}{inst.change_pct.toFixed(2)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

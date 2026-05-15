import React, { useState } from 'react'
import { Building2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

export default function CompanyPanel({ markets }) {
  const [expanded, setExpanded] = useState(null)

  const companyMap = new Map()
  for (const { market } of markets) {
    if (!market.company) continue
    if (!companyMap.has(market.company)) companyMap.set(market.company, [])
    companyMap.get(market.company).push(market)
  }

  const sorted = [...companyMap.entries()].sort((a, b) => b[1].length - a[1].length)

  if (sorted.length === 0) return null

  return (
    <div className="bg-surface border border-border rounded-lg p-4 sticky top-4">
      <h2 className="text-text-primary text-sm font-semibold font-sans mb-3 flex items-center gap-2">
        <Building2 size={14} className="text-accent-green" />
        Companies in focus
      </h2>
      <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        {sorted.map(([company, companyMarkets]) => {
          const isOpen = expanded === company
          return (
            <div key={company} className="rounded border border-border overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-2.5 py-2 bg-card hover:bg-surface transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : company)}
              >
                <span className="text-sm font-sans text-text-primary truncate">{company}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-mono text-text-muted">
                    {companyMarkets.length} {companyMarkets.length === 1 ? 'market' : 'markets'}
                  </span>
                  {isOpen ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border divide-y divide-border">
                  {companyMarkets.map(m => (
                    <div key={m.id} className="px-2.5 py-2 bg-card">
                      <p className="text-xs text-text-primary leading-snug font-sans mb-1 line-clamp-2">
                        {m.title}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-mono text-xs font-semibold"
                          style={{ color: m.probability > 0.65 ? '#39d353' : m.probability < 0.35 ? '#f85149' : '#e3b341' }}
                        >
                          {Math.round(m.probability * 100)}%
                        </span>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-blue-400 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

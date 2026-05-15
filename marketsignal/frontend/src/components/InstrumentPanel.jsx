import React from 'react'
import { Building2 } from 'lucide-react'

export default function CompanyPanel({ markets }) {
  const companyMap = new Map()

  for (const { market } of markets) {
    if (!market.company) continue
    const key = market.company
    companyMap.set(key, (companyMap.get(key) || 0) + 1)
  }

  const sorted = [...companyMap.entries()].sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) return null

  return (
    <div className="bg-surface border border-border rounded-lg p-4 sticky top-4">
      <h2 className="text-text-primary text-sm font-semibold font-sans mb-3 flex items-center gap-2">
        <Building2 size={14} className="text-accent-green" />
        Companies in focus
      </h2>
      <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        {sorted.map(([company, count]) => (
          <div
            key={company}
            className="flex items-center justify-between px-2.5 py-2 rounded bg-card border border-border"
          >
            <span className="text-sm font-sans text-text-primary truncate">{company}</span>
            <span className="text-xs font-mono text-text-muted ml-2 shrink-0">
              {count} {count === 1 ? 'market' : 'markets'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

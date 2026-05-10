import React, { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

const SOURCES = ['kalshi', 'polymarket', 'manifold', 'metaculus']
const CATEGORIES = ['macro', 'equities', 'crypto', 'politics', 'commodities', 'rates']

const SOURCE_COLORS = {
  kalshi: '#6e40c9',
  polymarket: '#0052ff',
  manifold: '#4337c9',
  metaculus: '#2563eb',
}

const SORT_OPTIONS = [
  { value: 'probability', label: 'Probability' },
  { value: 'volume', label: 'Volume' },
  { value: 'close_date', label: 'Close Date' },
]

function Pill({ label, active, color, onClick, warn }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3 py-1 rounded-full text-xs font-medium font-sans transition-all duration-150 border"
      style={
        active
          ? { backgroundColor: (color || '#e6edf3') + '22', color: color || '#e6edf3', borderColor: (color || '#e6edf3') + '66' }
          : { backgroundColor: 'transparent', color: '#8b949e', borderColor: '#30363d' }
      }
    >
      {label}
      {warn && <span className="ml-1 text-accent-yellow">!</span>}
    </button>
  )
}

export default function FilterBar({ filters, onChange, health }) {
  const [searchVal, setSearchVal] = useState(filters.search || '')
  const debounceRef = useRef(null)

  const failedSources = health
    ? Object.entries(health.sources || {})
        .filter(([, s]) => !s.online)
        .map(([name]) => name)
    : []

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: searchVal || undefined })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchVal])

  const setSource = (s) => onChange({ ...filters, source: filters.source === s ? undefined : s })
  const setCategory = (c) => onChange({ ...filters, category: filters.category === c ? undefined : c })
  const setSort = (v) => onChange({ ...filters, sort: v })

  return (
    <div className="bg-surface border-b border-border px-4 py-3 space-y-3">
      {/* Search + sort row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search markets…"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            className="w-full bg-card border border-border rounded-md pl-8 pr-8 py-1.5 text-sm text-text-primary font-sans placeholder-text-muted focus:outline-none focus:border-text-muted"
          />
          {searchVal && (
            <button
              onClick={() => setSearchVal('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={filters.sort || 'probability'}
          onChange={e => setSort(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-1.5 text-sm text-text-primary font-sans focus:outline-none focus:border-text-muted"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Source pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-text-muted text-xs font-sans shrink-0">Source</span>
        <Pill
          label="ALL"
          active={!filters.source}
          color="#e6edf3"
          onClick={() => onChange({ ...filters, source: undefined })}
        />
        {SOURCES.map(s => (
          <Pill
            key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            active={filters.source === s}
            color={SOURCE_COLORS[s]}
            warn={failedSources.includes(s)}
            onClick={() => setSource(s)}
          />
        ))}
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-text-muted text-xs font-sans shrink-0">Category</span>
        <Pill
          label="ALL"
          active={!filters.category}
          color="#e6edf3"
          onClick={() => onChange({ ...filters, category: undefined })}
        />
        {CATEGORIES.map(c => (
          <Pill
            key={c}
            label={c.charAt(0).toUpperCase() + c.slice(1)}
            active={filters.category === c}
            color="#8b949e"
            onClick={() => setCategory(c)}
          />
        ))}
      </div>

      {/* Probability range */}
      <div className="flex items-center gap-3">
        <span className="text-text-muted text-xs font-sans shrink-0">Probability</span>
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <input
            type="range" min="0" max="100"
            value={Math.round((filters.minProbability ?? 0) * 100)}
            onChange={e => onChange({ ...filters, minProbability: parseInt(e.target.value) / 100 })}
            className="flex-1 accent-accent-green h-1"
          />
          <span className="font-mono text-xs text-text-muted w-8">
            {Math.round((filters.minProbability ?? 0) * 100)}%
          </span>
          <span className="text-text-muted text-xs">–</span>
          <input
            type="range" min="0" max="100"
            value={Math.round((filters.maxProbability ?? 1) * 100)}
            onChange={e => onChange({ ...filters, maxProbability: parseInt(e.target.value) / 100 })}
            className="flex-1 accent-accent-green h-1"
          />
          <span className="font-mono text-xs text-text-muted w-8">
            {Math.round((filters.maxProbability ?? 1) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}

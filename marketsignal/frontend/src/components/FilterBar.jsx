import React, { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

const SOURCES = ['kalshi', 'polymarket', 'manifold', 'metaculus']
const CATEGORIES = ['macro', 'equities', 'crypto', 'politics', 'commodities', 'rates']

const CATEGORY_COLORS = {
  macro: '#f0883e',
  equities: '#3fb950',
  crypto: '#a371f7',
  politics: '#f85149',
  commodities: '#e3b341',
  rates: '#58a6ff',
}

const SOURCE_COLORS = {
  kalshi: '#6e40c9',
  polymarket: '#0052ff',
  manifold: '#4337c9',
  metaculus: '#2563eb',
}

const SORT_OPTIONS = [
  { value: 'probability', label: 'Conviction' },
  { value: 'volume', label: 'Volume' },
  { value: 'close_date', label: 'Closing soon' },
]

function Pill({ label, active, color, onClick, warn }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-3 py-1 rounded-full text-xs font-medium font-sans transition-all duration-150 border"
      style={
        active
          ? { backgroundColor: (color || '#e6edf3') + '22', color: color || '#e6edf3', borderColor: (color || '#e6edf3') + '66' }
          : { backgroundColor: 'transparent', color: '#8b949e', borderColor: '#30363d' }
      }
    >
      {label}{warn && <span className="ml-1" style={{ color: '#e3b341' }}>!</span>}
    </button>
  )
}

export default function FilterBar({ filters, onChange, health }) {
  const [searchVal, setSearchVal] = useState(filters.search || '')
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const debounceRef = useRef(null)

  // Debounce search — filtersRef ensures the latest filters are always spread in,
  // so typing in search can never accidentally clobber a source/category change.
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filtersRef.current, search: searchVal || undefined })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchVal]) // eslint-disable-line react-hooks/exhaustive-deps

  // If parent clears all filters, reset local search input too
  useEffect(() => {
    if (!filters.search && searchVal) setSearchVal('')
  }, [filters.search]) // eslint-disable-line react-hooks/exhaustive-deps

  const failedSources = health
    ? Object.entries(health.sources || {}).filter(([, s]) => !s.online).map(([n]) => n)
    : []

  return (
    <div className="bg-surface border-b border-border px-4 py-2.5 space-y-2">
      {/* Search + sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search markets…"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            className="w-full bg-card border border-border rounded-md pl-7 pr-7 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-text-muted font-sans"
          />
          {searchVal && (
            <button type="button" onClick={() => setSearchVal('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X size={12} />
            </button>
          )}
        </div>
        <select
          value={filters.sort || 'probability'}
          onChange={e => onChange({ ...filters, sort: e.target.value })}
          className="bg-card border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary font-sans focus:outline-none focus:border-text-muted"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Source pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-text-muted text-xs shrink-0 w-14">Source</span>
        <Pill label="All" active={!filters.source} color="#e6edf3"
          onClick={() => onChange({ ...filters, source: undefined })} />
        {SOURCES.map(s => (
          <Pill key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            active={filters.source === s}
            color={SOURCE_COLORS[s]}
            warn={failedSources.includes(s)}
            onClick={() => onChange({ ...filters, source: filters.source === s ? undefined : s })}
          />
        ))}
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-text-muted text-xs shrink-0 w-14">Category</span>
        <Pill label="All" active={!filters.category} color="#e6edf3"
          onClick={() => onChange({ ...filters, category: undefined })} />
        {CATEGORIES.map(c => (
          <Pill key={c}
            label={c.charAt(0).toUpperCase() + c.slice(1)}
            active={filters.category === c}
            color={CATEGORY_COLORS[c]}
            onClick={() => onChange({ ...filters, category: filters.category === c ? undefined : c })}
          />
        ))}
      </div>
    </div>
  )
}

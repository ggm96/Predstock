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

function Pill({ label, active, color, onClick, warn }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 border"
      style={
        active
          ? { backgroundColor: color + '22', color, borderColor: color + '66' }
          : { backgroundColor: 'transparent', color: '#8b949e', borderColor: '#30363d' }
      }
    >
      {label}{warn && <span className="ml-1 text-yellow-400">!</span>}
    </button>
  )
}

export default function FilterBar({ source, category, search, sort, onSource, onCategory, onSearch, onSort, health }) {
  // Local state only for the search input (debounced before calling onSearch)
  const [inputVal, setInputVal] = useState(search || '')
  const debounceRef = useRef(null)
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  // Keep input in sync if parent clears search
  useEffect(() => {
    if (!search && inputVal) setInputVal('')
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = (val) => {
    setInputVal(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSearchRef.current(val), 300)
  }

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
            value={inputVal}
            onChange={e => handleInput(e.target.value)}
            className="w-full bg-card border border-border rounded-md pl-7 pr-7 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-text-muted"
          />
          {inputVal && (
            <button type="button" onClick={() => handleInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X size={12} />
            </button>
          )}
        </div>
        <select
          value={sort || 'probability'}
          onChange={e => onSort(e.target.value)}
          className="bg-card border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-text-muted"
        >
          <option value="probability">Conviction</option>
          <option value="volume">Volume</option>
          <option value="close_date">Closing soon</option>
        </select>
      </div>

      {/* Source pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-text-muted text-xs shrink-0 w-14">Source</span>
        <Pill label="All" active={!source} color="#e6edf3" onClick={() => onSource(undefined)} />
        {SOURCES.map(s => (
          <Pill key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            active={source === s}
            color={SOURCE_COLORS[s]}
            warn={failedSources.includes(s)}
            onClick={() => onSource(source === s ? undefined : s)}
          />
        ))}
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-text-muted text-xs shrink-0 w-14">Category</span>
        <Pill label="All" active={!category} color="#e6edf3" onClick={() => onCategory(undefined)} />
        {CATEGORIES.map(c => (
          <Pill key={c}
            label={c.charAt(0).toUpperCase() + c.slice(1)}
            active={category === c}
            color={CATEGORY_COLORS[c]}
            onClick={() => onCategory(category === c ? undefined : c)}
          />
        ))}
      </div>
    </div>
  )
}

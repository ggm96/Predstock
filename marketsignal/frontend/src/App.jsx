import React, { useState, useMemo } from 'react'
import { RefreshCw, Activity } from 'lucide-react'
import { useMarkets } from './hooks/useMarkets'
import MarketCard from './components/MarketCard'
import CompanyPanel from './components/InstrumentPanel'
import FilterBar from './components/FilterBar'

const PAGE_SIZE = 100

const SOURCES = ['kalshi', 'polymarket', 'manifold', 'metaculus']
const SOURCE_COLORS = {
  kalshi: '#6e40c9',
  polymarket: '#0052ff',
  manifold: '#4337c9',
  metaculus: '#2563eb',
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex gap-2 mb-3">
        <div className="shimmer h-5 w-16 rounded-full" />
        <div className="shimmer h-5 w-14 rounded-full" />
      </div>
      <div className="shimmer h-4 w-full rounded mb-2" />
      <div className="shimmer h-4 w-3/4 rounded mb-4" />
      <div className="shimmer h-2 w-full rounded-full" />
    </div>
  )
}

function applyFilters(markets, filters) {
  const now = new Date()
  let out = markets.filter(m => {
    if (!m.market.close_date) return true
    const d = new Date(m.market.close_date)
    return isNaN(d.getTime()) || d > now
  })
  if (filters.source) out = out.filter(m => m.market.source === filters.source)
  if (filters.category) out = out.filter(m => m.market.category === filters.category)
  if (filters.minProbability != null) out = out.filter(m => m.market.probability >= filters.minProbability)
  if (filters.maxProbability != null) out = out.filter(m => m.market.probability <= filters.maxProbability)
  if (filters.search) {
    const q = filters.search.toLowerCase()
    out = out.filter(m =>
      m.market.title.toLowerCase().includes(q) ||
      m.market.question.toLowerCase().includes(q)
    )
  }
  return out
}

function sortMarkets(markets, sort) {
  const copy = [...markets]
  if (sort === 'volume') {
    return copy.sort((a, b) => (b.market.volume_usd ?? 0) - (a.market.volume_usd ?? 0))
  }
  if (sort === 'close_date') {
    return copy.sort((a, b) => {
      const da = a.market.close_date ? new Date(a.market.close_date) : new Date('9999')
      const db = b.market.close_date ? new Date(b.market.close_date) : new Date('9999')
      return da - db
    })
  }
  return copy.sort((a, b) =>
    Math.abs(b.market.probability - 0.5) - Math.abs(a.market.probability - 0.5)
  )
}

export default function App() {
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(0)
  const { markets, health, loading, error, countdown, lastRefresh, refresh } = useMarkets()

  // Both state updates are batched by React 18 — single render, no desync
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPage(0)
  }

  const sortedMarkets = useMemo(
    () => sortMarkets(applyFilters(markets, filters), filters.sort),
    [markets, filters]
  )

  const visibleMarkets = sortedMarkets.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore = sortedMarkets.length > visibleMarkets.length
  const sourceStatuses = health?.sources ?? {}

  const formatTime = d =>
    d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

  return (
    <div className="min-h-screen bg-bg font-sans">
      {/* ── Header ── */}
      <header className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-accent-green" />
            <span className="font-mono text-base font-semibold text-text-primary">MarketSignal</span>
            <span className="text-text-muted text-xs hidden sm:block">Prediction Markets × Finance</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Source status dots */}
            <div className="flex items-center gap-2">
              {SOURCES.map(s => {
                const st = sourceStatuses[s]
                return (
                  <div key={s} className="flex items-center gap-1" title={`${s}: ${st?.count ?? 0} markets`}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st?.online ? '#39d353' : '#f85149' }} />
                    <span className="text-xs" style={{ color: SOURCE_COLORS[s] }}>{s[0].toUpperCase()}</span>
                  </div>
                )
              })}
            </div>
            <span className="text-text-muted text-xs hidden md:block">{sortedMarkets.length} markets</span>
            <span className="text-text-muted text-xs hidden md:block">
              {lastRefresh ? `Updated ${formatTime(lastRefresh)}` : 'Loading…'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-text-muted">{countdown}s</span>
              <button
                onClick={refresh}
                disabled={loading}
                className="p-1 rounded hover:bg-card transition-colors text-text-muted hover:text-text-primary"
                title="Refresh"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <FilterBar filters={filters} onChange={handleFilterChange} health={health} />
      </header>

      {/* ── Body ── */}
      <main className="max-w-screen-xl mx-auto px-4 py-4">
        {error ? (
          <div className="text-accent-red text-sm p-4 bg-card border border-border rounded-lg">
            Failed to load markets: {error}
          </div>
        ) : (
          <div className="flex gap-4 items-start">
            {/* Market list */}
            <div className="flex-1 min-w-0">
              {loading && markets.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : sortedMarkets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-muted">
                  <Activity size={36} className="mb-3 opacity-30" />
                  <p className="text-sm">No markets match these filters.</p>
                  <button
                    onClick={() => handleFilterChange({})}
                    className="mt-2 text-xs underline hover:text-text-primary transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleMarkets.map((mwi, i) => (
                    <MarketCard key={mwi.market.id} market={mwi.market} index={i} />
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="w-full py-2.5 text-xs text-text-muted border border-border rounded-lg hover:border-text-muted hover:text-text-primary transition-colors"
                    >
                      Show more — {sortedMarkets.length - visibleMarkets.length} remaining
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Company panel — desktop */}
            <div className="w-72 xl:w-80 shrink-0 hidden lg:block">
              <CompanyPanel markets={visibleMarkets} />
            </div>
          </div>
        )}

        {/* Company panel — mobile */}
        {!loading && visibleMarkets.length > 0 && (
          <div className="lg:hidden mt-4">
            <CompanyPanel markets={visibleMarkets} />
          </div>
        )}
      </main>
    </div>
  )
}

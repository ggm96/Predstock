import React, { useState, useMemo } from 'react'
import { RefreshCw, Activity } from 'lucide-react'
import { useMarkets } from './hooks/useMarkets'
import MarketCard from './components/MarketCard'
import InstrumentPanel from './components/InstrumentPanel'
import FilterBar from './components/FilterBar'

const SOURCE_COLORS = {
  kalshi: '#6e40c9',
  polymarket: '#0052ff',
  manifold: '#4337c9',
  metaculus: '#2563eb',
}

const SOURCES = ['kalshi', 'polymarket', 'manifold', 'metaculus']

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex gap-2 mb-3">
        <div className="shimmer h-5 w-16 rounded-full" />
        <div className="shimmer h-5 w-14 rounded-full" />
      </div>
      <div className="shimmer h-4 w-full rounded mb-1.5" />
      <div className="shimmer h-4 w-3/4 rounded mb-4" />
      <div className="shimmer h-2 w-full rounded-full mb-1" />
      <div className="flex gap-2 mt-3">
        <div className="shimmer h-6 w-20 rounded" />
        <div className="shimmer h-6 w-20 rounded" />
      </div>
    </div>
  )
}

function sortMarkets(markets, sort) {
  const copy = [...markets]
  if (sort === 'volume') {
    copy.sort((a, b) => (b.market.volume_usd ?? 0) - (a.market.volume_usd ?? 0))
  } else if (sort === 'close_date') {
    copy.sort((a, b) => {
      const da = a.market.close_date ? new Date(a.market.close_date) : new Date('9999')
      const db = b.market.close_date ? new Date(b.market.close_date) : new Date('9999')
      return da - db
    })
  } else {
    // probability — extreme first (high or low conviction)
    copy.sort((a, b) => {
      const distA = Math.abs(a.market.probability - 0.5)
      const distB = Math.abs(b.market.probability - 0.5)
      return distB - distA
    })
  }
  return copy
}

function applyFilters(markets, filters) {
  const now = new Date()
  let out = markets.filter(m => !m.market.close_date || new Date(m.market.close_date) > now)
  if (filters.source) out = out.filter(m => m.market.source === filters.source)
  if (filters.category) out = out.filter(m => m.market.category === filters.category)
  if (filters.minProbability != null) out = out.filter(m => m.market.probability >= filters.minProbability)
  if (filters.maxProbability != null) out = out.filter(m => m.market.probability <= filters.maxProbability)
  if (filters.search) {
    const q = filters.search.toLowerCase()
    out = out.filter(m => m.market.title.toLowerCase().includes(q) || m.market.question.toLowerCase().includes(q))
  }
  return out
}

export default function App() {
  const [filters, setFilters] = useState({})
  const { markets, health, loading, error, countdown, lastRefresh, refresh } = useMarkets()

  const sortedMarkets = useMemo(
    () => sortMarkets(applyFilters(markets, filters), filters.sort),
    [markets, filters]
  )

  const sourceStatuses = health?.sources ?? {}
  const totalMarkets = sortedMarkets.length

  const formatTime = (d) => {
    if (!d) return '—'
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-bg font-sans">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-accent-green" />
            <span className="font-mono text-base font-semibold text-text-primary">MarketSignal</span>
            <span className="text-text-muted text-xs font-sans hidden sm:block">
              Prediction Markets × Finance
            </span>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {SOURCES.map(s => {
                const status = sourceStatuses[s]
                const online = status?.online
                return (
                  <div key={s} className="flex items-center gap-1" title={`${s}: ${status?.count ?? 0} markets`}>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: online ? '#39d353' : '#f85149' }}
                    />
                    <span className="text-xs font-sans" style={{ color: SOURCE_COLORS[s] }}>
                      {s.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )
              })}
            </div>

            <span className="text-text-muted text-xs font-sans hidden md:block">
              {totalMarkets} markets
            </span>

            <span className="text-text-muted text-xs font-sans hidden md:block">
              {lastRefresh ? `Updated ${formatTime(lastRefresh)}` : 'Loading…'}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-text-muted">{countdown}s</span>
              <button
                onClick={refresh}
                disabled={loading}
                className="p-1 rounded hover:bg-card transition-colors text-text-muted hover:text-text-primary"
                title="Refresh now"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar filters={filters} onChange={setFilters} health={health} />
      </header>

      {/* Main content */}
      <main className="max-w-screen-xl mx-auto px-4 py-4">
        {error ? (
          <div className="text-accent-red text-sm font-sans p-4 bg-card border border-border rounded-lg">
            Failed to load markets: {error}. Please try refreshing the page.
          </div>
        ) : (
          <div className="flex gap-4 items-start">
            {/* Market cards — 2/3 width */}
            <div className="flex-1 min-w-0">
              {loading && markets.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : sortedMarkets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                  <Activity size={40} className="mb-3 opacity-30" />
                  <p className="font-sans text-sm">No markets match the current filters.</p>
                  <button
                    onClick={() => setFilters({})}
                    className="mt-2 text-xs underline hover:text-text-primary transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedMarkets.map((mwi, i) => (
                    <MarketCard
                      key={mwi.market.id}
                      market={mwi.market}
                      instruments={mwi.instruments}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Instrument panel — 1/3 width, sticky */}
            <div className="w-72 xl:w-80 shrink-0 hidden lg:block">
              <InstrumentPanel markets={sortedMarkets} />
            </div>
          </div>
        )}

        {/* Mobile instrument panel */}
        {!loading && sortedMarkets.length > 0 && (
          <div className="lg:hidden mt-4">
            <InstrumentPanel markets={sortedMarkets} />
          </div>
        )}
      </main>
    </div>
  )
}

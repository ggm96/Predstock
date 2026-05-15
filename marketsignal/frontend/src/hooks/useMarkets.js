import { useState, useEffect, useRef } from 'react'
import { fetchMarkets, fetchHealth } from '../api/client'

const REFRESH_MS = 60000

export function useMarkets({ source, category } = {}) {
  const [markets, setMarkets] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)
  const [lastRefresh, setLastRefresh] = useState(null)
  const refreshRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const [data, healthData] = await Promise.all([
          fetchMarkets({ source, category, limit: 5000 }),
          fetchHealth().catch(() => null),
        ])
        if (cancelled) return
        setMarkets(data)
        setHealth(healthData)
        setLastRefresh(new Date())
        setCountdown(REFRESH_MS / 1000)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    refreshRef.current = run

    const interval = setInterval(run, REFRESH_MS)
    const tick = setInterval(() => setCountdown(c => (c <= 1 ? REFRESH_MS / 1000 : c - 1)), 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
      clearInterval(tick)
    }
  }, [source, category]) // re-fetch whenever source or category changes

  return {
    markets,
    health,
    loading,
    error,
    countdown,
    lastRefresh,
    refresh: () => refreshRef.current?.(),
  }
}

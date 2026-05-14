import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchMarkets, fetchHealth } from '../api/client'

const REFRESH_INTERVAL = 60000 // 60 seconds

export function useMarkets() {
  const [markets, setMarkets] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000)
  const [lastRefresh, setLastRefresh] = useState(null)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const [data, healthData] = await Promise.all([
        fetchMarkets({ limit: 500 }),
        fetchHealth().catch(() => null),
      ])
      setMarkets(data)
      setHealth(healthData)
      setLastRefresh(new Date())
      setCountdown(REFRESH_INTERVAL / 1000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    timerRef.current = setInterval(() => load(true), REFRESH_INTERVAL)
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1))
    }, 1000)
    return () => {
      clearInterval(timerRef.current)
      clearInterval(countdownRef.current)
    }
  }, [load])

  return { markets, health, loading, error, countdown, lastRefresh, refresh: () => load(true) }
}

const BASE = '/api'

export async function fetchMarkets(filters = {}) {
  const params = new URLSearchParams()
  if (filters.source) params.set('source', filters.source)
  if (filters.category) params.set('category', filters.category)
  if (filters.minProbability != null) params.set('min_probability', filters.minProbability)
  if (filters.maxProbability != null) params.set('max_probability', filters.maxProbability)
  if (filters.search) params.set('search', filters.search)
  if (filters.limit) params.set('limit', filters.limit)

  const qs = params.toString()
  const res = await fetch(`${BASE}/markets${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchHealth() {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchInstrumentsSummary() {
  const res = await fetch(`${BASE}/instruments/summary`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

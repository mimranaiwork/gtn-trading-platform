import { apiClient } from './client'

export interface TickerDoc {
  key: string
  tickerId: string
  sourceId: string
  displayTicker: string
  longDescription: string
  languageId: string
}

export interface Quote {
  key: string
  symbol: string
  exchange: string
  last: number | null
  change: number | null
  pctChange: number | null
  open: number | null
  high: number | null
  low: number | null
  prevClose: number | null
  volume: number | null
  transactionDate: string
  lastUpdatedOn: string | null
}

// GTN's realtime/intraday/top-stocks endpoints are 403 Forbidden for this sandbox
// institution, so quotes come from the history API's latest loaded trading day —
// which can lag behind the real market by days. Surface that day so the UI never
// implies this is a live market price when it's actually a stale sandbox close.
export function quoteAsOfLabel(transactionDate: string): string {
  const d = new Date(transactionDate)
  if (Number.isNaN(d.getTime())) return ''
  return `as of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} close`
}

export interface Mover {
  key: string
  tickerId: string
  sourceId: string
  lasttradeprice: number
  pctChange: number
}

function dedupeByKey(docs: TickerDoc[]): TickerDoc[] {
  const byKey = new Map<string, TickerDoc>()
  for (const d of docs) {
    const existing = byKey.get(d.key)
    if (!existing || d.languageId === 'EN') byKey.set(d.key, d)
  }
  return [...byKey.values()]
}

export async function getQuotes(keys: string[]): Promise<Quote[]> {
  if (keys.length === 0) return []
  const { data } = await apiClient.get('/api/marketdata/quotes', { params: { keys: keys.join(',') } })
  return data?.quotes ?? []
}

export async function getTickers(keys: string[]): Promise<TickerDoc[]> {
  if (keys.length === 0) return []
  const { data } = await apiClient.get('/api/marketdata/tickers', { params: { keys: keys.join(',') } })
  return dedupeByKey(data?.response?.docs ?? [])
}

export async function searchSymbols(exchange: string, query: string): Promise<TickerDoc[]> {
  const { data } = await apiClient.get('/api/marketdata/search', { params: { exchange, query, rows: 20 } })
  return dedupeByKey(data?.response?.docs ?? [])
}

export async function getMovers(exchange: string, direction: 'gainers' | 'losers'): Promise<Mover[]> {
  const { data } = await apiClient.get('/api/marketdata/movers', { params: { exchange, direction, rows: 6 } })
  return data?.response?.docs ?? []
}

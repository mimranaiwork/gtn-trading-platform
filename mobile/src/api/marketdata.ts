import { apiClient } from './client'

export interface TickerDoc {
  KEY: string
  TICKER_ID: string
  SOURCE_ID: string
  DISPLAY_TICKER: string
  LONG_DESCRIPTION: string
  LANGUAGE_ID: string
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
}

export interface Mover {
  KEY: string
  TICKER_ID: string
  SOURCE_ID: string
  LASTTRADEPRICE: number
  PCT_CHANGE: number
}

function dedupeByKey(docs: TickerDoc[]): TickerDoc[] {
  const byKey = new Map<string, TickerDoc>()
  for (const d of docs) {
    const existing = byKey.get(d.KEY)
    if (!existing || d.LANGUAGE_ID === 'EN') byKey.set(d.KEY, d)
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

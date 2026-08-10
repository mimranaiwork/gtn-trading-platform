import { apiClient } from './client'

export interface TickerDoc {
  KEY: string
  TICKER_ID: string
  SOURCE_ID: string
  DISPLAY_TICKER: string
  LONG_DESCRIPTION: string
  CURRENCY_ID: string
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
  transactionDate: string
  lastUpdatedOn: string | null
}

export interface Mover {
  KEY: string
  TICKER_ID: string
  SOURCE_ID: string
  LASTTRADEPRICE: number
  CHANGE: number
  PCT_CHANGE: number
  VOLUME: number
}

export interface Exchange {
  exchangeCode: string
  description: string
}

export async function getTickers(keys: string[]): Promise<TickerDoc[]> {
  if (keys.length === 0) return []
  const { data } = await apiClient.get('/api/marketdata/tickers', {
    params: { keys: keys.join(',') },
  })
  const docs: TickerDoc[] = data?.response?.docs ?? []
  // Sandbox returns one row per language; keep the English one when available.
  const bySymbol = new Map<string, TickerDoc>()
  for (const doc of docs) {
    const existing = bySymbol.get(doc.KEY)
    if (!existing || doc.LANGUAGE_ID === 'EN') bySymbol.set(doc.KEY, doc)
  }
  return [...bySymbol.values()]
}

export async function getQuotes(keys: string[]): Promise<Quote[]> {
  if (keys.length === 0) return []
  const { data } = await apiClient.get('/api/marketdata/quotes', {
    params: { keys: keys.join(',') },
  })
  return data?.quotes ?? []
}

export async function searchSymbols(exchange: string, query: string, rows = 20): Promise<TickerDoc[]> {
  const { data } = await apiClient.get('/api/marketdata/search', {
    params: { exchange, query, rows },
  })
  const docs: TickerDoc[] = data?.response?.docs ?? []
  const bySymbol = new Map<string, TickerDoc>()
  for (const doc of docs) {
    const existing = bySymbol.get(doc.KEY)
    if (!existing || doc.LANGUAGE_ID === 'EN') bySymbol.set(doc.KEY, doc)
  }
  return [...bySymbol.values()]
}

export async function listSymbols(
  exchange: string,
  page: number,
  rows = 25,
): Promise<{ docs: TickerDoc[]; numFound: number }> {
  const { data } = await apiClient.get('/api/marketdata/listing', {
    params: { exchange, page, rows },
  })
  const docs: TickerDoc[] = data?.response?.docs ?? []
  const numFound: number = data?.response?.numFound ?? 0
  const bySymbol = new Map<string, TickerDoc>()
  for (const doc of docs) {
    const existing = bySymbol.get(doc.KEY)
    if (!existing || doc.LANGUAGE_ID === 'EN') bySymbol.set(doc.KEY, doc)
  }
  return { docs: [...bySymbol.values()], numFound }
}

export async function getMovers(exchange: string, direction: 'gainers' | 'losers', rows = 8): Promise<Mover[]> {
  const { data } = await apiClient.get('/api/marketdata/movers', { params: { exchange, direction, rows } })
  return data?.response?.docs ?? []
}

export async function getExchanges(): Promise<Exchange[]> {
  const { data } = await apiClient.get('/api/gtn/trade/bo/v1.2/master-data/institution/exchanges')
  return data?.list ?? []
}

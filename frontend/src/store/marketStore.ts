import { create } from 'zustand'
import type { Quote, TickerDoc } from '../api/marketdata'

export type ListName = 'stocks' | 'indices'

interface MarketState {
  lists: Record<ListName, string[]>
  addKey: (list: ListName, key: string) => void
  removeKey: (list: ListName, key: string) => void

  tickers: Record<string, TickerDoc>
  setTickers: (docs: TickerDoc[]) => void

  quotes: Record<string, Quote>
  setQuotes: (quotes: Quote[]) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  lists: {
    stocks: ['NSDQ~AAPL', 'NSDQ~MSFT', 'NSDQ~TSLA'],
    indices: [],
  },
  addKey: (list, key) =>
    set((state) => ({
      lists: {
        ...state.lists,
        [list]: state.lists[list].includes(key) ? state.lists[list] : [...state.lists[list], key],
      },
    })),
  removeKey: (list, key) =>
    set((state) => ({
      lists: { ...state.lists, [list]: state.lists[list].filter((k) => k !== key) },
    })),

  tickers: {},
  setTickers: (docs) =>
    set((state) => ({
      tickers: { ...state.tickers, ...Object.fromEntries(docs.map((d) => [d.KEY, d])) },
    })),

  quotes: {},
  setQuotes: (quotes) =>
    set((state) => ({
      quotes: { ...state.quotes, ...Object.fromEntries(quotes.map((q) => [q.key, q])) },
    })),
}))

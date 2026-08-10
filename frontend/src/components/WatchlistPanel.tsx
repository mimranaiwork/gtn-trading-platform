import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getQuotes, getTickers } from '../api/marketdata'
import { useMarketStore, type ListName } from '../store/marketStore'

export default function WatchlistPanel({
  listName,
  title,
  emptyNote,
  onSelect,
}: {
  listName: ListName
  title: string
  emptyNote?: string
  onSelect: (key: string) => void
}) {
  const keys = useMarketStore((s) => s.lists[listName])
  const removeKey = useMarketStore((s) => s.removeKey)
  const setTickers = useMarketStore((s) => s.setTickers)
  const setQuotes = useMarketStore((s) => s.setQuotes)
  const tickers = useMarketStore((s) => s.tickers)
  const quotes = useMarketStore((s) => s.quotes)

  const { data: tickerData } = useQuery({
    queryKey: ['tickers', listName, keys],
    queryFn: () => getTickers(keys),
    enabled: keys.length > 0,
  })
  useEffect(() => {
    if (tickerData) setTickers(tickerData)
  }, [tickerData, setTickers])

  const { data: quoteData, isFetching } = useQuery({
    queryKey: ['quotes', listName, keys],
    queryFn: () => getQuotes(keys),
    enabled: keys.length > 0,
    refetchInterval: 10_000,
  })
  useEffect(() => {
    if (quoteData) setQuotes(quoteData)
  }, [quoteData, setQuotes])

  if (keys.length === 0) {
    return <p className="text-sm text-gray-400">{emptyNote ?? `No symbols in ${title} yet — add some via Markets search.`}</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {isFetching && <p className="text-[10px] text-gray-500">refreshing…</p>}
      {keys.map((key) => {
        const t = tickers[key]
        const q = quotes[key]
        const changeColor = q?.pctChange == null ? 'text-gray-400' : q.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
        return (
          <div key={key} className="group flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5">
            <button onClick={() => onSelect(key)} className="flex flex-1 flex-col items-start text-left">
              <span className="font-medium">{t?.DISPLAY_TICKER ?? key}</span>
              <span className="text-xs text-gray-400">{t?.LONG_DESCRIPTION ?? ' '}</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm">{q?.last != null ? q.last.toFixed(2) : '—'}</div>
                <div className={`text-xs ${changeColor}`}>
                  {q?.pctChange != null ? `${q.pctChange >= 0 ? '+' : ''}${q.pctChange.toFixed(2)}%` : '—'}
                </div>
              </div>
              <button
                onClick={() => removeKey(listName, key)}
                className="hidden text-gray-500 hover:text-red-400 group-hover:block"
                title="Remove"
              >
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

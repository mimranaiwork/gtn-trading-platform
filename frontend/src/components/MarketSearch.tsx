import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExchanges, listSymbols, searchSymbols } from '../api/marketdata'
import { useMarketStore, type ListName } from '../store/marketStore'

export default function MarketSearch() {
  const addKey = useMarketStore((s) => s.addKey)
  const [exchange, setExchange] = useState('NSDQ')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [targetList, setTargetList] = useState<ListName>('stocks')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => setPage(1), [exchange, debouncedQuery])

  const { data: exchanges } = useQuery({ queryKey: ['exchanges'], queryFn: getExchanges })

  const isSearching = debouncedQuery.length > 0
  const { data, isLoading, error } = useQuery({
    queryKey: ['market-browse', exchange, debouncedQuery, page],
    queryFn: () =>
      isSearching
        ? searchSymbols(exchange, debouncedQuery).then((docs) => ({ docs, numFound: docs.length }))
        : listSymbols(exchange, page),
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm"
        >
          {(exchanges ?? [{ exchangeCode: 'NSDQ', description: 'Nasdaq' }]).map((ex) => (
            <option key={ex.exchangeCode} value={ex.exchangeCode}>
              {ex.description || ex.exchangeCode}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker prefix, e.g. AAP…"
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm"
        />
        <select
          value={targetList}
          onChange={(e) => setTargetList(e.target.value as ListName)}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm"
          title="Where '+' adds a result"
        >
          <option value="stocks">→ Watchlist</option>
          <option value="indices">→ Indices</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-400">Search failed</p>}

      <div className="flex max-h-64 flex-col gap-1 overflow-auto">
        {data?.docs.map((d) => (
          <div key={d.KEY} className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-white/5">
            <div>
              <span className="font-medium">{d.DISPLAY_TICKER}</span>{' '}
              <span className="text-xs text-gray-400">{d.LONG_DESCRIPTION}</span>
            </div>
            <button
              onClick={() => addKey(targetList, d.KEY)}
              className="rounded bg-white/10 px-2 text-xs hover:bg-white/20"
            >
              +
            </button>
          </div>
        ))}
        {data && data.docs.length === 0 && <p className="text-sm text-gray-400">No matches.</p>}
      </div>

      {!isSearching && data && data.numFound > 25 && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">
            ← Prev
          </button>
          <span>
            Page {page} · {data.numFound.toLocaleString()} listed on {exchange}
          </span>
          <button onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}

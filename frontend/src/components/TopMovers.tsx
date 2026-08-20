import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExchanges, getMovers } from '../api/marketdata'
import { useMarketStore } from '../store/marketStore'

function MoversList({ exchange, direction }: { exchange: string; direction: 'gainers' | 'losers' }) {
  const addKey = useMarketStore((s) => s.addKey)
  const { data, isLoading, error } = useQuery({
    queryKey: ['movers', exchange, direction],
    queryFn: () => getMovers(exchange, direction, 8),
    refetchInterval: 60_000,
  })

  if (isLoading) return <p className="text-xs text-gray-400">Loading…</p>
  if (error) return <p className="text-xs text-red-400">Failed to load</p>
  if (data && data.length === 0) return <p className="text-xs text-gray-400">No data</p>

  return (
    <div className="flex flex-col gap-1">
      {data?.map((m) => (
        <div key={m.key} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-white/5">
          <button onClick={() => addKey('stocks', m.key)} className="text-left">
            <span className="font-medium">{m.tickerId}</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{m.lasttradeprice?.toFixed(2)}</span>
            <span className={direction === 'gainers' ? 'text-emerald-400' : 'text-rose-400'}>
              {m.pctChange >= 0 ? '+' : ''}
              {m.pctChange?.toFixed(2)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TopMovers() {
  const [exchange, setExchange] = useState('NSDQ')
  const { data: exchanges } = useQuery({ queryKey: ['exchanges'], queryFn: getExchanges })

  return (
    <div className="flex flex-col gap-3">
      <select
        value={exchange}
        onChange={(e) => setExchange(e.target.value)}
        className="self-start rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm"
      >
        {(exchanges ?? [{ exchangeCode: 'NSDQ', description: 'Nasdaq' }]).map((ex) => (
          <option key={ex.exchangeCode} value={ex.exchangeCode}>
            {ex.description || ex.exchangeCode}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase text-emerald-400">Gainers</h3>
          <MoversList exchange={exchange} direction="gainers" />
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase text-rose-400">Losers</h3>
          <MoversList exchange={exchange} direction="losers" />
        </div>
      </div>
      <p className="text-[10px] text-gray-500">
        Computed from GTN's EOD history data, sorted server-side by % change for the most recent trading day —
        GTN's dedicated top-stocks endpoint is 403 Forbidden for this sandbox institution. Click a symbol to add it
        to your watchlist.
      </p>
    </div>
  )
}

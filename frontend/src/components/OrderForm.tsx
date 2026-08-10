import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { placeOrder } from '../api/orders'
import { useMarketStore } from '../store/marketStore'

export default function OrderForm({ selectedKey }: { selectedKey: string | null }) {
  const ticker = useMarketStore((s) => (selectedKey ? s.tickers[selectedKey] : undefined))
  const [accountNumber, setAccountNumber] = useState('P001799341')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState<number | ''>('')
  const [side, setSide] = useState<1 | 2>(1)

  const mutation = useMutation({ mutationFn: placeOrder })

  if (!ticker) return <p className="text-sm text-gray-400">Select a symbol from the watchlist to place an order.</p>

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate({
          externalOrderId: `ui-${Date.now()}`,
          accountNumber,
          symbol: ticker.TICKER_ID,
          exchange: ticker.SOURCE_ID,
          quantity,
          orderType: price === '' ? '1' : '2', // 1 = market, 2 = limit
          orderSide: side,
          price: price === '' ? undefined : price,
          tif: 0,
          tradingSession: 'REG',
          orderValue: (price === '' ? 0 : price) * quantity,
          securityType: 'CS',
        })
      }}
    >
      <h3 className="text-lg font-semibold">{ticker.DISPLAY_TICKER} — {ticker.LONG_DESCRIPTION}</h3>

      <label className="flex flex-col gap-1 text-sm">
        Account number
        <input
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="e.g. P000128310"
          required
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSide(1)}
          className={`flex-1 rounded-md py-1 ${side === 1 ? 'bg-emerald-600' : 'bg-white/5'}`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide(2)}
          className={`flex-1 rounded-md py-1 ${side === 2 ? 'bg-rose-600' : 'bg-white/5'}`}
        >
          Sell
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Quantity
        <input
          type="number"
          min={1}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Limit price (blank = market order)
        <input
          type="number"
          step="0.01"
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1"
          value={price}
          onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </label>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-indigo-600 py-2 font-medium disabled:opacity-50"
      >
        {mutation.isPending ? 'Placing…' : 'Place order'}
      </button>

      {mutation.data && (
        <pre className="max-h-40 overflow-auto rounded-md bg-black/40 p-2 text-xs">
          {JSON.stringify(mutation.data, null, 2)}
        </pre>
      )}
      {mutation.isError && (
        <p className="text-sm text-red-400">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

import { useState } from 'react'
import WatchlistPanel from './components/WatchlistPanel'
import OrderForm from './components/OrderForm'
import EventFeed from './components/EventFeed'
import MarketSearch from './components/MarketSearch'
import TopMovers from './components/TopMovers'

export default function App() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#0b0e14] text-gray-100">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-semibold">GTN Trading — Sandbox</h1>
        <p className="text-xs text-gray-400">Institution: JAZIRAPOC</p>
      </header>

      <main className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
        <section className="rounded-lg border border-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Watchlist</h2>
          <WatchlistPanel listName="stocks" title="Watchlist" onSelect={setSelectedKey} />
        </section>

        <section className="rounded-lg border border-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Place order</h2>
          <OrderForm selectedKey={selectedKey} />
        </section>

        <section className="rounded-lg border border-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Trade events</h2>
          <EventFeed />
        </section>

        <section className="rounded-lg border border-white/10 p-4 md:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Markets — listing &amp; search</h2>
          <MarketSearch />
        </section>

        <section className="rounded-lg border border-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Indices</h2>
          <WatchlistPanel
            listName="indices"
            title="Indices"
            onSelect={setSelectedKey}
            emptyNote="No index instruments entitled to this sandbox institution (checked SPX/DJI/NDX/COMP/IXIC on NSDQ & NYSE — all zero matches). Add any symbol here via Markets search — it uses the same real lookup, so this works for any account that does have index entitlement."
          />
        </section>

        <section className="rounded-lg border border-white/10 p-4 md:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Top gainers / losers</h2>
          <TopMovers />
        </section>
      </main>
    </div>
  )
}

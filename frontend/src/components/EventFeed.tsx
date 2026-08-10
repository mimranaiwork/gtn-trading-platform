import { useTradeStream } from '../hooks/useTradeStream'

export default function EventFeed() {
  const { connected, events } = useTradeStream()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-gray-500'}`} />
        {connected ? 'Live' : 'Disconnected'}
      </div>
      <div className="flex max-h-64 flex-col gap-1 overflow-auto text-xs text-gray-400">
        {events.length === 0 && <p>No events yet.</p>}
        {events.map((e, i) => (
          <pre key={i} className="rounded bg-black/30 p-1">{e}</pre>
        ))}
      </div>
    </div>
  )
}

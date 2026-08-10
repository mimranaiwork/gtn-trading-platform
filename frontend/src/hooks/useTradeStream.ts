import { useEffect, useState } from 'react'

/** Subscribes to the backend's proxied GTN trade-event WebSocket feed. */
export function useTradeStream() {
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<string[]>([])

  useEffect(() => {
    const wsUrl = `${import.meta.env.VITE_API_URL.replace(/^http/, 'ws')}/ws/trade`
    let socket: WebSocket | null = null
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout>

    const connect = () => {
      if (cancelled) return
      socket = new WebSocket(wsUrl)

      socket.onopen = () => setConnected(true)
      socket.onclose = () => {
        setConnected(false)
        if (!cancelled) retryTimer = setTimeout(connect, 3000)
      }
      socket.onerror = () => socket?.close()
      socket.onmessage = (e) => setEvents((prev) => [e.data, ...prev].slice(0, 50))
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      socket?.close()
    }
  }, [])

  return { connected, events }
}

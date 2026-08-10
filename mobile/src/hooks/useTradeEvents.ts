import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../api/client'

export interface TradeEvent {
  id: string
  raw: string
  receivedAt: number
}

/** Same backend WS proxy (/ws/trade) the web app uses — see backend/docs/websocket-events.md. */
export function useTradeEvents() {
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<TradeEvent[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    const wsUrl = `${API_URL.replace(/^http/, 'ws')}/ws/trade`
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
      socket.onmessage = (e) => {
        idRef.current += 1
        setEvents((prev) => [{ id: String(idRef.current), raw: e.data, receivedAt: Date.now() }, ...prev].slice(0, 50))
      }
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

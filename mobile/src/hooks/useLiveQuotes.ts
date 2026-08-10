import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../api/client'
import type { Quote } from '../api/marketdata'

export function useLiveQuotes(keys: string[]) {
  const [connected, setConnected] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const keysParam = keys.join(',')

  useEffect(() => {
    if (!keysParam) {
      setQuotes([])
      return
    }

    const wsUrl = `${API_URL.replace(/^http/, 'ws')}/ws/quotes?keys=${encodeURIComponent(keysParam)}`
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
        try {
          const parsed = JSON.parse(e.data)
          if (Array.isArray(parsed?.quotes)) setQuotes(parsed.quotes)
        } catch {
          // ignore malformed frame
        }
      }
    }
    connect()
    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      socket?.close()
    }
  }, [keysParam])

  return { connected, quotes }
}

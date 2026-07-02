import { useCallback, useEffect, useRef, useState } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export default function useWebSocket(sessionId, studentId) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  useEffect(() => {
    if (!sessionId || !studentId) return undefined

    let cancelled = false

    const connect = () => {
      if (cancelled) return

      const token = localStorage.getItem('token')
      const url = `${WS_URL}/ws/${sessionId}/${studentId}${token ? `?token=${encodeURIComponent(token)}` : ''}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        if (!cancelled) {
          reconnectRef.current = setTimeout(connect, 2000)
        }
      }
      ws.onerror = () => setConnected(false)
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [sessionId, studentId])

  return { connected, send, wsRef }
}

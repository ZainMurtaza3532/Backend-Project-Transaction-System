import { useEffect, useState, useRef } from 'react'
import { API } from '../services/api'

export function useRealtime({ user, onEvent, onPollingTick }) {
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef(null)
  const pollIntervalRef = useRef(null)

  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      setIsConnected(false)
      return
    }

    const token = API.getToken()
    if (!token) return

    try {
      const sseUrl = '/api/transactions/stream'
      const eventSource = new EventSource(sseUrl, { withCredentials: true })
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (onEvent) onEvent(data)
        } catch (e) {}
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        // Fallback polling
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(() => {
            if (onPollingTick) onPollingTick()
          }, 8000)
        }
      }
    } catch (err) {
      setIsConnected(false)
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          if (onPollingTick) onPollingTick()
        }, 8000)
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [user, onEvent, onPollingTick])

  return { isConnected }
}

import { useEffect, useRef, useCallback } from 'react'

export function useWebSocket(onMensaje) {
  const wsRef = useRef(null)
  const reconectarRef = useRef(null)

  const conectar = useCallback(() => {
    const token = localStorage.getItem('wafeai_token')
    if (!token) return

    try {
      // URL desde variable de entorno — nunca hardcodeada
      const baseWs = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
        .replace(/^http/, 'ws')
      // Enviar token como query param — el backend lo valida antes de aceptar la conexión
      const ws = new WebSocket(`${baseWs}/api/alertas/ws?token=${encodeURIComponent(token)}`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.tipo !== 'ping' && onMensaje) onMensaje(data)
        } catch { /* ignorar mensajes malformados */ }
      }

      ws.onclose = () => {
        reconectarRef.current = setTimeout(conectar, 5000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch { /* ignorar errores de conexión */ }
  }, [onMensaje])

  useEffect(() => {
    conectar()
    return () => {
      clearTimeout(reconectarRef.current)
      wsRef.current?.close()
    }
  }, [conectar])
}

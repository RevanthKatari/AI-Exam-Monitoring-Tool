import { useEffect, useRef } from 'react'
import useWebRTC from '../hooks/useWebRTC'
import useWebSocket from '../hooks/useWebSocket'
import useAudioAnalyser from '../hooks/useAudioAnalyser'
import usePageVisibility from '../hooks/usePageVisibility'

export default function ExamPortal({ sessionId, studentId, durationMinutes, onPermissionDenied }) {
  const { stream, error, videoRef, start } = useWebRTC()
  const { connected, send } = useWebSocket(sessionId, studentId)
  const frameIntervalRef = useRef(null)

  useAudioAnalyser(stream, send)
  usePageVisibility(send)

  useEffect(() => {
    start().catch(() => {
      onPermissionDenied?.()
    })
  }, [start, onPermissionDenied])

  useEffect(() => {
    if (!stream || !send) return

    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')

    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return
      ctx.drawImage(videoRef.current, 0, 0, 320, 240)
      const frame = canvas.toDataURL('image/jpeg', 0.6)
      send({ type: 'frame', data: frame, timestamp: Date.now() })
    }, 1000)

    return () => clearInterval(frameIntervalRef.current)
  }, [stream, send, videoRef])

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute top-0 right-0 w-20 h-[60px] rounded border border-[var(--border)] object-cover z-10"
      />
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--ok-dot)]' : 'bg-[var(--danger-dot)]'}`}
        />
        <span className="text-xs text-[var(--text-2)]">
          {connected ? 'Monitoring active' : 'Connection lost'}
        </span>
      </div>
      {error && (
        <p className="text-xs text-[var(--danger-text)] mb-2">{error}</p>
      )}
    </div>
  )
}

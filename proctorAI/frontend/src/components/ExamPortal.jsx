import { useEffect, useRef } from 'react'
import useWebRTC from '../hooks/useWebRTC'
import useWebSocket from '../hooks/useWebSocket'
import useAudioAnalyser from '../hooks/useAudioAnalyser'
import usePageVisibility from '../hooks/usePageVisibility'
import apiClient from '../api/client'

const ID_PHOTO_REFRESH_MS = 10000

export default function ExamPortal({ sessionId, studentId, onPermissionDenied }) {
  const { stream, error, videoRef, start } = useWebRTC()
  const { connected, send } = useWebSocket(sessionId, studentId)
  const frameIntervalRef = useRef(null)
  const idPhotoIntervalRef = useRef(null)

  useAudioAnalyser(stream, send)
  usePageVisibility(send)

  useEffect(() => {
    start().catch(() => {
      onPermissionDenied?.()
    })
  }, [start, onPermissionDenied])

  // Refresh the ID-verification photo periodically for the whole exam, reusing the
  // stream already granted for proctoring instead of asking for camera access a
  // second time. Refreshing (rather than capturing once) matters because the very
  // first frame right after getUserMedia resolves is sometimes still black/blank
  // on some cameras — the next capture 10s later self-heals that automatically.
  useEffect(() => {
    if (!stream) return undefined

    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')

    const capture = () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      ctx.drawImage(video, 0, 0, 320, 240)
      const photo = canvas.toDataURL('image/jpeg', 0.8)
      apiClient.post(`/api/exams/${sessionId}/attempt/id-photo`, { student_id: studentId, photo }).catch(() => {})
    }

    capture()
    idPhotoIntervalRef.current = setInterval(capture, ID_PHOTO_REFRESH_MS)
    return () => clearInterval(idPhotoIntervalRef.current)
  }, [stream, sessionId, studentId, videoRef])

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
    <div className="flex items-center gap-2.5">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-14 h-10 rounded border border-[var(--border)] object-cover shrink-0"
      />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[var(--ok-dot)]' : 'bg-[var(--danger-dot)]'}`} />
          <span className="text-[11px] text-[var(--text-2)] whitespace-nowrap">
            {connected ? 'Monitoring active' : 'Connection lost'}
          </span>
        </div>
        {error && <p className="text-[10px] text-[var(--danger-text)]">{error}</p>}
      </div>
    </div>
  )
}

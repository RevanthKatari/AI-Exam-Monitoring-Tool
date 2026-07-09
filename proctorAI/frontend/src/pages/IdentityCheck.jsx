import { useEffect, useRef, useState } from 'react'
import useWebRTC from '../hooks/useWebRTC'
import apiClient from '../api/client'

// Continuously refreshes a "latest good frame" buffer while the camera is live, so
// capturing a photo never grabs a blank/black frame from the moment right after
// getUserMedia resolves (before the video element has actually painted pixels).
const FRAME_BUFFER_INTERVAL_MS = 300

export default function IdentityCheck({ sessionId, studentId, referencePhoto, onVerified }) {
  const { stream, error, videoRef, start } = useWebRTC()
  const canvasRef = useRef(document.createElement('canvas'))
  const latestFrameRef = useRef(null)
  const bufferIntervalRef = useRef(null)

  const [captured, setCaptured] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    start().catch(() => {})
  }, [start])

  useEffect(() => {
    if (!stream) return undefined

    const canvas = canvasRef.current
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')

    bufferIntervalRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      ctx.drawImage(video, 0, 0, 320, 240)
      latestFrameRef.current = canvas.toDataURL('image/jpeg', 0.85)
    }, FRAME_BUFFER_INTERVAL_MS)

    return () => clearInterval(bufferIntervalRef.current)
  }, [stream, videoRef])

  const handleCapture = () => {
    if (latestFrameRef.current) {
      setCaptured(latestFrameRef.current)
    }
  }

  const handleRetake = () => setCaptured(null)

  const handleConfirm = async () => {
    if (!captured) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await apiClient.post(`/api/exams/${sessionId}/attempt/id-photo`, {
        student_id: studentId,
        photo: captured,
      })
      onVerified(captured)
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Could not save your photo. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-3)] p-6">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-md w-full">
        <h1 className="text-base font-medium text-[var(--text)] mb-1">Identity verification</h1>
        <p className="text-xs text-[var(--text-2)] mb-4">
          Before you can start, take a clear photo of your face. Your instructor will compare it against your
          roster photo before or during the exam.
        </p>

        {error && (
          <div className="mb-4 p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[var(--radius-sm)]">
            Camera access is required to verify your identity: {error}. Please allow camera permissions and
            reload this page.
          </div>
        )}

        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1.5">
              {captured ? 'Your photo' : 'Live camera'}
            </div>
            {captured ? (
              <img src={captured} alt="Captured" className="w-full aspect-[4/3] rounded-[var(--radius-sm)] object-cover border border-[var(--border)]" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full aspect-[4/3] rounded-[var(--radius-sm)] object-cover border border-[var(--border)] bg-black"
              />
            )}
          </div>
          {referencePhoto && (
            <div className="w-24 shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1.5">Roster photo</div>
              <img src={referencePhoto} alt="Reference" className="w-24 h-24 rounded-[var(--radius-sm)] object-cover border border-[var(--border)]" />
            </div>
          )}
        </div>

        {submitError && <p className="text-xs text-[var(--danger-text)] mb-3">{submitError}</p>}

        {captured ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-medium bg-[#1d9e75] text-white rounded-[var(--radius-sm)] hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Confirm & continue'}
            </button>
            <button
              type="button"
              onClick={handleRetake}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-medium bg-[var(--bg-3)] text-[var(--text)] rounded-[var(--radius-sm)] disabled:opacity-60"
            >
              Retake
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCapture}
            disabled={!stream}
            className="w-full py-2.5 text-sm font-medium bg-[#1d9e75] text-white rounded-[var(--radius-sm)] hover:opacity-90 disabled:opacity-60"
          >
            {stream ? 'Capture photo' : 'Waiting for camera…'}
          </button>
        )}
      </div>
    </div>
  )
}

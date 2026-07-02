import { useCallback, useEffect, useRef, useState } from 'react'

export default function useWebRTC() {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const videoRef = useRef(null)

  const start = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setError(null)
      return mediaStream
    } catch (err) {
      setError(err.message || 'Camera permission denied')
      throw err
    }
  }, [])

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  return { stream, error, videoRef, start }
}

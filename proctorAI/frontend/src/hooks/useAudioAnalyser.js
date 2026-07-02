import { useEffect, useRef } from 'react'

export default function useAudioAnalyser(stream, send) {
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!stream || !send) return

    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    intervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      const db = Math.round(avg)
      send({ type: 'audio', db, timestamp: Date.now() })
    }, 500)

    return () => {
      clearInterval(intervalRef.current)
      source.disconnect()
      audioCtx.close()
    }
  }, [stream, send])
}

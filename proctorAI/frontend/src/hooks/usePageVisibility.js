import { useEffect } from 'react'

export default function usePageVisibility(send) {
  useEffect(() => {
    if (!send) return

    const onVisibility = () => {
      if (document.hidden) {
        send({ type: 'tab_switch', timestamp: Date.now() })
      }
    }

    const onBlur = () => {
      send({ type: 'window_blur', timestamp: Date.now() })
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [send])
}

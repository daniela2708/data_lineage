import { useCallback, useEffect, useRef, useState } from 'react'

export interface FlowTimeline {
  /** Current position on the timeline, in milliseconds. */
  t: number
  playing: boolean
  speed: 1 | 2
  toggle: () => void
  restart: () => void
  toggleSpeed: () => void
  /** Jump to a moment and stop, used when a step is clicked. */
  jump: (ms: number) => void
  pause: () => void
}

/**
 * Drives the chain animation with a single requestAnimationFrame loop and loops
 * back to the start. Honours prefers-reduced-motion by holding the finished
 * chain still instead of animating it.
 */
export function useFlowTimeline(total: number, enabled: boolean): FlowTimeline {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [t, setT] = useState(reduceMotion ? total : 0)
  const [playing, setPlaying] = useState(!reduceMotion)
  const [speed, setSpeed] = useState<1 | 2>(1)

  const raf = useRef(0)
  const last = useRef(0)
  const time = useRef(t)
  time.current = t

  useEffect(() => {
    if (!playing || !enabled) return
    last.current = 0

    const step = (ts: number) => {
      if (!last.current) last.current = ts
      // Clamped so a backgrounded tab does not jump the whole chain at once.
      const dt = Math.min(120, ts - last.current)
      last.current = ts
      const next = time.current + dt * speed
      setT(next >= total ? 0 : next)
      raf.current = requestAnimationFrame(step)
    }

    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, enabled, speed, total])

  const toggle = useCallback(() => setPlaying((p) => !p), [])
  const pause = useCallback(() => setPlaying(false), [])
  const restart = useCallback(() => {
    setT(0)
    setPlaying(true)
  }, [])
  const toggleSpeed = useCallback(() => setSpeed((s) => (s === 1 ? 2 : 1)), [])
  const jump = useCallback((ms: number) => {
    setPlaying(false)
    setT(Math.max(0, Math.min(total, ms)))
  }, [total])

  return { t, playing, speed, toggle, restart, toggleSpeed, jump, pause }
}

import { useRef, useCallback } from 'react'

export function useAudio(enabled = true) {
  const audioCtxRef = useRef(null)

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current && window.AudioContext) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      } catch (e) {}
    }
  }, [])

  const playTone = useCallback((type = 'success') => {
    if (!enabled) return
    try {
      initAudio()
      const ctx = audioCtxRef.current
      if (!ctx) return
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime

      if (type === 'success') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, now) // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5
        gain.gain.setValueAtTime(0.12, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
        osc.start(now)
        osc.stop(now + 0.35)
      } else if (type === 'receive') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(523.25, now) // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1) // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2) // G5
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
        osc.start(now)
        osc.stop(now + 0.45)
      } else if (type === 'error') {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(220, now)
        osc.frequency.linearRampToValueAtTime(110, now + 0.2)
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
        osc.start(now)
        osc.stop(now + 0.25)
      }
    } catch (e) {}
  }, [enabled, initAudio])

  return { playTone }
}

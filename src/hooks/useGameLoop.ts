import { useEffect, useRef } from 'react'

export const useGameLoop = (callback: (delta: number) => void) => {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    let frameId = 0
    let lastTime = performance.now()

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000
      lastTime = time
      callbackRef.current(delta)
      frameId = window.requestAnimationFrame(loop)
    }

    frameId = window.requestAnimationFrame(loop)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [])
}

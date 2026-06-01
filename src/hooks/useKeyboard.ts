import { useEffect, useRef } from 'react'

import type { InputState } from '../game/types'

const createEmptyInput = (): InputState => ({
  up: false,
  down: false,
  left: false,
  right: false,
})

const mapKey = (key: string, nextState: boolean, input: InputState) => {
  if (key === 'w' || key === 'arrowup') {
    input.up = nextState
  }

  if (key === 's' || key === 'arrowdown') {
    input.down = nextState
  }

  if (key === 'a' || key === 'arrowleft') {
    input.left = nextState
  }

  if (key === 'd' || key === 'arrowright') {
    input.right = nextState
  }
}

export const useKeyboard = () => {
  const inputRef = useRef<InputState>(createEmptyInput())

  useEffect(() => {
    const onKey = (pressed: boolean) => (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      mapKey(key, pressed, inputRef.current)
    }

    const handleBlur = () => {
      inputRef.current = createEmptyInput()
    }

    const keydown = onKey(true)
    const keyup = onKey(false)

    window.addEventListener('keydown', keydown, true)
    window.addEventListener('keyup', keyup, true)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', keydown, true)
      window.removeEventListener('keyup', keyup, true)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  return inputRef
}

import type { Facing, Vector2 } from '../game/types'

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

export const length = (vector: Vector2) => {
  return Math.hypot(vector.x, vector.y)
}

export const distance = (a: Vector2, b: Vector2) => {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export const normalize = (vector: Vector2): Vector2 => {
  const magnitude = length(vector)
  if (magnitude === 0) {
    return { x: 0, y: 0 }
  }

  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  }
}

export const add = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
})

export const scale = (vector: Vector2, amount: number): Vector2 => ({
  x: vector.x * amount,
  y: vector.y * amount,
})

export const rotate = (vector: Vector2, angle: number): Vector2 => ({
  x: vector.x * Math.cos(angle) - vector.y * Math.sin(angle),
  y: vector.x * Math.sin(angle) + vector.y * Math.cos(angle),
})

export const dominantFacing = (vector: Vector2): Facing => {
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x >= 0 ? 'right' : 'left'
  }

  return vector.y >= 0 ? 'down' : 'up'
}

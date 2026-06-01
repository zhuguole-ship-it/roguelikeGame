export const randomBetween = (min: number, max: number) => {
  return min + Math.random() * (max - min)
}

export const randomInt = (min: number, max: number) => {
  return Math.floor(randomBetween(min, max + 1))
}

export const sample = <T,>(items: T[]) => {
  return items[randomInt(0, items.length - 1)]
}

export const shuffle = <T,>(items: T[]) => {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index)
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

export const sampleSize = <T,>(items: T[], size: number) => {
  return shuffle(items).slice(0, Math.max(0, size))
}

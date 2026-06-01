import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GameHud } from './GameHud'

describe('GameHud', () => {
  it('renders nothing after growth panel moves into the top status bar', () => {
    const { container } = render(<GameHud />)

    expect(container.firstChild).toBeNull()
  })
})

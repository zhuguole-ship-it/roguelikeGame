import { GameCanvas } from '../components/game/GameCanvas'
import { useEffect } from 'react'
import { attachGameButtonAudio } from '../game/gameButtonAudio'
import { useGameStore } from '../store/useGameStore'

export function GamePage() {
  useEffect(() => attachGameButtonAudio(() => useGameStore.getState().audioSettings), [])
  return (
    <main className="flex h-screen w-screen overflow-hidden text-[#f4f0d7]">
      <GameCanvas />
    </main>
  )
}

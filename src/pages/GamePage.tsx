import { GameCanvas } from '../components/game/GameCanvas'

export function GamePage() {
  return (
    <main className="flex h-screen w-screen overflow-hidden text-[#f4f0d7]">
      <GameCanvas />
    </main>
  )
}

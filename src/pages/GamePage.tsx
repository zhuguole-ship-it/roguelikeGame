import { GameCanvas } from '../components/game/GameCanvas'

export function GamePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1720px] flex-col px-4 py-6 text-[#f4f0d7] md:px-6 md:py-8">
      <GameCanvas />
    </main>
  )
}

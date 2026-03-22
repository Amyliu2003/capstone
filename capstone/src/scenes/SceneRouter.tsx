import { useState } from 'react'
import { GameStateProvider } from '../context/GameState'
import { GameScene } from './GameScene'
import { IntroScene } from '../components/IntroScene'

export function SceneRouter() {
  const [started, setStarted] = useState(false)

  return (
    <GameStateProvider>
      {!started ? (
        <IntroScene onStart={() => setStarted(true)} />
      ) : (
        <GameScene onRestartToIntro={() => setStarted(false)} />
      )}
    </GameStateProvider>
  )
}


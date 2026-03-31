import { useMemo, useState } from 'react'
import { IntroScene3D } from '../features/Intro/IntroScene3D'
import { SceneHost } from '../layout/SceneHost'
import { DialogueSequence, type DialogueLine } from './DialogueSequence'
import { HandCustomizationOverlay, type AgentParams } from './HandCustomizationOverlay'
import { useGameState } from '../context/GameState'

export type IntroSceneProps = {
  onStart: () => void
}

export function IntroScene({ onStart }: IntroSceneProps) {
  const { agentParams, setAgentParams } = useGameState()
  const [stage, setStage] = useState<
    'idle' | 'suck1' | 'seq1' | 'customize' | 'seq1_after' | 'suck2' | 'seq2' | 'done'
  >('idle')
  const [mirrorSuckRequestId, setMirrorSuckRequestId] = useState(0)

  const seq1 = useMemo<DialogueLine[]>(
    () => [
      { speaker: 'llorrac', text: 'The closer you get, the less you can see.' },
      { speaker: 'H.D.', text: 'Wait.' },
      { speaker: 'H.D.', text: 'Who are you? You must know yourself before you come in.' },
    ],
    [],
  )

  const seq1After = useMemo<DialogueLine[]>(() => [{ speaker: 'H.D.', text: 'Very good. Very you.' }], [])

  const seq2 = useMemo<DialogueLine[]>(
    () => [
      { speaker: 'H.D.', text: 'There.' },
      { speaker: 'H.D.', text: "Now you're one of ours." },
      { speaker: 'H.D.', text: 'You see that? The eighth square.' },
      { speaker: 'H.D.', text: 'Reach it, and you become a Queen.' },
      { speaker: 'H.D.', text: 'Simple, really.' },
      { speaker: 'H.D.', text: 'You just have to run fast enough.' },
    ],
    [],
  )

  return (
    <SceneHost>
      <IntroScene3D
        handGlbPath="/fps-hands.glb"
        handSide="left"
        allowMirrorClickToSuck={stage === 'idle'}
        mirrorSuckRequestId={mirrorSuckRequestId}
        onMirrorSuckComplete={() => {
          if (stage === 'idle' || stage === 'suck1') setStage('seq1')
          else if (stage === 'suck2') setStage('seq2')
        }}
      />

      {/* Start: only the garden/mirror. Clicking the mirror triggers the first suck animation. */}

      {stage === 'seq1' && <DialogueSequence lines={seq1} onDone={() => setStage('customize')} />}

      <HandCustomizationOverlay
        visible={stage === 'customize'}
        initial={agentParams as AgentParams}
        onConfirm={(params) => {
          setAgentParams(params)
          setStage('seq1_after')
        }}
      />

      {stage === 'seq1_after' && (
        <DialogueSequence
          lines={seq1After}
          onDone={() => {
            // Mirror flip: auto suck (no click) after customization confirm.
            setStage('suck2')
            setMirrorSuckRequestId((v) => v + 1)
          }}
        />
      )}

      {stage === 'seq2' &&
        <DialogueSequence
          lines={seq2}
          onDone={() => {
            setStage('done')
            onStart()
          }}
        />}
    </SceneHost>
  )
}

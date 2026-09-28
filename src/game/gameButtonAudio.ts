import { playGameSound, setGameButtonActivationInProgress, stopUiSoundInstances, syncUiSoundVolume } from './audio'
import type { AudioSettings } from './types'

let activation: Event | null = null

/** Capture brackets React/Store handlers; one native click covers mouse, Enter and Space. */
export const attachGameButtonAudio = (
  getSettings: () => AudioSettings,
  root: Document = document,
) => {
  const capture = (event: Event) => {
    const target = event.target instanceof Element ? event.target.closest('button, [role="button"]') : null
    if (!target || root.hidden || target.matches(':disabled, [aria-disabled="true"]') || target.closest('[inert]')) return
    activation = event
    setGameButtonActivationInProgress(true)
    playGameSound('button', getSettings(), { domActivation: true })
    queueMicrotask(() => { if (activation === event) { activation = null; setGameButtonActivationInProgress(false) } })
  }
  const release = (event: Event) => {
    if (activation === event) { activation = null; setGameButtonActivationInProgress(false) }
  }
  const visibility = () => { if (root.hidden) stopUiSoundInstances() }
  root.addEventListener('click', capture, true)
  root.addEventListener('click', release)
  root.addEventListener('visibilitychange', visibility)
  syncUiSoundVolume(getSettings())
  return () => {
    root.removeEventListener('click', capture, true)
    root.removeEventListener('click', release)
    root.removeEventListener('visibilitychange', visibility)
    activation = null
    setGameButtonActivationInProgress(false)
    stopUiSoundInstances()
  }
}

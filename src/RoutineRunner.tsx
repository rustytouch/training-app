import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import type { Routine, QueueItem, SessionRecord, LogEntry } from './types'
import { flattenRoutine } from './flattenRoutine'
import { saveSession } from './db'

interface Props {
  routine: Routine
  onExit: () => void
}

type Screen = 'work' | 'rest' | 'complete' | 'confirmExit'

function playTone() {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gain.gain.value = 0.3

    oscillator.start()
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch {
    // Audio not available
  }
}

function formatSide(side: 'none' | 'left' | 'right'): string {
  if (side === 'left') return 'Left side'
  if (side === 'right') return 'Right side'
  return ''
}

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function RoutineRunner({ routine, onExit }: Props) {
  const [queue] = useState<QueueItem[]>(() => flattenRoutine(routine))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [screen, setScreen] = useState<Screen>('work')
  const [countdown, setCountdown] = useState(() => {
    const first = queue[0]
    return first?.work.mode === 'time' ? (first.work.seconds ?? 0) : 0
  })
  const [timerRunning, setTimerRunning] = useState(false)
  const [restCountdown, setRestCountdown] = useState(0)
  const [startedAt] = useState(() => new Date().toISOString())
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [entries] = useState<LogEntry[]>([])
  const [saving, setSaving] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const current = queue[currentIndex]
  const isLastItem = currentIndex === queue.length - 1
  const isFirstItem = currentIndex === 0
  const isTimed = current?.work.mode === 'time'

  // Use refs to access current values in timer callbacks without causing re-renders
  const stateRef = useRef({ currentIndex, screen, queue, isLastItem, current })
  useLayoutEffect(() => {
    stateRef.current = { currentIndex, screen, queue, isLastItem, current }
  })

  function advanceFromWork() {
    const { currentIndex: idx, queue: q, isLastItem: isLast, current: cur } = stateRef.current
    if (isLast) {
      setCompletedAt(new Date().toISOString())
      setScreen('complete')
      return
    }

    const nextItem = q[idx + 1]
    const needsRest =
      cur.restSeconds > 0 &&
      nextItem &&
      nextItem.stepId === cur.stepId

    if (needsRest) {
      setRestCountdown(cur.restSeconds)
      setScreen('rest')
    } else {
      const nextCurrent = q[idx + 1]
      setCurrentIndex((i) => i + 1)
      setCountdown(nextCurrent?.work.seconds ?? 0)
      setTimerRunning(false)
      setScreen('work')
    }
  }

  function advanceFromRest() {
    const { currentIndex: idx, queue: q } = stateRef.current
    const nextCurrent = q[idx + 1]
    setCurrentIndex((i) => i + 1)
    setCountdown(nextCurrent?.work.seconds ?? 0)
    setTimerRunning(false)
    setScreen('work')
  }

  // Acquire wake lock on mount, release on unmount or complete
  useEffect(() => {
    async function acquireWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        } catch {
          // Wake lock not available or denied
        }
      }
    }
    acquireWakeLock()

    return () => {
      wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [])

  // Release wake lock when routine completes
  useEffect(() => {
    if (screen === 'complete') {
      wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [screen])

  // Countdown timer for work (only when timerRunning is true)
  useEffect(() => {
    if (screen !== 'work' || !timerRunning || countdown <= 0) {
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          playTone()
          advanceFromWork()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [screen, timerRunning, countdown])

  // Rest countdown timer
  useEffect(() => {
    if (screen !== 'rest' || restCountdown <= 0) {
      return
    }

    const timer = setInterval(() => {
      setRestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          playTone()
          advanceFromRest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [screen, restCountdown])

  function handleStart() {
    setTimerRunning(true)
  }

  function handleNext() {
    setTimerRunning(false)
    advanceFromWork()
  }

  function handleDone() {
    advanceFromWork()
  }

  function handleBack() {
    if (screen === 'rest') {
      setScreen('work')
      setCountdown(current?.work.seconds ?? 0)
      setTimerRunning(false)
      return
    }
    if (currentIndex > 0) {
      const prevCurrent = queue[currentIndex - 1]
      setCurrentIndex((i) => i - 1)
      setCountdown(prevCurrent?.work.seconds ?? 0)
      setTimerRunning(false)
      setScreen('work')
    }
  }

  function handleSkipRest() {
    advanceFromRest()
  }

  function handleFinishEarly() {
    setScreen('confirmExit')
  }

  function handleConfirmFinishEarly() {
    setCompletedAt(new Date().toISOString())
    setScreen('complete')
  }

  function handleCancelFinishEarly() {
    setScreen('work')
  }

  async function handleSaveSession(completed: 'full' | 'early') {
    setSaving(true)
    const session: SessionRecord = {
      sessionId: startedAt,
      routineId: routine.id,
      routineVersion: routine.version,
      variantId: null,
      startedAt,
      completedAt: completedAt ?? new Date().toISOString(),
      completed,
      stepsCompleted: currentIndex + 1,
      stepsTotal: queue.length,
      entries,
      note: note.trim(),
    }
    await saveSession(session)
    setSaving(false)
    onExit()
  }

  const elapsedMs = completedAt
    ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
    : 0

  // Confirm exit screen
  if (screen === 'confirmExit') {
    return (
      <div className="runner-screen confirm-screen">
        <div className="content">
          <h1>Finish early?</h1>
          <p className="confirm-text">
            You've completed {currentIndex + 1} of {queue.length} steps.
          </p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="action-button secondary"
            onClick={handleCancelFinishEarly}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            onClick={handleConfirmFinishEarly}
          >
            Finish
          </button>
        </div>
      </div>
    )
  }

  // Complete screen
  if (screen === 'complete') {
    const isEarly = currentIndex < queue.length - 1
    return (
      <div className="runner-screen complete-screen">
        <h1>Done</h1>
        <p className="routine-name">{routine.name}</p>
        <p className="elapsed-time">{formatElapsedTime(elapsedMs)}</p>
        <input
          type="text"
          className="note-input"
          placeholder="Add a note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
        />
        <button
          type="button"
          className="action-button"
          onClick={() => handleSaveSession(isEarly ? 'early' : 'full')}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Done'}
        </button>
      </div>
    )
  }

  // Rest screen
  if (screen === 'rest') {
    return (
      <div className="runner-screen rest-screen">
        <header className="runner-header">
          <button type="button" className="exit-button" onClick={handleFinishEarly}>
            Finish early
          </button>
          <h2 className="routine-title">{routine.name}</h2>
        </header>

        <div className="content">
          <h1 className="step-name">Rest</h1>
          <p className="countdown">{restCountdown}</p>
        </div>

        <div className="button-row">
          <button type="button" className="action-button secondary" onClick={handleBack}>
            Back
          </button>
          <button type="button" className="action-button" onClick={handleSkipRest}>
            Skip
          </button>
        </div>
      </div>
    )
  }

  // Work screen
  const repLabel = current.work.label ?? 'reps'

  return (
    <div className="runner-screen work-screen">
      <header className="runner-header">
        <button type="button" className="exit-button" onClick={handleFinishEarly}>
          Finish early
        </button>
        <h2 className="routine-title">{routine.name}</h2>
      </header>

      <div className="content">
        <div className="primary-info">
          <h1 className="step-name">{current.stepName}</h1>
          {isTimed ? (
            <p className="countdown">{countdown}</p>
          ) : (
            <p className="reps">
              {current.work.reps} {repLabel}
            </p>
          )}
        </div>

        <div className="secondary-info">
          <p className="side-indicator">{current.side !== 'none' ? formatSide(current.side) : '\u00A0'}</p>
          <p className="set-indicator">Set {current.setNumber} of {current.totalSets}</p>
          <p className="tempo-indicator">{current.work.tempo ? `Tempo: ${current.work.tempo}` : '\u00A0'}</p>
        </div>

        <p className="cue">{current.cue}</p>
      </div>

      <div className="button-row">
        {!isFirstItem && (
          <button type="button" className="action-button secondary" onClick={handleBack}>
            Back
          </button>
        )}
        {isTimed ? (
          timerRunning ? (
            <button type="button" className="action-button" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button type="button" className="action-button" onClick={handleStart}>
              Start
            </button>
          )
        ) : (
          <button type="button" className="action-button" onClick={handleDone}>
            Done
          </button>
        )}
      </div>
    </div>
  )
}

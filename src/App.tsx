import { useState, useMemo } from 'react'
import './App.css'
import { RoutineRunner } from './RoutineRunner'
import { RoutineList } from './RoutineList'
import { History } from './History'
import type { Routine } from './types'

const routineModules = import.meta.glob<{ default: Routine }>(
  '../routines/*.json',
  { eager: true }
)

const routines: Routine[] = Object.values(routineModules).map((m) => m.default)

type Screen = 'list' | 'runner' | 'history'

function App() {
  const [screen, setScreen] = useState<Screen>('list')
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)

  const routineMap = useMemo(() => {
    const map = new Map<string, Routine>()
    for (const r of routines) {
      map.set(r.id, r)
    }
    return map
  }, [])

  function handleSelectRoutine(routine: Routine) {
    setSelectedRoutine(routine)
    setScreen('runner')
  }

  function handleExitRunner() {
    setSelectedRoutine(null)
    setScreen('list')
  }

  function handleOpenHistory() {
    setScreen('history')
  }

  function handleCloseHistory() {
    setScreen('list')
  }

  if (screen === 'runner' && selectedRoutine) {
    return <RoutineRunner routine={selectedRoutine} onExit={handleExitRunner} />
  }

  if (screen === 'history') {
    return <History routines={routineMap} onBack={handleCloseHistory} />
  }

  return (
    <RoutineList
      routines={routines}
      onSelect={handleSelectRoutine}
      onOpenHistory={handleOpenHistory}
    />
  )
}

export default App

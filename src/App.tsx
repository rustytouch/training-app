import { useState } from 'react'
import './App.css'
import { RoutineRunner } from './RoutineRunner'
import { RoutineList } from './RoutineList'
import type { Routine } from './types'

function App() {
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)

  if (selectedRoutine) {
    return (
      <RoutineRunner
        routine={selectedRoutine}
        onExit={() => setSelectedRoutine(null)}
      />
    )
  }

  return <RoutineList onSelect={setSelectedRoutine} />
}

export default App

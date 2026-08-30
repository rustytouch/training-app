import type { Routine } from './types'

interface Props {
  routines: Routine[]
  onSelect: (routine: Routine) => void
  onOpenHistory: () => void
}

export function RoutineList({ routines, onSelect, onOpenHistory }: Props) {
  return (
    <div className="routine-list-screen">
      <header className="list-header">
        <h1>Routines</h1>
        <button type="button" className="history-link" onClick={onOpenHistory}>
          History
        </button>
      </header>
      <ul className="routine-list">
        {routines.map((routine) => (
          <li key={routine.id}>
            <button
              type="button"
              className="routine-item"
              onClick={() => onSelect(routine)}
            >
              <span className="routine-item-name">{routine.name}</span>
              <span className="routine-item-meta">
                {routine.estimatedMinutes} min
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

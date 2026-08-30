import type { Routine } from './types'

const routineModules = import.meta.glob<{ default: Routine }>(
  '../routines/*.json',
  { eager: true }
)

const routines: Routine[] = Object.values(routineModules).map((m) => m.default)

interface Props {
  onSelect: (routine: Routine) => void
}

export function RoutineList({ onSelect }: Props) {
  return (
    <div className="routine-list-screen">
      <h1>Routines</h1>
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

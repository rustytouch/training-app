import { useState, useEffect } from 'react'
import type { SessionRecord, Routine } from './types'
import { getAllSessions } from './db'

interface Props {
  routines: Map<string, Routine>
  onBack: () => void
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatElapsedTime(startedAt: string, completedAt: string): string {
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getDateKey(isoString: string): string {
  return isoString.slice(0, 10)
}

function calculateStreak(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0

  const uniqueDates = new Set(sessions.map((s) => getDateKey(s.completedAt)))
  const sortedDates = Array.from(uniqueDates).sort().reverse()

  if (sortedDates.length === 0) return 0

  const today = getDateKey(new Date().toISOString())
  const yesterday = getDateKey(new Date(Date.now() - 86400000).toISOString())

  // Streak must include today or yesterday
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0
  }

  let streak = 1
  let currentDate = new Date(sortedDates[0])

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(currentDate.getTime() - 86400000)
    const prevDateKey = getDateKey(prevDate.toISOString())

    if (sortedDates[i] === prevDateKey) {
      streak++
      currentDate = prevDate
    } else {
      break
    }
  }

  return streak
}

async function exportSessions(sessions: SessionRecord[]) {
  const json = JSON.stringify(sessions, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const file = new File([blob], 'training-sessions.json', { type: 'application/json' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Training Sessions',
      })
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(json)
    alert('Copied to clipboard')
  } catch {
    // Final fallback: download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'training-sessions.json'
    a.click()
    URL.revokeObjectURL(url)
  }
}

export function History({ routines, onBack }: Props) {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllSessions().then((data) => {
      // Sort newest first
      data.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      setSessions(data)
      setLoading(false)
    })
  }, [])

  const streak = calculateStreak(sessions)

  function handleExport() {
    exportSessions(sessions)
  }

  return (
    <div className="history-screen">
      <header className="history-header">
        <button type="button" className="back-link" onClick={onBack}>
          Back
        </button>
        <h1>History</h1>
        <button
          type="button"
          className="export-button"
          onClick={handleExport}
          disabled={sessions.length === 0}
        >
          Export
        </button>
      </header>

      <div className="streak-banner">
        <span className="streak-count">{streak}</span>
        <span className="streak-label">day streak</span>
      </div>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="empty-text">No sessions yet</p>
      ) : (
        <ul className="session-list">
          {sessions.map((session) => {
            const routine = routines.get(session.routineId)
            return (
              <li key={session.sessionId} className="session-item">
                <div className="session-date">{formatDate(session.completedAt)}</div>
                <div className="session-details">
                  <span className="session-routine">
                    {routine?.name ?? session.routineId}
                    {session.variantId && ` (${session.variantId})`}
                  </span>
                  <span className="session-time">
                    {formatElapsedTime(session.startedAt, session.completedAt)}
                  </span>
                </div>
                {session.completed === 'early' && (
                  <span className="session-early">Early</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

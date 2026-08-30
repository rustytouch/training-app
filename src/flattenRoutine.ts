import type { Routine, Step, QueueItem } from './types'

function flattenStep(step: Step): QueueItem[] {
  const items: QueueItem[] = []

  if (step.sides === 'none' || step.sides === 'alternating') {
    // For 'none' and 'alternating', we run sets without side distinction
    // 'alternating' means the movement alternates within the set, not separate queue items
    for (let i = 1; i <= step.sets; i++) {
      items.push({
        stepId: step.id,
        stepName: step.name,
        cue: step.cue,
        side: 'none',
        setNumber: i,
        totalSets: step.sets,
        work: step.work,
        restSeconds: step.restSeconds,
        isLastSetOfStep: i === step.sets,
        log: step.log,
      })
    }
  } else if (step.sides === 'leftRight') {
    // Run all sets on left, then all on right
    // Extra sets are appended to the relevant side
    const leftExtra = step.extraSets?.left ?? 0
    const rightExtra = step.extraSets?.right ?? 0
    const leftTotal = step.sets + leftExtra
    const rightTotal = step.sets + rightExtra

    // Left side sets
    for (let i = 1; i <= leftTotal; i++) {
      items.push({
        stepId: step.id,
        stepName: step.name,
        cue: step.cue,
        side: 'left',
        setNumber: i,
        totalSets: leftTotal,
        work: step.work,
        restSeconds: step.restSeconds,
        isLastSetOfStep: false,
        log: step.log,
      })
    }

    // Right side sets
    for (let i = 1; i <= rightTotal; i++) {
      items.push({
        stepId: step.id,
        stepName: step.name,
        cue: step.cue,
        side: 'right',
        setNumber: i,
        totalSets: rightTotal,
        work: step.work,
        restSeconds: step.restSeconds,
        isLastSetOfStep: false,
        log: step.log,
      })
    }

    // Mark the very last item of this step
    if (items.length > 0) {
      items[items.length - 1].isLastSetOfStep = true
    }
  }

  return items
}

export function flattenRoutine(routine: Routine): QueueItem[] {
  const allItems: QueueItem[] = []

  for (const step of routine.steps) {
    const stepItems = flattenStep(step)
    allItems.push(...stepItems)
  }

  return allItems
}

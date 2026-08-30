export interface Work {
  mode: 'time' | 'reps'
  seconds?: number
  reps?: number
  tempo?: string
  label?: string
}

export interface Load {
  equipment: 'bodyweight' | 'dumbbell' | 'kettlebell' | 'band'
  prescribed: string
}

export interface Step {
  id: string
  name: string
  cue: string
  sides: 'none' | 'leftRight' | 'alternating'
  sets: number
  extraSets?: Record<string, number>
  work: Work
  restSeconds: number
  load?: Load
  log: string[]
}

export interface Variant {
  id: string
  name: string
  includeSteps?: string[]
  overrides?: Record<string, Partial<Step>>
}

export interface Routine {
  id: string
  version: number
  name: string
  type: 'mobility' | 'strength'
  equipment: string[]
  estimatedMinutes: number
  steps: Step[]
  variants?: Variant[]
  notes?: string
}

export type Side = 'none' | 'left' | 'right'

export interface QueueItem {
  stepId: string
  stepName: string
  cue: string
  side: Side
  setNumber: number
  totalSets: number
  work: Work
  restSeconds: number
  isLastSetOfStep: boolean
}

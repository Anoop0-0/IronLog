import { describe, it, expect } from 'vitest'
import {
  getWeeklyVolume,
  getPersonalRecords,
  filterByDays,
  getTotalVolume,
  getTotalSets,
  getMostTrainedPart,
} from './progressHelpers'

const workout = (createdAt, exercises) => ({ createdAt, exercises })
const exercise = (name, bodyPart, sets) => ({ name, bodyPart, sets })

describe('getTotalVolume', () => {
  it('sums reps * weight across every set in every workout', () => {
    const workouts = [
      workout('2026-01-01', [exercise('Bench Press', 'Chest', [
        { reps: 5, weight: 100 },
        { reps: 5, weight: 100 },
      ])]),
      workout('2026-01-02', [exercise('Squat', 'Legs', [
        { reps: 10, weight: 80 },
      ])]),
    ]
    expect(getTotalVolume(workouts)).toBe(5 * 100 + 5 * 100 + 10 * 80)
  })

  it('treats missing/invalid reps or weight as 0 instead of throwing', () => {
    const workouts = [
      workout('2026-01-01', [exercise('Bench Press', 'Chest', [
        { reps: '', weight: 100 },
        { reps: 5, weight: 'not-a-number' },
      ])]),
    ]
    expect(getTotalVolume(workouts)).toBe(0)
  })

  it('returns 0 for an empty workout list', () => {
    expect(getTotalVolume([])).toBe(0)
  })
})

describe('getTotalSets', () => {
  it('counts every logged set across all exercises/workouts', () => {
    const workouts = [
      workout('2026-01-01', [
        exercise('Bench Press', 'Chest', [{ reps: 5, weight: 100 }, { reps: 5, weight: 100 }]),
        exercise('Squat', 'Legs', [{ reps: 10, weight: 80 }]),
      ]),
    ]
    expect(getTotalSets(workouts)).toBe(3)
  })
})

describe('getMostTrainedPart', () => {
  it('returns the body part logged most often', () => {
    const workouts = [
      workout('2026-01-01', [
        exercise('Bench Press', 'Chest', [{ reps: 5, weight: 100 }]),
        exercise('Squat', 'Legs', [{ reps: 10, weight: 80 }]),
      ]),
      workout('2026-01-02', [
        exercise('Incline Bench Press', 'Chest', [{ reps: 5, weight: 90 }]),
      ]),
    ]
    expect(getMostTrainedPart(workouts)).toBe('Chest')
  })

  it('returns a placeholder when there is no history', () => {
    expect(getMostTrainedPart([])).toBe('—')
  })
})

describe('getPersonalRecords', () => {
  it('keeps only the heaviest set ever logged per exercise', () => {
    const workouts = [
      workout('2026-01-01', [exercise('Bench Press', 'Chest', [{ reps: 5, weight: 80 }])]),
      workout('2026-01-05', [exercise('Bench Press', 'Chest', [{ reps: 3, weight: 100 }])]),
      workout('2026-01-10', [exercise('Bench Press', 'Chest', [{ reps: 8, weight: 60 }])]),
    ]
    const records = getPersonalRecords(workouts)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ exercise: 'Bench Press', weight: 100, reps: 3 })
  })

  it('sorts records by weight descending', () => {
    const workouts = [
      workout('2026-01-01', [exercise('Squat', 'Legs', [{ reps: 5, weight: 120 }])]),
      workout('2026-01-01', [exercise('Curl', 'Arms', [{ reps: 5, weight: 20 }])]),
    ]
    const records = getPersonalRecords(workouts)
    expect(records.map(r => r.exercise)).toEqual(['Squat', 'Curl'])
  })
})

describe('filterByDays', () => {
  it('keeps only workouts within the last N days', () => {
    const now = new Date()
    const recent = new Date(now); recent.setDate(now.getDate() - 2)
    const old    = new Date(now); old.setDate(now.getDate() - 40)

    const workouts = [
      workout(recent.toISOString(), []),
      workout(old.toISOString(), []),
    ]
    const filtered = filterByDays(workouts, 30)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].createdAt).toBe(recent.toISOString())
  })
})

describe('getWeeklyVolume', () => {
  it('groups volume by the Monday of each workout week', () => {
    const workouts = [
      workout('2026-06-01T10:00:00.000Z', [exercise('Bench Press', 'Chest', [{ reps: 5, weight: 100 }])]), // Monday
      workout('2026-06-03T10:00:00.000Z', [exercise('Squat', 'Legs', [{ reps: 5, weight: 100 }])]),         // same week
    ]
    const result = getWeeklyVolume(workouts)
    expect(result).toHaveLength(1)
    expect(result[0].volume).toBe(1000)
  })

  it('returns at most the last 4 weeks', () => {
    const workouts = Array.from({ length: 6 }, (_, i) => {
      const d = new Date('2026-01-05T10:00:00.000Z')
      d.setDate(d.getDate() + i * 7)
      return workout(d.toISOString(), [exercise('Bench Press', 'Chest', [{ reps: 1, weight: 1 }])])
    })
    expect(getWeeklyVolume(workouts).length).toBeLessThanOrEqual(4)
  })
})

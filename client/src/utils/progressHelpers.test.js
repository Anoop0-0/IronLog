import { describe, it, expect } from 'vitest'
import {
  getWeeklyVolume,
  getPersonalRecords,
  filterByDays,
  getTotalVolume,
  getTotalSets,
  getMostTrainedPart,
  getMaxRepsSet,
  getBestSessionVolume,
  getEstimated1RM,
  getBestWeightByReps,
  getSessionTrend,
  PROGRESS_GRAPHS,
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

  it('returns everything unfiltered when days is null (the "All" range)', () => {
    const workouts = [workout('2020-01-01T00:00:00.000Z', [])]
    expect(filterByDays(workouts, null)).toEqual(workouts)
  })

  it('accepts a custom date accessor for shapes other than { createdAt }', () => {
    const now = new Date()
    const recent = new Date(now); recent.setDate(now.getDate() - 2)
    const old    = new Date(now); old.setDate(now.getDate() - 40)

    const entries = [{ date: recent.toISOString() }, { date: old.toISOString() }]
    const filtered = filterByDays(entries, 30, e => e.date)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].date).toBe(recent.toISOString())
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

// history entries match GET /workouts/exercise/:name/history's shape:
// [{ date, sets: [{ reps, weight }] }]
const historyEntry = (date, sets) => ({ date, sets })

describe('getMaxRepsSet', () => {
  it('returns the highest single-set rep count along with the weight used', () => {
    const history = [
      historyEntry('2026-01-01', [{ reps: 8, weight: 80 }, { reps: 12, weight: 40 }]),
      historyEntry('2026-01-08', [{ reps: 6, weight: 90 }]),
    ]
    expect(getMaxRepsSet(history)).toEqual({ reps: 12, weight: 40, date: '2026-01-01' })
  })

  it('breaks ties in equal rep counts by preferring the heavier weight', () => {
    const history = [
      historyEntry('2026-01-01', [{ reps: 10, weight: 60 }]),
      historyEntry('2026-01-08', [{ reps: 10, weight: 80 }]),
    ]
    expect(getMaxRepsSet(history)).toEqual({ reps: 10, weight: 80, date: '2026-01-08' })
  })

  it('returns null for no history', () => {
    expect(getMaxRepsSet([])).toBeNull()
  })
})

describe('getBestSessionVolume', () => {
  it('returns the single highest-volume session', () => {
    const history = [
      historyEntry('2026-01-01', [{ reps: 8, weight: 80 }]),        // 640
      historyEntry('2026-01-08', [{ reps: 10, weight: 80 }, { reps: 10, weight: 80 }]), // 1600
    ]
    const best = getBestSessionVolume(history)
    expect(best.date).toBe('2026-01-08')
    expect(best.volume).toBe(1600)
  })

  it('returns null for no history', () => {
    expect(getBestSessionVolume([])).toBeNull()
  })
})

describe('getEstimated1RM', () => {
  it('computes the Epley estimate and takes the max across sets, returning the winning set', () => {
    const history = [
      historyEntry('2026-01-01', [
        { reps: 5, weight: 100 },  // 100 * (1 + 5/30) = 116.67 -> 117
        { reps: 1, weight: 110 },  // 110 * (1 + 1/30) = 113.67 -> 114
      ]),
    ]
    // the higher-rep set estimates a higher 1RM despite lower weight
    expect(getEstimated1RM(history)).toEqual({ estimate: 117, weight: 100, reps: 5, date: '2026-01-01' })
  })

  it('ignores sets above the reliable rep ceiling when a reliable set exists', () => {
    const history = [
      historyEntry('2026-01-01', [
        { reps: 25, weight: 20 },  // high-rep set: 20 * (1 + 25/30) = 36.67 -> 37, but unreliable
        { reps: 5,  weight: 100 }, // 100 * (1 + 5/30) = 116.67 -> 117, reliable and higher anyway
      ]),
    ]
    expect(getEstimated1RM(history)).toEqual({ estimate: 117, weight: 100, reps: 5, date: '2026-01-01' })
  })

  it('falls back to unreliable sets if nothing in this exercise is ever under the rep ceiling', () => {
    const history = [
      historyEntry('2026-01-01', [{ reps: 25, weight: 20 }]), // 20 * (1 + 25/30) = 36.67 -> 37
    ]
    expect(getEstimated1RM(history)).toEqual({ estimate: 37, weight: 20, reps: 25, date: '2026-01-01' })
  })

  it('returns null for no history', () => {
    expect(getEstimated1RM([])).toBeNull()
  })
})

describe('getBestWeightByReps', () => {
  it('returns the heaviest weight ever lifted at each distinct rep count', () => {
    const history = [
      historyEntry('2026-01-01', [{ reps: 5, weight: 80 }]),
      historyEntry('2026-01-08', [{ reps: 5, weight: 85 }, { reps: 8, weight: 70 }]),
    ]
    const result = getBestWeightByReps(history)
    expect(result).toEqual([
      { reps: 5, weight: 85 },
      { reps: 8, weight: 70 },
    ])
  })

  it('sorts by rep count ascending', () => {
    const history = [historyEntry('2026-01-01', [{ reps: 10, weight: 60 }, { reps: 3, weight: 100 }])]
    expect(getBestWeightByReps(history).map(r => r.reps)).toEqual([3, 10])
  })
})

describe('getSessionTrend', () => {
  it('returns one point per workout session, sorted chronologically', () => {
    const workouts = [
      workout('2026-01-08T10:00:00.000Z', [exercise('Bench Press', 'Chest', [{ reps: 5, weight: 100 }])]),
      workout('2026-01-01T10:00:00.000Z', [exercise('Squat', 'Legs', [{ reps: 5, weight: 100 }])]),
    ]
    const result = getSessionTrend(workouts, 'volume')
    expect(result).toHaveLength(2)
    expect(result[0].timestamp).toBeLessThan(result[1].timestamp)
  })

  it('computes volume as reps * weight summed across the session', () => {
    const workouts = [
      workout('2026-01-01T10:00:00.000Z', [
        exercise('Bench Press', 'Chest', [{ reps: 5, weight: 100 }, { reps: 5, weight: 100 }]),
      ]),
    ]
    expect(getSessionTrend(workouts, 'volume')[0].value).toBe(1000)
  })

  it('computes reps as total reps summed across the session', () => {
    const workouts = [
      workout('2026-01-01T10:00:00.000Z', [
        exercise('Bench Press', 'Chest', [{ reps: 5, weight: 100 }, { reps: 8, weight: 90 }]),
      ]),
    ]
    expect(getSessionTrend(workouts, 'reps')[0].value).toBe(13)
  })
})

describe('PROGRESS_GRAPHS', () => {
  it('only offers metrics that still mean something summed across every exercise', () => {
    expect(PROGRESS_GRAPHS.map(g => g.id)).toEqual(['volume', 'reps', 'sets'])
  })

  it('every id is a metric getSessionTrend understands', () => {
    const workouts = [
      workout('2026-01-01T10:00:00.000Z', [
        exercise('Bench Press', 'Chest', [{ reps: 5, weight: 100 }]),
      ]),
    ]
    PROGRESS_GRAPHS.forEach(g => {
      const [point] = getSessionTrend(workouts, g.id)
      expect(Number.isFinite(point.value)).toBe(true)
    })
  })
})

describe('getSessionTrend — sets metric', () => {
  it('counts sets, independent of how heavy or long they were', () => {
    const workouts = [
      workout('2026-01-01T10:00:00.000Z', [
        exercise('Bench Press', 'Chest', [{ reps: 5, weight: 100 }, { reps: 8, weight: 90 }]),
        exercise('Squat', 'Legs', [{ reps: 10, weight: 120 }]),
      ]),
    ]
    expect(getSessionTrend(workouts, 'sets')[0].value).toBe(3)
  })

  it('is not rounded like volume — a set count is already an integer', () => {
    const workouts = [
      workout('2026-01-01T10:00:00.000Z', [
        exercise('Curl', 'Arms', [{ reps: 12, weight: 12.5 }]),
      ]),
    ]
    expect(getSessionTrend(workouts, 'sets')[0].value).toBe(1)
  })
})

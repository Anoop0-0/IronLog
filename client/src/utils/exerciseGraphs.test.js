import { describe, it, expect } from 'vitest'
import {
  EXERCISE_GRAPHS,
  getExerciseGraphData,
  getTopRepCounts,
} from './exerciseGraphs'

const entry = (date, sets) => ({ date, sets })

// two sessions, oldest listed first here but the API returns newest-first,
// so tests pass them reversed where ordering matters
const history = [
  entry('2026-01-01', [{ reps: 5, weight: 100 }, { reps: 8, weight: 80 }]),
  entry('2026-01-08', [{ reps: 5, weight: 105 }, { reps: 8, weight: 75 }]),
]

describe('EXERCISE_GRAPHS', () => {
  it('offers all eight graph types', () => {
    expect(EXERCISE_GRAPHS).toHaveLength(8)
  })

  it('has unique ids', () => {
    const ids = EXERCISE_GRAPHS.map(g => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('single-series metrics', () => {
  const valuesFor = (id, h = history) => getExerciseGraphData(h, id).data.map(d => d.value)

  it('maxWeight takes the heaviest set of each session', () => {
    expect(valuesFor('maxWeight')).toEqual([100, 105])
  })

  it('maxReps takes the highest rep count of each session', () => {
    expect(valuesFor('maxReps')).toEqual([8, 8])
  })

  it('maxVolume takes the best single set, not the session total', () => {
    // session 1: 5*100=500 vs 8*80=640 -> 640
    // session 2: 5*105=525 vs 8*75=600 -> 600
    expect(valuesFor('maxVolume')).toEqual([640, 600])
  })

  it('workoutVolume sums every set in the session', () => {
    expect(valuesFor('workoutVolume')).toEqual([500 + 640, 525 + 600])
  })

  it('workoutReps sums every rep in the session', () => {
    expect(valuesFor('workoutReps')).toEqual([13, 13])
  })

  it('estimated1RM uses Epley on the best qualifying set', () => {
    // 100*(1+5/30)=116.67->117 vs 80*(1+8/30)=101.3->101  => 117
    // 105*(1+5/30)=122.5->123 vs 75*(1+8/30)=95 => 123
    expect(valuesFor('estimated1RM')).toEqual([117, 123])
  })

  it('estimated1RM ignores sets past the 12-rep ceiling', () => {
    const h = [entry('2026-01-01', [
      { reps: 25, weight: 60 },  // unreliable: 60*(1+25/30)=110
      { reps: 5,  weight: 100 }, // reliable:   117
    ])]
    expect(valuesFor('estimated1RM', h)).toEqual([117])
  })

  it('sorts oldest-first even though the API returns newest-first', () => {
    const newestFirst = [...history].reverse()
    expect(getExerciseGraphData(newestFirst, 'maxWeight').data.map(d => d.value))
      .toEqual([100, 105])
  })
})

describe('getTopRepCounts', () => {
  it('returns the most-used rep counts, ascending', () => {
    const h = [
      entry('2026-01-01', [{ reps: 5, weight: 1 }, { reps: 5, weight: 1 }, { reps: 8, weight: 1 }]),
      entry('2026-01-08', [{ reps: 8, weight: 1 }, { reps: 12, weight: 1 }]),
    ]
    expect(getTopRepCounts(h)).toEqual([5, 8, 12])
  })

  it('caps the number of series', () => {
    const sets = [3, 5, 8, 10, 12].map(reps => ({ reps, weight: 50 }))
    expect(getTopRepCounts([entry('2026-01-01', sets)]).length).toBeLessThanOrEqual(3)
  })
})

describe('maxWeightForReps', () => {
  it('plots the heaviest weight at each rep count per session', () => {
    const res = getExerciseGraphData(history, 'maxWeightForReps')
    expect(res.kind).toBe('multi')
    expect(res.keys).toEqual(['5', '8'])
    expect(res.data).toEqual([
      { label: 'Jan 1', 5: 100, 8: 80 },
      { label: 'Jan 8', 5: 105, 8: 75 },
    ])
  })

  it('leaves a gap (undefined, not 0) when a rep count is skipped', () => {
    const h = [
      entry('2026-01-01', [{ reps: 5, weight: 100 }, { reps: 8, weight: 80 }]),
      entry('2026-01-08', [{ reps: 5, weight: 105 }]),   // no 8-rep set
    ]
    const row = getExerciseGraphData(h, 'maxWeightForReps').data[1]
    expect(row[8]).toBeUndefined()
    expect(row[8]).not.toBe(0)
  })
})

describe('personalRecords', () => {
  it('is a non-decreasing staircase — a lighter day holds the record', () => {
    // the 8-rep set drops 80 -> 75, but the record must stay at 80
    const res = getExerciseGraphData(history, 'personalRecords')
    expect(res.data).toEqual([
      { label: 'Jan 1', 5: 100, 8: 80 },
      { label: 'Jan 8', 5: 105, 8: 80 },
    ])
  })

  it('carries a record forward through sessions that skip that rep count', () => {
    const h = [
      entry('2026-01-01', [{ reps: 5, weight: 100 }]),
      entry('2026-01-08', [{ reps: 5, weight: 90 }]),   // lighter
      entry('2026-01-15', [{ reps: 5, weight: 110 }]),  // new record
    ]
    expect(getExerciseGraphData(h, 'personalRecords').data.map(d => d[5]))
      .toEqual([100, 100, 110])
  })

  it('never reports a record before it was actually set', () => {
    const h = [
      entry('2026-01-01', [{ reps: 8, weight: 60 }]),
      entry('2026-01-08', [{ reps: 5, weight: 100 }]),  // 5-rep starts here
    ]
    const data = getExerciseGraphData(h, 'personalRecords').data
    expect(data[0][5]).toBeUndefined()
    expect(data[1][5]).toBe(100)
  })
})

describe('empty history', () => {
  it('returns empty data rather than throwing, for every graph type', () => {
    EXERCISE_GRAPHS.forEach(g => {
      const res = getExerciseGraphData([], g.id)
      expect(res.data).toEqual([])
      expect(res.keys).toEqual([])
    })
  })

  it('falls back to a valid graph for an unknown id', () => {
    expect(getExerciseGraphData(history, 'nope').data.length).toBe(2)
  })
})

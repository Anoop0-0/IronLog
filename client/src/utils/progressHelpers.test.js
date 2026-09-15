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
  getStandingRecords,
  standingAchievements,
  getStandingRecordSets,
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

// ── standing records ────────────────────────────────────────────────
const hEntry = (date, sets) => ({ date, sets })
const set = (reps, weight, achievements = []) => ({ reps, weight, achievements })

describe('getStandingRecords / standingAchievements', () => {
  // the sequence from the bug report: 2.5x1 (PR), 2.5x3 (REP PR),
  // 5x3 (PR), 5x3 (nothing), 12.5x12 (PR)
  const history = [
    hEntry('2026-01-01', [
      set(1, 2.5, ['weight']),
      set(3, 2.5, ['reps']),
      set(3, 5,   ['weight']),
      set(3, 5),
      set(12, 12.5, ['weight']),
    ]),
  ]
  const standing = getStandingRecords(history)
  const shown = s => standingAchievements(s, standing)

  it('keeps the weight badge only on the set that is still the heaviest', () => {
    expect(shown(set(12, 12.5, ['weight']))).toEqual(['weight'])
  })

  it('drops the weight badge from sets a heavier lift has since beaten', () => {
    expect(shown(set(1, 2.5, ['weight']))).toEqual([])
    expect(shown(set(3, 5,   ['weight']))).toEqual([])
  })

  it('keeps a rep badge that is still the most reps at that weight', () => {
    expect(shown(set(3, 2.5, ['reps']))).toEqual(['reps'])
  })

  it('drops a rep badge once more reps are done at the same weight', () => {
    const later = [hEntry('2026-01-08', [
      set(3, 2.5, ['reps']),
      set(5, 2.5, ['reps']),   // new rep record at 2.5kg
    ])]
    const st = getStandingRecords(later)
    expect(standingAchievements(set(3, 2.5, ['reps']), st)).toEqual([])
    expect(standingAchievements(set(5, 2.5, ['reps']), st)).toEqual(['reps'])
  })

  it('a later set merely MATCHING the record does not steal the badge', () => {
    // equal reps at equal weight earns nothing, so the original holder keeps it
    const tied = [hEntry('2026-01-08', [set(3, 5, ['weight']), set(3, 5)])]
    const st = getStandingRecords(tied)
    expect(standingAchievements(set(3, 5, ['weight']), st)).toEqual(['weight'])
  })

  it('handles a just-edited set whose numbers are still strings', () => {
    const st = getStandingRecords([hEntry('2026-01-01', [set(3, 5, ['weight'])])])
    expect(standingAchievements({ reps: '3', weight: '5', achievements: ['weight'] }, st))
      .toEqual(['weight'])
  })

  it('returns nothing for a set that never earned anything', () => {
    expect(shown(set(3, 5))).toEqual([])
  })

  it('survives empty history without throwing', () => {
    const st = getStandingRecords([])
    expect(st.maxWeight).toBeNull()
    expect(standingAchievements(set(3, 5, ['weight']), st)).toEqual([])
  })

  it('leaves an unrecognised future badge kind visible rather than hiding it', () => {
    expect(shown(set(3, 5, ['streak']))).toEqual(['streak'])
  })
})

describe('getStandingRecordSets', () => {
  it('will not claim a rep record the server never awarded', () => {
    // one lone set at 80kg: trivially "the most reps at 80kg", but there
    // was no prior attempt to beat, so no badge was ever earned. An
    // aggregate card must not invent one.
    const history = [hEntry('2026-01-01', [set(5, 80)])]
    const r = getStandingRecordSets(history)
    expect(r.holdsRepsRecord(80, 5)).toBe(false)
  })

  it('claims a rep record that was earned and still stands', () => {
    const history = [hEntry('2026-01-01', [set(3, 80), set(5, 80, ['reps'])])]
    const r = getStandingRecordSets(history)
    expect(r.holdsRepsRecord(80, 5)).toBe(true)
    expect(r.holdsRepsRecord(80, 3)).toBe(false)
  })

  it('drops the claim once the rep record is beaten', () => {
    const history = [hEntry('2026-01-01', [
      set(3, 80), set(5, 80, ['reps']), set(8, 80, ['reps']),
    ])]
    const r = getStandingRecordSets(history)
    expect(r.holdsRepsRecord(80, 5)).toBe(false)
    expect(r.holdsRepsRecord(80, 8)).toBe(true)
  })

  it('claims the weight record only for the heaviest lift', () => {
    const history = [hEntry('2026-01-01', [
      set(5, 80, ['weight']), set(3, 120, ['weight']),
    ])]
    const r = getStandingRecordSets(history)
    expect(r.holdsWeightRecord(120)).toBe(true)
    expect(r.holdsWeightRecord(80)).toBe(false)     // beaten
  })

  it('can match a weight record on rep count too, for by-reps rows', () => {
    const history = [hEntry('2026-01-01', [set(3, 120, ['weight'])])]
    const r = getStandingRecordSets(history)
    expect(r.holdsWeightRecord(120, 3)).toBe(true)
    expect(r.holdsWeightRecord(120, 5)).toBe(false) // different rep count
  })

  it('never disagrees with what the set lists render', () => {
    const history = [hEntry('2026-01-01', [
      set(1, 2.5, ['weight']), set(3, 2.5, ['reps']),
      set(3, 5, ['weight']), set(12, 12.5, ['weight']),
    ])]
    const standing = getStandingRecords(history)
    const r = getStandingRecordSets(history)
    history[0].sets.forEach(s => {
      const onList = standingAchievements(s, standing)
      expect(r.holdsWeightRecord(s.weight, s.reps)).toBe(onList.includes('weight'))
      expect(r.holdsRepsRecord(s.weight, s.reps)).toBe(onList.includes('reps'))
    })
  })

  it('survives empty history', () => {
    const r = getStandingRecordSets([])
    expect(r.holdsWeightRecord(100)).toBe(false)
    expect(r.holdsRepsRecord(100, 5)).toBe(false)
  })
})

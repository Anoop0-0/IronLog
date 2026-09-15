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
  getBadgeAssignment,
  standingAchievements,
  getStandingRecordSets,
  getBadgeAssignmentsByExercise,
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
let nextId = 0
const hEntry = (date, sets) => ({ date, sets })
const set = (reps, weight, achievements = []) =>
  ({ _id: `s${++nextId}`, reps, weight, achievements })

const shownFor = (history) => {
  const records = getBadgeAssignment(history)
  return history.flatMap(e => e.sets).map(s => ({
    label: `${s.weight}x${s.reps}`,
    shown: standingAchievements(s, records),
  }))
}

describe('badge assignment', () => {
  it('badges the first set at a weight even though it earned nothing', () => {
    // the reported case: 50x10, 65x6, 50x7 as a first-ever session.
    // 50x10 is the best at 50kg, but the server awards no rep record
    // without a prior attempt at that weight to beat.
    const history = [hEntry('2026-01-01', [
      set(10, 50, ['weight']),   // earned weight (first ever), then beaten
      set(6,  65, ['weight']),   // the standing weight record
      set(7,  50),
    ])]
    expect(shownFor(history).map(r => r.shown)).toEqual([['reps'], ['weight'], []])
  })

  it('badges from the sets, not the stored flags — wiped data still works', () => {
    // the reported bug: saving a workout through the bulk edit endpoint
    // stripped every achievement, so no set carried a 'weight' flag and
    // the heaviest lift fell through to the rep rule, showing REP PR on
    // both sets and PR on neither
    const history = [hEntry('2026-01-01', [
      { _id: 'a', reps: 10, weight: 50, achievements: [] },
      { _id: 'b', reps: 6,  weight: 65, achievements: [] },
      { _id: 'c', reps: 7,  weight: 50, achievements: [] },
    ])]
    const records = getBadgeAssignment(history)
    expect(history[0].sets.map(x => standingAchievements(x, records)))
      .toEqual([['reps'], ['weight'], []])
  })

  it('gives one set at most one badge — never PR and REP PR together', () => {
    // 65x6 is both the heaviest lift and the only set at 65kg
    const history = [hEntry('2026-01-01', [set(6, 65, ['weight'])])]
    expect(standingAchievements(history[0].sets[0], getBadgeAssignment(history)))
      .toEqual(['weight'])
  })

  it('breaks a tie by badging the earliest set only', () => {
    // 3x10 at one weight is the normal case; all three tie for "most
    // reps at 50kg" and badging all three would be noise
    const history = [hEntry('2026-01-01', [
      set(10, 50, ['weight']), set(10, 50), set(10, 50),
    ])]
    const shown = shownFor(history).map(r => r.shown)
    expect(shown.filter(k => k.length > 0)).toHaveLength(1)
    expect(shown[0]).toEqual(['weight'])
  })

  it('picks the earliest tie across sessions, not the latest', () => {
    const history = [
      hEntry('2026-01-08', [set(10, 50)]),   // newest first, as the API returns
      hEntry('2026-01-01', [set(10, 50), set(3, 90)]),  // 90kg keeps 50 off the max
    ]
    const records = getBadgeAssignment(history)
    expect(standingAchievements(history[1].sets[0], records)).toEqual(['reps'])
    expect(standingAchievements(history[0].sets[0], records)).toEqual([])
  })

  it('keeps the weight badge only on the set still heaviest', () => {
    const history = [hEntry('2026-01-01', [
      set(5, 80, ['weight']), set(3, 120, ['weight']),
    ])]
    const shown = shownFor(history)
    expect(shown[1].shown).toEqual(['weight'])
    expect(shown[0].shown).toEqual(['reps'])   // still the best at 80kg
  })

  it('moves the rep badge when more reps are done at that weight', () => {
    const history = [hEntry('2026-01-01', [
      set(3, 80), set(5, 80), set(8, 80), set(1, 120),  // 120kg takes the PR
    ])]
    expect(shownFor(history).map(r => r.shown))
      .toEqual([[], [], ['reps'], ['weight']])
  })

  it('handles a just-edited set whose numbers are strings', () => {
    const history = [hEntry('2026-01-01', [
      { _id: 'x', reps: '5', weight: '80', achievements: [] },
      { _id: 'y', reps: '3', weight: '60', achievements: [] },
    ])]
    const records = getBadgeAssignment(history)
    // '80' must compare as 80, or neither badge lands
    expect(standingAchievements(history[0].sets[0], records)).toEqual(['weight'])
    expect(standingAchievements(history[0].sets[1], records)).toEqual(['reps'])
  })

  it('survives empty history', () => {
    const records = getBadgeAssignment([])
    expect(records.standing.maxWeight).toBeNull()
    expect(standingAchievements(set(5, 80), records)).toEqual([])
  })

  it('leaves an unrecognised future badge kind visible', () => {
    const history = [hEntry('2026-01-01', [set(3, 5, ['streak'])])]
    expect(standingAchievements(history[0].sets[0], getBadgeAssignment(history)))
      .toContain('streak')
  })
})

describe('getStandingRecordSets', () => {
  it('claims the rep record for a lone set at a weight', () => {
    // 120kg holds the weight badge, so the 80kg set is judged on reps —
    // and a single attempt still counts as the best at that weight
    const history = [hEntry('2026-01-01', [set(5, 80), set(1, 120)])]
    expect(getStandingRecordSets(history).holdsRepsRecord(80, 5)).toBe(true)
  })

  it('drops the claim once more reps are done at that weight', () => {
    const history = [hEntry('2026-01-01', [set(5, 80), set(8, 80), set(1, 120)])]
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
    expect(r.holdsWeightRecord(80)).toBe(false)
  })

  it('never disagrees with what the set lists render', () => {
    const history = [hEntry('2026-01-01', [
      set(1, 2.5, ['weight']), set(3, 2.5), set(3, 5, ['weight']), set(12, 12.5, ['weight']),
    ])]
    const records = getBadgeAssignment(history)
    const r = getStandingRecordSets(history)
    history[0].sets.forEach(s => {
      const onList = standingAchievements(s, records)
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

describe('getBadgeAssignmentsByExercise', () => {
  const w = (createdAt, exercises) => ({ createdAt, exercises })
  const e = (name, sets) => ({ name, bodyPart: 'Chest', sets })

  it('keeps each exercise\'s records separate', () => {
    // 60kg is the heaviest Bench set but nowhere near the Squat numbers —
    // judging them together would badge the wrong rows
    const workouts = [
      w('2026-01-02', [e('Bench Press', [set(5, 60)]), e('Squat', [set(5, 140)])]),
      w('2026-01-01', [e('Bench Press', [set(5, 50)]), e('Squat', [set(5, 120)])]),
    ]
    const byExercise = getBadgeAssignmentsByExercise(workouts)
    expect(Object.keys(byExercise).sort()).toEqual(['Bench Press', 'Squat'])

    const bench = workouts[0].exercises[0].sets[0]      // 60kg — heaviest Bench
    const squat = workouts[0].exercises[1].sets[0]      // 140kg — heaviest Squat
    expect(standingAchievements(bench, byExercise['Bench Press'])).toEqual(['weight'])
    expect(standingAchievements(squat, byExercise['Squat'])).toEqual(['weight'])
  })

  it('gathers an exercise trained across several days', () => {
    const workouts = [
      w('2026-01-02', [e('Bench Press', [set(5, 50)])]),
      w('2026-01-01', [e('Bench Press', [set(5, 80)])]),   // the heavier day is older
    ]
    const records = getBadgeAssignmentsByExercise(workouts)['Bench Press']
    expect(standingAchievements(workouts[1].exercises[0].sets[0], records)).toEqual(['weight'])
    expect(standingAchievements(workouts[0].exercises[0].sets[0], records)).toEqual(['reps'])
  })

  it('returns an empty map for no workouts', () => {
    expect(getBadgeAssignmentsByExercise([])).toEqual({})
  })
})

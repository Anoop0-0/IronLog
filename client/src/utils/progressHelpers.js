// ── Volume chart ─────────────────────────────────────────────────────
// Groups workouts into weeks and sums total volume per week
// Returns array like: [{week: 'Mar 1', volume: 4200}, ...]

export const getWeeklyVolume = (workouts) => {
  const weeks = {}

  workouts.forEach(workout => {
    const date = new Date(workout.createdAt)

    // Get Monday of the week this workout belongs to
    const day  = date.getDay()                          // 0=Sun, 1=Mon...
    const diff = day === 0 ? -6 : 1 - day               // offset to Monday
    const monday = new Date(date)
    monday.setDate(date.getDate() + diff)
    monday.setHours(0, 0, 0, 0)

    const key   = monday.toISOString()
    const label = monday.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    })

    if (!weeks[key]) weeks[key] = { week: label, volume: 0 }

    // sum volume for this workout
    workout.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        const reps   = parseFloat(set.reps)   || 0
        const weight = parseFloat(set.weight) || 0
        weeks[key].volume += reps * weight
      })
    })
  })

  // sort by date, return last 4 weeks
  return Object.entries(weeks)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(-4)
    .map(([, v]) => v)
}

// ── Personal records ─────────────────────────────────────────────────
// Finds the heaviest weight ever lifted per exercise
// Returns array like: [{exercise: 'Bench Press', weight: 100, reps: 5, date: '...'}]

export const getPersonalRecords = (workouts) => {
  const records = {}   // { 'Bench Press': { weight: 100, reps: 5, date: '...' } }

  workouts.forEach(workout => {
    workout.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        const weight = parseFloat(set.weight) || 0
        const reps   = parseFloat(set.reps)   || 0

        if (!records[ex.name] || weight > records[ex.name].weight) {
          records[ex.name] = {
            exercise: ex.name,
            bodyPart: ex.bodyPart,
            weight,
            reps,
            date: workout.createdAt,
          }
        }
      })
    })
  })

  // sort by weight descending
  return Object.values(records).sort((a, b) => b.weight - a.weight)
}

// ── shared timeline filter (Progress page + per-exercise Graphs tab) ──
export const TIMELINE_RANGES = [
  { label: '1M',  days: 30 },
  { label: '3M',  days: 90 },
  { label: '6M',  days: 180 },
  { label: '1Y',  days: 365 },
  { label: 'All', days: null },
]

// filter to items within the last N days. `getDate` lets callers point
// at whatever field holds the date — workouts use `createdAt`, a
// per-exercise history entry uses `date`. days: null means "all time".
export const filterByDays = (items, days, getDate = (item) => item.createdAt) => {
  if (days === null) return items
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return items.filter(item => new Date(getDate(item)) >= cutoff)
}


// total volume across all workouts ever
export const getTotalVolume = (workouts) =>
  workouts.reduce((total, workout) =>
    total + workout.exercises.reduce((t, ex) =>
      t + ex.sets.reduce((s, set) =>
        s + (parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0)
      , 0)
    , 0)
  , 0)

// total number of individual sets ever logged
export const getTotalSets = (workouts) =>
  workouts.reduce((total, workout) =>
    total + workout.exercises.reduce((t, ex) =>
      t + ex.sets.length
    , 0)
  , 0)

// which body part appears most across all workouts
export const getMostTrainedPart = (workouts) => {
  const counts = {}
  workouts.forEach(workout =>
    workout.exercises.forEach(ex => {
      if (ex.bodyPart) counts[ex.bodyPart] = (counts[ex.bodyPart] || 0) + 1
    })
  )
  if (Object.keys(counts).length === 0) return '—'
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

// ── per-exercise deep-dive metrics ──────────────────────────────────
// all of these take the shape GET /workouts/exercise/:name/history returns:
// [{ date, sets: [{ reps, weight }] }, ...]

// the single set with the highest rep count, and the weight it was
// performed at — "12 reps" alone doesn't mean anything without knowing
// whether that was an empty bar or a heavy set. Ties (same rep count at
// different weights) go to the heavier one, since that's the more
// impressive record.
export const getMaxRepsSet = (history) => {
  let best = null
  history.forEach(entry =>
    entry.sets.forEach(s => {
      if (!best || s.reps > best.reps || (s.reps === best.reps && s.weight > best.weight)) {
        best = { reps: s.reps, weight: s.weight, date: entry.date }
      }
    })
  )
  return best
}

// the single session (one workout day) with the highest total volume
// for this exercise
export const getBestSessionVolume = (history) => {
  if (history.length === 0) return null
  const sessions = history.map(entry => ({
    date: entry.date,
    volume: entry.sets.reduce((sum, s) => sum + s.reps * s.weight, 0),
  }))
  return sessions.reduce((best, s) => (!best || s.volume > best.volume) ? s : best, null)
}

// Epley formula (weight * (1 + reps/30)) — a standard estimate, not a
// measured max. It's only reasonably accurate for sets taken close to
// failure in a strength-testing rep range; past ~12 reps the
// extrapolation stops meaning anything (a 20-rep set would "estimate" a
// 1RM nobody actually has). So estimates are computed only from sets at
// or under that ceiling, falling back to the full set list if this
// exercise has never been logged in that range (e.g. pure high-rep
// accessory work) so this still returns something rather than null.
// Returns the winning set alongside the number so the UI can show its
// work — "117kg, from 100kg × 5" — instead of an unexplained figure.
const RELIABLE_1RM_REP_CEILING = 12

export const getEstimated1RM = (history) => {
  const allSets = history.flatMap(entry =>
    entry.sets.map(s => ({ reps: s.reps, weight: s.weight, date: entry.date }))
  )
  if (allSets.length === 0) return null

  const reliable = allSets.filter(s => s.reps <= RELIABLE_1RM_REP_CEILING)
  const pool = reliable.length ? reliable : allSets

  return pool.reduce((best, s) => {
    const estimate = Math.round(s.weight * (1 + s.reps / 30))
    return (!best || estimate > best.estimate)
      ? { estimate, weight: s.weight, reps: s.reps, date: s.date }
      : best
  }, null)
}

// heaviest weight ever lifted at each distinct rep count, e.g.
// [{ reps: 5, weight: 90 }, { reps: 8, weight: 80 }], sorted by reps asc
export const getBestWeightByReps = (history) => {
  const byReps = {}
  history.forEach(entry =>
    entry.sets.forEach(s => {
      if (!byReps[s.reps] || s.weight > byReps[s.reps]) byReps[s.reps] = s.weight
    })
  )
  return Object.entries(byReps)
    .map(([reps, weight]) => ({ reps: Number(reps), weight }))
    .sort((a, b) => a.reps - b.reps)
}

// ── account-wide session trend (for the Progress page) ──────────────
// Only the metrics that still mean something once every exercise is
// summed together. Deliberately NOT the full per-exercise graph menu
// (see utils/exerciseGraphs.js): a single "max weight" line across all
// exercises would jump between your deadlift and your curls, and a
// "1RM" blended across unrelated lifts has no interpretation at all.
export const PROGRESS_GRAPHS = [
  { id: 'volume', label: 'Workout Volume', suffix: 'kg',    totalLabel: 'kg total' },
  { id: 'reps',   label: 'Workout Reps',   suffix: ' reps', totalLabel: 'reps total' },
  { id: 'sets',   label: 'Workout Sets',   suffix: ' sets', totalLabel: 'sets total' },
]

// one point per workout session (not bucketed by week) so the timeline
// filter (1M/3M/6M/1Y/All) controls the resolution directly; metric is
// one of PROGRESS_GRAPHS' ids
export const getSessionTrend = (workouts, metric) => {
  const sessions = workouts.map(w => {
    let value = 0
    w.exercises.forEach(ex => ex.sets.forEach(s => {
      const reps   = parseFloat(s.reps)   || 0
      const weight = parseFloat(s.weight) || 0
      if (metric === 'reps')      value += reps
      else if (metric === 'sets') value += 1
      else                        value += reps * weight
    }))
    return {
      label: new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: metric === 'volume' ? Math.round(value) : value,
      timestamp: new Date(w.createdAt).getTime(),
    }
  })
  return sessions.sort((a, b) => a.timestamp - b.timestamp)
}
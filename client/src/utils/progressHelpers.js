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

// ── filter workouts to last N days ───────────────────────────────────
export const filterByDays = (workouts, days) => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return workouts.filter(w => new Date(w.createdAt) >= cutoff)
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

// highest single-set rep count ever performed, regardless of weight
export const getMaxReps = (history) => {
  const allReps = history.flatMap(entry => entry.sets.map(s => s.reps))
  return allReps.length ? Math.max(...allReps) : null
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

// Epley formula — a standard estimate, not a measured max. Computed per
// set (not just off the heaviest set) since a lower-weight, higher-rep
// set can sometimes estimate a higher 1RM than the single heaviest lift.
export const getEstimated1RM = (history) => {
  const estimates = history.flatMap(entry =>
    entry.sets.map(s => Math.round(s.weight * (1 + s.reps / 30)))
  )
  return estimates.length ? Math.max(...estimates) : null
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
// one point per workout session (not bucketed by week) so the timeline
// filter (1M/3M/6M/1Y/All) controls the resolution directly; metric is
// 'volume' or 'reps'
export const getSessionTrend = (workouts, metric) => {
  const sessions = workouts.map(w => {
    let value = 0
    w.exercises.forEach(ex => ex.sets.forEach(s => {
      const reps   = parseFloat(s.reps)   || 0
      const weight = parseFloat(s.weight) || 0
      value += metric === 'reps' ? reps : reps * weight
    }))
    return {
      label: new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: metric === 'reps' ? value : Math.round(value),
      timestamp: new Date(w.createdAt).getTime(),
    }
  })
  return sessions.sort((a, b) => a.timestamp - b.timestamp)
}
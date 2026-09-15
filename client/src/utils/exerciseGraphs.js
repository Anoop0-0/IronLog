// Graph types for the per-exercise Graphs tab, modelled on FitNotes'
// graph menu. Every one takes the shape GET /workouts/exercise/:name/history
// returns: [{ date, sets: [{ reps, weight }] }, ...] (newest first).
//
// Two shapes come out of here:
//   kind 'single' -> one line: [{ label, value }]
//   kind 'multi'  -> one line per rep count, as Recharts rows keyed by
//                    that rep count: { label, '5': 80, '8': 70 }
// A rep count missing from a session is left undefined rather than 0, so
// the chart draws a gap instead of a dive to the floor.

// Epley stops meaning anything past ~12 reps — same ceiling the Est. 1RM
// stat card uses, kept here so the graph and the card can't disagree.
const RELIABLE_1RM_REP_CEILING = 12

const epley = (s) => s.weight * (1 + s.reps / 30)

const sessionE1RM = (sets) => {
  const reliable = sets.filter(s => s.reps <= RELIABLE_1RM_REP_CEILING)
  const pool = reliable.length ? reliable : sets
  return Math.round(Math.max(...pool.map(epley)))
}

// one value per session
const SINGLE_METRICS = {
  maxWeight:     sets => Math.max(...sets.map(s => s.weight)),
  maxReps:       sets => Math.max(...sets.map(s => s.reps)),
  maxVolume:     sets => Math.max(...sets.map(s => s.reps * s.weight)),
  workoutVolume: sets => Math.round(sets.reduce((t, s) => t + s.reps * s.weight, 0)),
  workoutReps:   sets => sets.reduce((t, s) => t + s.reps, 0),
  estimated1RM:  sessionE1RM,
}

export const EXERCISE_GRAPHS = [
  { id: 'personalRecords',  label: 'Personal Records',    kind: 'multi',  suffix: 'kg' },
  { id: 'maxWeightForReps', label: 'Max Weight for Reps', kind: 'multi',  suffix: 'kg' },
  { id: 'maxWeight',        label: 'Max Weight',          kind: 'single', suffix: 'kg' },
  { id: 'maxReps',          label: 'Max Reps',            kind: 'single', suffix: ' reps' },
  { id: 'maxVolume',        label: 'Max Volume',          kind: 'single', suffix: 'kg' },
  { id: 'workoutVolume',    label: 'Workout Volume',      kind: 'single', suffix: 'kg' },
  { id: 'workoutReps',      label: 'Workout Reps',        kind: 'single', suffix: ' reps' },
  { id: 'estimated1RM',     label: 'Estimated 1RM',       kind: 'single', suffix: 'kg' },
]

export const DEFAULT_GRAPH_ID = 'maxWeight'

// how many rep-count lines a multi-series graph draws. FitNotes defaults
// to 1/2/3RM and offers a settings screen to change them; we instead pick
// the rep counts this exercise is actually trained at, so the graph is
// never empty for someone who never does singles. Three keeps it legible.
export const MAX_SERIES = 3

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// oldest -> newest, which is the direction a chart reads
const chronological = (history) =>
  [...history].sort((a, b) => new Date(a.date) - new Date(b.date))

// the rep counts used most often for this exercise, most-used first
export const getTopRepCounts = (history, limit = MAX_SERIES) => {
  const counts = {}
  history.forEach(entry =>
    entry.sets.forEach(s => { counts[s.reps] = (counts[s.reps] || 0) + 1 })
  )
  return Object.entries(counts)
    // most frequent first; ties broken by lower rep count so the ordering
    // is stable rather than dependent on object key order
    .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))
    .slice(0, limit)
    .map(([reps]) => Number(reps))
    .sort((a, b) => a - b)
}

export const getExerciseGraphData = (history, graphId) => {
  const graph = EXERCISE_GRAPHS.find(g => g.id === graphId)
      || EXERCISE_GRAPHS.find(g => g.id === DEFAULT_GRAPH_ID)

  const entries = chronological(history).filter(e => e.sets.length > 0)
  if (entries.length === 0) {
    return { kind: graph.kind, keys: [], data: [], suffix: graph.suffix, label: graph.label }
  }

  if (graph.kind === 'single') {
    return {
      kind: 'single',
      keys: [],
      suffix: graph.suffix,
      label: graph.label,
      data: entries.map(e => ({
        label: shortDate(e.date),
        value: SINGLE_METRICS[graph.id](e.sets),
      })),
    }
  }

  // ── multi-series: one line per rep count ──────────────────────────
  const repCounts = getTopRepCounts(entries)
  const keys = repCounts.map(String)

  // running best per rep count, for the Personal Records staircase
  const best = {}

  const data = entries.map(entry => {
    const row = { label: shortDate(entry.date) }

    repCounts.forEach(reps => {
      const atReps = entry.sets.filter(s => s.reps === reps)
      const heaviest = atReps.length ? Math.max(...atReps.map(s => s.weight)) : null

      if (graph.id === 'maxWeightForReps') {
        // what you actually lifted that day — gaps where you didn't
        if (heaviest !== null) row[reps] = heaviest
        return
      }

      // personalRecords: the record as it stood on that date, so the
      // line is a non-decreasing staircase and never dips on a light day
      if (heaviest !== null && (best[reps] === undefined || heaviest > best[reps])) {
        best[reps] = heaviest
      }
      if (best[reps] !== undefined) row[reps] = best[reps]
    })

    return row
  })

  return { kind: 'multi', keys, data, suffix: graph.suffix, label: graph.label }
}

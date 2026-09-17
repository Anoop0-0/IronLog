import { useState, useEffect } from 'react'
import { getWorkouts, deleteWorkout, updateWorkout } from '../api/workouts.api'

// Home, Log, Progress, History and Profile all want the same workout
// list, and each used to fetch it from scratch on mount — blanking to a
// skeleton and waiting a round trip for data it had seconds earlier.
// Every tab change cost that wait.
//
// The list is now cached across screens and served immediately, then
// revalidated in the background so a stale view corrects itself within a
// moment instead of making you look at a spinner. Concurrent mounts
// share one request rather than firing several.
let cache = null            // last known list, null until the first load
let inFlight = null         // dedupes overlapping fetches
const subscribers = new Set()

const publish = (list) => {
  cache = list
  subscribers.forEach(fn => fn(list))
}

// Must be called when the signed-in user changes. Without it the next
// account to use this browser would be served the previous one's
// workouts until revalidation landed.
export const clearWorkoutsCache = () => {
  cache = null
  inFlight = null
  subscribers.forEach(fn => fn([]))
}

// Refetch and publish to every mounted screen. Logging a set happens
// outside this hook (ExerciseDetail talks to the set endpoints directly),
// which would otherwise leave the cached list one set behind until the
// next screen revalidated — a brief window where Home could show a
// workout missing the set just logged.
export const refreshWorkouts = async () => {
  try {
    const res = await getWorkouts()
    publish(res.data)
  } catch {
    // a failed refresh just leaves the cache alone; the next mount retries
  }
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState(cache ?? [])
  // only a genuinely cold start blocks on a spinner
  const [loading,  setLoading]  = useState(cache === null)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    let cancelled = false
    subscribers.add(setWorkouts)

    const load = async () => {
      try {
        if (!inFlight) {
          inFlight = getWorkouts().finally(() => { inFlight = null })
        }
        const res = await inFlight
        if (!cancelled) publish(res.data)
      } catch {
        // a failed revalidation keeps whatever is already on screen —
        // only report it when there's nothing to show
        if (!cancelled && cache === null) setError('Failed to load workouts')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
      subscribers.delete(setWorkouts)
    }
  }, [])

  // local edits go through the cache so every mounted screen sees them
  const removeWorkout = (id) =>
    publish((cache ?? []).filter(w => w._id !== id))

  const replaceWorkout = (updated) =>
    publish((cache ?? []).map(w => w._id === updated._id ? updated : w))

  // save + local-state update in one call, so every screen showing
  // WorkoutCards doesn't reimplement the same pair. These deliberately
  // throw rather than swallow: each page renders its own error banner.
  const deleteById = async (id) => {
    await deleteWorkout(id)
    removeWorkout(id)
  }

  // The server removes a workout that has been edited down to nothing
  // rather than keeping an empty one, and answers with null when it
  // does. Without this branch that null reached replaceWorkout and threw
  // on `updated._id`, turning a successful delete into an error banner.
  const updateById = async (id, exercises) => {
    const res = await updateWorkout(id, { exercises })
    if (res.data) replaceWorkout(res.data)
    else removeWorkout(id)
  }

  return {
    workouts, loading, error,
    removeWorkout, replaceWorkout,
    deleteById, updateById,
  }
}

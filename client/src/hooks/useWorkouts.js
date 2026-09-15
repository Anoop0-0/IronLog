import { useState, useEffect } from 'react'
import { getWorkouts, deleteWorkout, updateWorkout } from '../api/workouts.api'

export function useWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getWorkouts()
        setWorkouts(res.data)
      } catch {
        setError('Failed to load workouts')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const removeWorkout = (id) =>
    setWorkouts(prev => prev.filter(w => w._id !== id))

  const replaceWorkout = (updated) =>
    setWorkouts(prev => prev.map(w => w._id === updated._id ? updated : w))

  // save + local-state update in one call, so every screen showing
  // WorkoutCards doesn't reimplement the same pair. These deliberately
  // throw rather than swallow: each page renders its own error banner.
  const deleteById = async (id) => {
    await deleteWorkout(id)
    removeWorkout(id)
  }

  const updateById = async (id, exercises) => {
    const res = await updateWorkout(id, { exercises })
    replaceWorkout(res.data)
  }

  return {
    workouts, loading, error,
    removeWorkout, replaceWorkout,
    deleteById, updateById,
  }
}
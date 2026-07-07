import { useState, useEffect } from 'react'
import { getWorkouts, deleteWorkout as deleteWorkoutAPI, updateWorkout as updateWorkoutAPI } from '../api/workouts.api'

export function useWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getWorkouts()
        setWorkouts(res.data)
      } catch (err) {
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

  return { workouts, loading, error, removeWorkout, replaceWorkout }
}
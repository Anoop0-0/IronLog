import { useState, useEffect } from 'react'
import { getWorkouts } from '../api/workouts.api'

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

  return { workouts, loading, error }
}
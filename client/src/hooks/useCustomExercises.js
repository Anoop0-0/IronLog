import { useState, useEffect } from 'react'
import { getCustomExercises } from '../api/exercises.api'

export function useCustomExercises() {
  const [customExercises, setCustomExercises] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCustomExercises()
        setCustomExercises(res.data)
      } catch {
        // non-fatal — the picker still works with just the preset list
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const addCustomExercise = (exercise) =>
    setCustomExercises(prev => [...prev, exercise])

  const replaceCustomExercise = (updated) =>
    setCustomExercises(prev => prev.map(e => e._id === updated._id ? updated : e))

  const removeCustomExercise = (id) =>
    setCustomExercises(prev => prev.filter(e => e._id !== id))

  return { customExercises, loading, addCustomExercise, replaceCustomExercise, removeCustomExercise }
}

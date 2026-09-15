import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout       from '../components/layout/AppLayout'
import ExercisePicker  from '../components/workout/ExercisePicker'
import { getTodayWorkout } from '../api/workouts.api'

export default function WorkoutLogger() {
  const [exercises, setExercises] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTodayWorkout()
        const todayWorkout = res.data
        setExercises(todayWorkout ? todayWorkout.exercises : [])
      } catch {
        setError('Failed to load today\'s workout')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // a brand-new exercise (not in today's workout yet) needs its bodyPart
  // carried along so the detail screen can log a first set for it —
  // ExerciseDetail falls back to this via location.state
  const handleAddExercise = (name, bodyPart) => {
    navigate(`/log/${encodeURIComponent(name)}`, { state: { bodyPart } })
  }

  return (
    <AppLayout>
      <div className="px-4 pt-10 pb-4">
        <h1 className="font-display text-xl font-bold text-white">Log workout</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'short', day: 'numeric'
          })}
        </p>
      </div>

      <div className="px-4 space-y-3">
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl
                          p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="h-20 bg-gray-900 rounded-xl animate-pulse"/>
            <div className="h-20 bg-gray-900 rounded-xl animate-pulse"/>
          </div>
        )}

        {!loading && exercises.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💪</p>
            <p className="text-gray-400 font-medium">No exercises yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Tap below to add your first exercise
            </p>
          </div>
        )}

        {exercises.map(ex => {
          const setCount = ex.sets?.length || 0
          const bestSet = ex.sets?.reduce((best, s) =>
            (!best || s.weight > best.weight) ? s : best, null)

          return (
            <button
              key={ex.name}
              onClick={() => navigate(`/log/${encodeURIComponent(ex.name)}`)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl
                         px-4 py-3.5 flex items-center justify-between text-left
                         active:border-gray-700 transition-colors"
            >
              <div>
                <h3 className="font-semibold text-white">{ex.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ex.bodyPart} · {setCount} {setCount === 1 ? 'set' : 'sets'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {bestSet && (
                  <span className="text-xs text-gray-400">
                    Best <span className="text-red-400 font-medium">{bestSet.weight}kg</span>
                  </span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>
          )
        })}

        <button
          onClick={() => setPickerOpen(true)}
          className="w-full border border-dashed border-gray-700 text-gray-500
                     rounded-xl py-4 text-sm active:border-red-700
                     active:text-red-500 transition-colors"
        >
          + Add exercise
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          onAdd={handleAddExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </AppLayout>
  )
}

import { useState, useEffect, useMemo, Fragment } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout       from '../components/layout/AppLayout'
import ExercisePicker  from '../components/workout/ExercisePicker'
import { AchievementBadge } from '../components/workout/Achievement'
import { useWorkouts } from '../hooks/useWorkouts'
import {
  getBadgeAssignmentsByExercise, standingAchievements,
} from '../utils/progressHelpers'
import { getTodayWorkout, getWorkoutForDay } from '../api/workouts.api'
import { toDayKey, dayKeyToNoon, isToday, formatDayKey } from '../utils/workoutDays'

export default function WorkoutLogger() {
  const [exercises, setExercises] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Badges need each exercise's full history, which the day fetch below
  // deliberately doesn't carry. Loaded separately and treated as
  // supplementary: this page renders from the day's own workout, so if
  // the list is slow or fails the sets still show, just unbadged.
  const { workouts } = useWorkouts()
  const badgesByExercise = useMemo(
    () => getBadgeAssignmentsByExercise(workouts),
    [workouts]
  )

  // ?date=YYYY-MM-DD logs against a past day; absent means today, which
  // keeps the server on its rolling-24h window rather than pinning the
  // session to a calendar date mid-workout
  const dayKey    = params.get('date') || toDayKey(new Date())
  const isTodayKey = isToday(dayKey)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = isTodayKey
          ? await getTodayWorkout()
          : await getWorkoutForDay(dayKeyToNoon(dayKey))
        setExercises(res.data ? res.data.exercises : [])
      } catch {
        setError('Failed to load that day\'s workout')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dayKey, isTodayKey])

  // a brand-new exercise (not in today's workout yet) needs its bodyPart
  // carried along so the detail screen can log a first set for it —
  // ExerciseDetail falls back to this via location.state
  const exerciseHref = (name) =>
    `/log/${encodeURIComponent(name)}${isTodayKey ? '' : `?date=${dayKey}`}`

  const handleAddExercise = (name, bodyPart) => {
    navigate(exerciseHref(name), { state: { bodyPart } })
  }

  return (
    <AppLayout>
      <div className="px-4 pt-10 pb-4">
        <h1 className="font-display text-xl font-bold text-white">Log workout</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400">{formatDayKey(dayKey)}</p>
          {!isTodayKey && (
            <span className="text-[10px] font-bold uppercase tracking-wide
                             px-1.5 py-0.5 rounded-full border
                             bg-red-900/30 text-red-300 border-red-900">
              past day
            </span>
          )}
        </div>
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

        {/* above the list: adding the next exercise is what you came here
            to do, and the list grows past the fold once every exercise
            shows its sets */}
        {!loading && (
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full border border-dashed border-gray-700 text-gray-500
                       rounded-xl py-4 text-sm active:border-red-700
                       active:text-red-500 transition-colors"
          >
            + Add exercise
          </button>
        )}

        {!loading && exercises.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💪</p>
            <p className="text-gray-400 font-medium">No exercises yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Use “Add exercise” above to get started
            </p>
          </div>
        )}

        {exercises.map(ex => {
          const sets = ex.sets || []
          const bestSet = sets.reduce((best, s) =>
            (!best || s.weight > best.weight) ? s : best, null)

          return (
            <button
              key={ex.name}
              onClick={() => navigate(exerciseHref(ex.name))}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl
                         px-4 py-3.5 text-left block
                         active:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">{ex.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ex.bodyPart} · {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
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
              </div>

              {/* same row treatment as the home card: a numbered chip, the
                  figures carrying the emphasis and the units muted, all in
                  one grid so the columns line up down the list. Weight
                  first, matching every other set list in the app. */}
              {sets.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800 grid
                                grid-cols-[1.5rem_1fr_auto] items-center gap-x-3 gap-y-0.5">
                  {sets.map((s, i) => (
                    <Fragment key={i}>
                      <span className="h-5 rounded-md bg-gray-800/80 text-[10px] font-medium
                                       text-gray-500 flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="flex items-center justify-end gap-1.5">
                        {standingAchievements(s, badgesByExercise[ex.name]).map(kind => (
                          <AchievementBadge key={kind} kind={kind} />
                        ))}
                      </span>
                      <span className="text-sm tabular-nums text-right whitespace-nowrap">
                        <span className="text-white font-semibold">{s.weight}</span>
                        <span className="text-gray-500 text-xs ml-0.5">kg</span>
                        <span className="text-gray-600 mx-1.5">×</span>
                        <span className="text-white font-semibold">{s.reps}</span>
                        <span className="text-gray-500 text-xs ml-0.5">reps</span>
                      </span>
                    </Fragment>
                  ))}
                </div>
              )}
            </button>
          )
        })}
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

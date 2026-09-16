import { useState, useMemo }  from 'react'
import { useNavigate }        from 'react-router-dom'
import { useAuth }            from '../hooks/useAuth'
import { useWorkouts }        from '../hooks/useWorkouts'
import AppLayout              from '../components/layout/AppLayout'
import WorkoutCard            from '../components/workout/WorkoutCard'
import CalendarSheet          from '../components/workout/CalendarSheet'
import { getActiveSession, toGymDayKey, formatDayKey } from '../utils/workoutDays'
import { getBadgeAssignmentsByExercise } from '../utils/progressHelpers'

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-1/3" />
      <div className="h-3 bg-gray-800 rounded w-1/4" />
      <div className="h-3 bg-gray-800 rounded w-full" />
      <div className="h-3 bg-gray-800 rounded w-5/6" />
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { workouts, loading, error, deleteById, updateById } = useWorkouts()
  const navigate = useNavigate()

  const [actionError,  setActionError]  = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)

  // which day the card is showing. null = today's session; otherwise a
  // day key. Stepping back moves through days you actually trained, not
  // every calendar day — walking past empty ones would take a press each.
  const [viewDay, setViewDay] = useState(null)

  // "today" follows the server's rolling 24h window rather than the
  // calendar date, so this card always agrees with what the Log tab will
  // append to — see utils/workoutDays.js
  const today = useMemo(() => getActiveSession(workouts), [workouts])

  // past workouts, newest first, excluding whatever today's session is
  const pastWorkouts = useMemo(() => {
    const active = today?._id
    return workouts
      .filter(w => w._id !== active)
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [workouts, today])

  const viewIndex = viewDay
    ? pastWorkouts.findIndex(w => toGymDayKey(w.createdAt) === viewDay)
    : -1

  const shown       = viewIndex >= 0 ? pastWorkouts[viewIndex] : today
  const isToday     = viewIndex < 0
  const hasEarlier  = viewIndex + 1 < pastWorkouts.length

  const setCount = shown
    ? shown.exercises.reduce((n, ex) => n + ex.sets.length, 0)
    : 0

  // Badges need the full history of each exercise, which every workout in
  // the account already carries — no extra fetch. Built once here rather
  // than per card so stepping between days doesn't recompute it.
  const badgesByExercise = useMemo(
    () => getBadgeAssignmentsByExercise(workouts),
    [workouts]
  )

  const stepBack = () => {
    const next = pastWorkouts[viewIndex + 1]
    if (next) setViewDay(toGymDayKey(next.createdAt))
  }

  const handleDelete = async (id) => {
    setActionError('')
    try {
      await deleteById(id)
      if (!isToday) setViewDay(null)   // the day just vanished from under us
    } catch { setActionError('Failed to delete workout — try again') }
  }

  const handleUpdate = async (id, exercises) => {
    setActionError('')
    try { await updateById(id, exercises) }
    catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save changes — try again')
    }
  }

  const handlePickDay = (key, hasWorkout) => {
    setCalendarOpen(false)
    if (today && toGymDayKey(today.createdAt) === key) { setViewDay(null); return }
    // a day you trained is shown right here; an empty one opens the
    // logger for that date, which is the point of picking it
    if (hasWorkout) setViewDay(key)
    else navigate(`/log?date=${key}`)
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-10 pb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome back</p>
          <h1 className="font-display text-2xl font-bold text-white">
            {user?.username ?? 'Athlete'} 👋
          </h1>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-400 border border-gray-800 px-3 py-1.5 rounded-full"
        >
          Logout
        </button>
      </div>

      {/* The day being shown */}
      <div className="px-4 mb-4">
        <div className="flex justify-between items-baseline mb-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {isToday ? 'Today' : formatDayKey(viewDay)}
          </h2>
          <div className="flex items-center gap-3">
            {shown && (
              <span className="text-xs text-gray-400">
                {shown.exercises.length} exercise{shown.exercises.length === 1 ? '' : 's'}
                {' · '}{setCount} set{setCount === 1 ? '' : 's'}
              </span>
            )}
            {!isToday && (
              <button
                onClick={() => setViewDay(null)}
                className="text-xs text-red-400 font-medium active:text-red-300 transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {loading && <SkeletonCard />}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {actionError && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4
                          text-red-400 text-sm mb-3 flex justify-between items-center">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-red-500 text-xs ml-2">✕</button>
          </div>
        )}

        {!loading && !error && shown && (
          <div className="space-y-3">
            {isToday && (
              <button
                onClick={() => navigate('/log')}
                className="w-full bg-red-600 active:scale-95 transition-all
                           text-white font-semibold py-4 rounded-xl text-base"
              >
                + Add to today's workout
              </button>
            )}
            <WorkoutCard
              workout={shown}
              expandSets
              badgesFor={name => badgesByExercise[name]}
              onDelete={() => handleDelete(shown._id)}
              onUpdate={(exercises) => handleUpdate(shown._id, exercises)}
            />
            {!isToday && (
              <button
                onClick={() => navigate(`/log?date=${viewDay}`)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3.5
                           text-sm font-medium text-gray-300
                           active:border-gray-700 transition-colors"
              >
                + Add to this day
              </button>
            )}
          </div>
        )}

        {!loading && !error && !shown && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-3xl mb-2">🏋️</p>
            <p className="text-gray-300 font-medium">Nothing logged yet today</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              {workouts.length === 0
                ? 'Log your first session to get started'
                : 'Pick up where you left off'}
            </p>
            <button
              onClick={() => navigate('/log')}
              className="w-full bg-red-600 active:scale-95 transition-all
                         text-white font-semibold py-3.5 rounded-xl text-base"
            >
              + Log today's workout
            </button>
          </div>
        )}
      </div>

      {/* Step back a day at a time */}
      {!loading && !error && (
        <div className="px-4">
          <div className="flex gap-3">
            <button
              onClick={stepBack}
              disabled={!hasEarlier}
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4
                         flex items-center justify-between transition-colors
                         active:border-gray-700
                         disabled:opacity-40 disabled:active:border-gray-800"
            >
              <span className="text-sm font-medium text-gray-300">
                {hasEarlier
                  ? (isToday ? 'Previous workout' : 'Earlier day')
                  : 'No earlier workouts'}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            <button
              onClick={() => setCalendarOpen(true)}
              aria-label="Open calendar"
              className="w-[58px] bg-gray-900 border border-gray-800 rounded-xl
                         flex items-center justify-center text-gray-300
                         active:border-gray-700 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2"/>
                <path d="M3 10h18M8 3v4M16 3v4"/>
              </svg>
            </button>
          </div>

          <button
            onClick={() => navigate('/history')}
            className="w-full mt-3 text-xs text-gray-500 active:text-gray-300 transition-colors py-1"
          >
            All workouts →
          </button>
        </div>
      )}

      {calendarOpen && (
        <CalendarSheet
          workouts={workouts}
          onPick={handlePickDay}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </AppLayout>
  )
}

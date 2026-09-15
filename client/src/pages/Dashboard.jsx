import { useState, useMemo }  from 'react'
import { useNavigate }        from 'react-router-dom'
import { useAuth }            from '../hooks/useAuth'
import { useWorkouts }        from '../hooks/useWorkouts'
import AppLayout              from '../components/layout/AppLayout'
import WorkoutCard            from '../components/workout/WorkoutCard'
import CalendarSheet          from '../components/workout/CalendarSheet'
import { getActiveSession, toDayKey } from '../utils/workoutDays'

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

  // "today" here follows the server's rolling 24h window rather than the
  // calendar date, so this card always agrees with what the Log tab will
  // append to — see utils/workoutDays.js
  const today = useMemo(() => getActiveSession(workouts), [workouts])

  const todaysSetCount = today
    ? today.exercises.reduce((n, ex) => n + ex.sets.length, 0)
    : 0

  const handleDelete = async (id) => {
    setActionError('')
    try { await deleteById(id) }
    catch { setActionError('Failed to delete workout — try again') }
  }

  const handleUpdate = async (id, exercises) => {
    setActionError('')
    try { await updateById(id, exercises) }
    catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save changes — try again')
    }
  }

  const handlePickDay = (key) => {
    setCalendarOpen(false)
    // today's session lives on this screen, so a tap on it just closes
    if (today && toDayKey(today.createdAt) === key) return
    navigate(`/history?date=${key}`)
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

      {/* Today */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Today
          </h2>
          {today && (
            <span className="text-xs text-gray-400">
              {today.exercises.length} exercise{today.exercises.length === 1 ? '' : 's'}
              {' · '}
              {todaysSetCount} set{todaysSetCount === 1 ? '' : 's'}
            </span>
          )}
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

        {!loading && !error && today && (
          <div className="space-y-3">
            <WorkoutCard
              workout={today}
              onDelete={() => handleDelete(today._id)}
              onUpdate={(exercises) => handleUpdate(today._id, exercises)}
            />
            <button
              onClick={() => navigate('/log')}
              className="w-full bg-red-600 active:scale-95 transition-all
                         text-white font-semibold py-4 rounded-xl text-base"
            >
              + Add to today's workout
            </button>
          </div>
        )}

        {!loading && !error && !today && (
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

      {/* Browse past sessions */}
      <div className="px-4">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/history')}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4
                       flex items-center justify-between active:border-gray-700 transition-colors"
          >
            <span className="text-sm font-medium text-gray-300">Previous workouts</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
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
      </div>

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

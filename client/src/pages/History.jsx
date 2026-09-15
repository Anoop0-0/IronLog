import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout      from '../components/layout/AppLayout'
import WorkoutCard    from '../components/workout/WorkoutCard'
import CalendarSheet  from '../components/workout/CalendarSheet'
import { useWorkouts } from '../hooks/useWorkouts'
import { getActiveSession, toDayKey, groupByDay } from '../utils/workoutDays'

const dayLabel = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function History() {
  const { workouts, loading, error, deleteById, updateById } = useWorkouts()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [actionError,  setActionError]  = useState('')

  const focusedDay = params.get('date')
  const dayRefs    = useRef({})

  // the current rolling-window session lives on the home screen, so it's
  // excluded here — otherwise it'd show up in both places at once
  const active = useMemo(() => getActiveSession(workouts), [workouts])
  const past   = useMemo(
    () => workouts.filter(w => !active || w._id !== active._id),
    [workouts, active]
  )

  const byDay = useMemo(() => groupByDay(past), [past])
  const dayKeys = useMemo(
    () => Object.keys(byDay).sort().reverse(),   // newest day first
    [byDay]
  )

  // scroll the deep-linked day into view once its card has rendered
  useEffect(() => {
    if (!focusedDay || loading) return
    const el = dayRefs.current[focusedDay]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusedDay, loading, dayKeys.length])

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
    // the active session isn't in this list — send those taps home,
    // where that workout actually lives
    if (active && toDayKey(active.createdAt) === key && !byDay[key]) {
      navigate('/dashboard')
      return
    }
    setParams({ date: key })
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-10 pb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 active:text-white p-1 -m-1 mt-0.5"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-white">Previous workouts</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? 'Loading…' : `${past.length} session${past.length === 1 ? '' : 's'} logged`}
          </p>
        </div>
        <button
          onClick={() => setCalendarOpen(true)}
          aria-label="Open calendar"
          className="w-9 h-9 rounded-lg bg-gray-900 border border-gray-800 text-gray-300
                     flex items-center justify-center active:bg-gray-800 transition-colors"
        >
          <CalendarIcon />
        </button>
      </div>

      {focusedDay && (
        <div className="px-4 mb-3">
          <button
            onClick={() => setParams({})}
            className="inline-flex items-center gap-2 text-xs bg-red-900/20 border
                       border-red-900 text-red-400 rounded-full px-3 py-1.5"
          >
            {dayLabel(focusedDay)}
            <span className="text-red-500">✕</span>
          </button>
        </div>
      )}

      <div className="px-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

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

        {!loading && !error && dayKeys.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📒</p>
            <p className="text-gray-400 font-medium">No previous workouts</p>
            <p className="text-gray-400 text-sm mt-1">
              Sessions you finish will be listed here
            </p>
          </div>
        )}

        {!loading && !error && dayKeys.length > 0 && (
          <div className="space-y-6">
            {dayKeys.map(key => (
              <div
                key={key}
                ref={el => { dayRefs.current[key] = el }}
                className={`scroll-mt-4 ${
                  focusedDay && focusedDay !== key ? 'opacity-40' : ''
                } transition-opacity`}
              >
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {dayLabel(key)}
                </h2>
                <div className="space-y-3">
                  {byDay[key].map(w => (
                    <WorkoutCard
                      key={w._id}
                      workout={w}
                      onDelete={() => handleDelete(w._id)}
                      onUpdate={(exercises) => handleUpdate(w._id, exercises)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M3 10h18M8 3v4M16 3v4"/>
    </svg>
  )
}

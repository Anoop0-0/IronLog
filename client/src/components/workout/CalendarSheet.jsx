import { useState, useMemo } from 'react'
import { groupByDay, todayKey as gymTodayKey, buildMonthGrid } from '../../utils/workoutDays'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// z-[60], not z-50 — the fixed navbar sits at z-50 and renders later in
// the DOM, so an equal z-index lets it paint over the bottom of the sheet.
export default function CalendarSheet({ workouts, onPick, onClose }) {
  // the gym day in progress, not the wall-clock date — between midnight
  // and 4am the ring stays on the day you're still training, the month
  // opens on that day's month, and the day that hasn't begun is greyed
  // out (the server rejects it too)
  const todayKey = gymTodayKey()
  const [ty, tm, td] = todayKey.split('-').map(Number)
  const today = new Date(ty, tm - 1, td)

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const byDay = useMemo(() => groupByDay(workouts), [workouts])
  const cells = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  )

  const shiftMonth = (delta) =>
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))

  // nothing to browse past the current month — workouts can't be logged
  // in the future, so let the control tell you that instead of going blank
  const atCurrentMonth =
    cursor.getFullYear() === today.getFullYear() &&
    cursor.getMonth()    === today.getMonth()

  const monthCount = cells.filter(c => c && byDay[c.key]).length

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[60] flex flex-col justify-end"
      onClick={onClose}
    >
      {/* max-w-lg mirrors AppLayout's content width — this is position:
          fixed, so without it the sheet spans the whole viewport and the
          aspect-square day cells blow up to ~200px on a desktop screen.
          max-h keeps a tall month (6 rows) scrollable instead of running
          off the bottom on short viewports. */}
      <div
        className="bg-gray-900 rounded-t-2xl pb-24 w-full max-w-lg mx-auto
                   max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-4 pb-3">
          <div>
            <h2 className="font-semibold text-white">Jump to a day</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {monthCount === 0
                ? 'Tap a day to log a workout on it'
                : `${monthCount} workout${monthCount === 1 ? '' : 's'} · tap any day to log`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-sm px-2 py-1">
            Close
          </button>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 pb-3">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="w-9 h-9 rounded-lg bg-gray-800 text-gray-300 flex items-center
                       justify-center active:bg-gray-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <span className="text-sm font-medium text-white">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </span>

          <button
            onClick={() => shiftMonth(1)}
            disabled={atCurrentMonth}
            aria-label="Next month"
            className="w-9 h-9 rounded-lg bg-gray-800 text-gray-300 flex items-center
                       justify-center active:bg-gray-700 transition-colors
                       disabled:opacity-30 disabled:active:bg-gray-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1 px-4 pb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-gray-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 px-4">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`pad-${i}`} />

            const hasWorkout = !!byDay[cell.key]
            const isToday    = cell.key === todayKey
            const isFuture   = cell.key > todayKey   // safe: keys are zero-padded YYYY-MM-DD

            return (
              <button
                key={cell.key}
                onClick={() => !isFuture && onPick(cell.key, hasWorkout)}
                disabled={isFuture}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center
                            gap-0.5 text-sm transition-colors
                            ${hasWorkout
                              ? 'bg-gray-800 text-white active:bg-red-900/40'
                              : isFuture
                              ? 'text-gray-700'
                              : 'text-gray-400 active:bg-gray-800'}
                            ${isToday ? 'ring-1 ring-red-500' : ''}`}
              >
                <span className={isToday ? 'text-red-400 font-semibold' : ''}>
                  {cell.day}
                </span>
                {/* dot marks a day that actually has a workout to open */}
                <span
                  className={`w-1 h-1 rounded-full ${hasWorkout ? 'bg-red-500' : 'bg-transparent'}`}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

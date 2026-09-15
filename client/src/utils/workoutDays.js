// Day-bucketing helpers for the home screen's "today" card, the history
// list, and the calendar picker.
//
// There are two different notions of "today" in play and they are NOT
// interchangeable:
//
//   1. The server's rolling 24-hour window (see server dateWindow.js).
//     This is what /workouts/today and every addSetToToday call use, so
//     it decides which workout your next logged set lands in.
//   2. The calendar date a workout was started on. This is what a
//     calendar grid means when you tap "Sep 12".
//
// They disagree for late-night sessions: train at 11pm Monday, and at
// 12:30am Tuesday the server still treats Monday's workout as the one
// you're logging into. So the home screen keys off (1) — otherwise it
// would claim "nothing logged today" while the Log tab is happily
// appending to a session — and the history/calendar views key off (2),
// which is what a date on a calendar actually means.

export const TODAY_WINDOW_MS = 24 * 60 * 60 * 1000

// The workout the next logged set would go into, matching the server's
// rolling window. At most one exists, since the server only creates a
// new workout once the previous one falls outside the window.
export const getActiveSession = (workouts, now = Date.now()) => {
  const cutoff = now - TODAY_WINDOW_MS
  const inWindow = workouts.filter(w => new Date(w.createdAt).getTime() >= cutoff)
  if (inWindow.length === 0) return null
  // newest first, in case the list isn't sorted
  return inWindow.reduce((newest, w) =>
    new Date(w.createdAt) > new Date(newest.createdAt) ? w : newest
  )
}

// 'YYYY-MM-DD' in LOCAL time. Deliberately not toISOString() — that
// converts to UTC first, which shifts the date across midnight for
// anyone not on UTC and would file workouts under the wrong day.
export const toDayKey = (dateLike) => {
  const d = new Date(dateLike)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

// { 'YYYY-MM-DD': [workout, ...] } — a day can hold more than one
// workout (the rolling window can roll over within a single calendar
// day), so the value is always an array.
export const groupByDay = (workouts) => {
  const days = {}
  workouts.forEach(w => {
    const key = toDayKey(w.createdAt)
    if (!days[key]) days[key] = []
    days[key].push(w)
  })
  return days
}

// Cells for a month grid, padded with nulls so the 1st lands under the
// right weekday. Week starts Monday, matching the rest of the app
// (getWeeklyVolume buckets by Monday too).
export const buildMonthGrid = (year, month) => {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // JS getDay(): 0=Sun..6=Sat. Shift so Monday=0.
  const leading = (first.getDay() + 6) % 7

  const cells = Array(leading).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: toDayKey(new Date(year, month, day)) })
  }
  return cells
}

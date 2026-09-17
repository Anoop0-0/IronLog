// Day-bucketing helpers for the home screen's "today" card, the history
// list, and the calendar picker.
//
// ONE definition of a day, used by every screen and mirrored on the
// server (see server utils/targetDay.js): the GYM DAY, running
// 04:00 -> 04:00 rather than midnight to midnight.
//
// It used to be two definitions — a rolling 24-hour window for "today"
// and the calendar date everywhere else — and they disagreed constantly.
// Train at 10:23am on Monday and at 10:10am Tuesday the home screen still
// called Monday's session "today", so the next set logged was appended to
// Monday's workout and then appeared under Monday in history and the
// calendar. Thirteen minutes later the same session silently stopped
// being today's. The rolling window existed because the server couldn't
// know the user's timezone; dayKeyToNoon solved that, and this replaces
// the workaround.
//
// The 4am boundary keeps the one case the rolling window got right: a
// session that starts at 11pm and finishes after midnight stays a single
// workout on the day it started.
export const GYM_DAY_START_HOUR = 4

const GYM_DAY_OFFSET_MS = GYM_DAY_START_HOUR * 60 * 60 * 1000

// Which gym day a moment belongs to. Shifting back by the boundary and
// then taking the local date is all there is to it: 00:30 on Tuesday
// becomes 20:30 Monday, and so reads as Monday.
export const toGymDayKey = (dateLike) =>
  toDayKey(new Date(new Date(dateLike).getTime() - GYM_DAY_OFFSET_MS))

// The gym day currently in progress — what every screen means by "today".
export const todayKey = (now = Date.now()) => toGymDayKey(now)

// The workout the next logged set would go into: the one belonging to the
// gym day in progress. At most one exists, since the server joins further
// sets to it rather than starting a rival entry.
export const getActiveSession = (workouts, now = Date.now()) => {
  const key = todayKey(now)
  const today = workouts.filter(w =>
    toGymDayKey(w.createdAt) === key &&
    // a future timestamp is never the session you're logging into, and
    // sorting newest-first would otherwise let one win
    new Date(w.createdAt).getTime() <= now
  )
  if (today.length === 0) return null
  // newest first, in case the list isn't sorted
  return today.reduce((newest, w) =>
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

// { 'YYYY-MM-DD': [workout, ...] } — keyed by gym day, so history and
// the calendar file a session on the same day the home screen calls it.
// Still an array per day: older data can hold more than one workout on a
// day, from back when the rolling window could roll over within one.
export const groupByDay = (workouts) => {
  const days = {}
  workouts.forEach(w => {
    const key = toGymDayKey(w.createdAt)
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

// A day key ('2026-09-08') as the ISO instant of LOCAL NOON on that day.
// This is what every date-aware API call sends: the server can't know the
// user's timezone, and noon is never within 12 hours of a day boundary in
// any offset, so it identifies the local day unambiguously. Building it
// from local date parts (not Date.parse of the key, which is UTC) is what
// makes that true.
export const dayKeyToNoon = (dayKey) => {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString()
}

export const isToday = (dayKey) => dayKey === todayKey()

// human label for a day key, e.g. 'Monday, Sep 8'
export const formatDayKey = (dayKey) => {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

// 'Today' / 'Yesterday' / 'Sep 8' for a workout's timestamp.
//
// Compares which DAY each moment falls in, never how many hours apart
// they are. The old version did `Math.floor((now - then) / 86400000)`,
// which made a session from 8pm last night read "Today" at 10am, and one
// from 46 hours ago read "Yesterday" — the label drifted with the clock
// instead of naming the day.
export const relativeDayLabel = (dateLike, now = Date.now()) => {
  const key = toGymDayKey(dateLike)
  if (key === todayKey(now)) return 'Today'
  if (key === todayKey(now - 24 * 60 * 60 * 1000)) return 'Yesterday'

  // from the key's own parts, so the label names the gym day rather than
  // the wall-clock date of a session that ran past midnight
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

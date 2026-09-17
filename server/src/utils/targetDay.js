// Resolving which workout a set belongs to.
//
// The server can't turn "Sep 8" into a time range on its own — it doesn't
// know the user's timezone, and guessing is how you get sets filed under
// the wrong day. So the client sends `date` as the ISO timestamp of LOCAL
// NOON on the day it means. Noon is the useful part: a local day never
// extends more than 12 hours either side of it, whatever the offset or
// DST, so noon identifies the local day unambiguously.
//
// A "day" here is the GYM DAY, which runs 04:00 -> 04:00 rather than
// midnight to midnight. Training that starts at 11pm and finishes at
// 00:30 is one session, and splitting it across two dates because a
// clock rolled over is wrong in the way that actually annoys people.
// Four in the morning is late enough to catch any real session and early
// enough that nobody's next workout has started.
export const GYM_DAY_START_HOUR = 4

const HOUR_MS = 60 * 60 * 1000
const HALF_DAY_MS = 12 * HOUR_MS

// offsets from local noon to the two ends of that gym day
export const BEFORE_NOON_MS = HALF_DAY_MS - GYM_DAY_START_HOUR * HOUR_MS  //  8h -> 04:00
export const AFTER_NOON_MS  = HALF_DAY_MS + GYM_DAY_START_HOUR * HOUR_MS  // 16h -> 04:00 next

// a little slack for a client clock that's running fast
const CLOCK_SKEW_MS = 5 * 60 * 1000

// [04:00 that day, 04:00 the next). Consecutive days tile exactly, so a
// timestamp lands in one window and no other.
//
// DST caveat: the server only ever receives an instant, never a timezone,
// so these are fixed offsets from noon. On a spring-forward or fall-back
// day the real boundary lands at 03:00 or 05:00 local instead of 04:00.
// That only matters for a set logged inside that one shifted hour, which
// is a far smaller error than the whole-day misfiling this replaces.
export const dayWindow = (date) => ({
  $gte: new Date(date.getTime() - BEFORE_NOON_MS),
  $lt:  new Date(date.getTime() + AFTER_NOON_MS),
})

// Workouts can't be logged into the future. Without this, a bad (or
// deliberate) date would park a workout somewhere no UI ever shows it,
// and it would quietly poison "previous sets" for every later record.
export const parseTargetDate = (value) => {
  if (value === undefined || value === null || value === '') return { date: null }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { error: 'A valid date is required' }
  }
  // Compare against the START of the target gym day, not noon: a client
  // east of UTC sends a noon that is legitimately hours ahead of the
  // server's clock. What makes a day future is that it hasn't begun.
  if (date.getTime() - BEFORE_NOON_MS > Date.now() + CLOCK_SKEW_MS) {
    return { error: "You can't log a workout in the future" }
  }
  return { date }
}

// The timestamp a workout newly created for this day should carry.
//
// When the day is the one currently running, that's simply now — which
// keeps the real time of the session, and during the small hours files
// it under the gym day that is still in progress rather than the date on
// the clock. Only genuine backdating falls back to noon, where there is
// no real time to record.
//
// Either way the result is never in the future: if `now` is outside the
// window, parseTargetDate has already established the window isn't ahead
// of us, so it's behind us and noon is in the past.
export const createdAtForDay = (date, now = new Date()) => {
  const win = dayWindow(date)
  return now >= win.$gte && now < win.$lt ? now : date
}

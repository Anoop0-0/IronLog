// Resolving which workout a set belongs to, for logging on a past day.
//
// The server can't turn "Sep 8" into a time range on its own — it doesn't
// know the user's timezone, and guessing is how you get sets filed under
// the wrong day. So the client sends `date` as the ISO timestamp of LOCAL
// NOON on the day it means. Noon is the useful part: a local day never
// extends more than 12 hours either side of it, whatever the offset or
// DST, so [noon-12h, noon+12h) is exactly that local day.
export const DAY_HALF_MS = 12 * 60 * 60 * 1000

// a little slack for a client clock that's running fast
const CLOCK_SKEW_MS = 5 * 60 * 1000

// Workouts can't be logged into the future. Without this, a bad (or
// deliberate) date would park a workout somewhere no UI ever shows it,
// and it would quietly poison "previous sets" for every later record.
export const parseTargetDate = (value) => {
  if (value === undefined || value === null || value === '') return { date: null }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { error: 'A valid date is required' }
  }
  // compare against the START of the target day, so "today" sent as local
  // noon isn't rejected in timezones where that noon is still ahead of UTC now
  if (date.getTime() - DAY_HALF_MS > Date.now() + CLOCK_SKEW_MS) {
    return { error: "You can't log a workout in the future" }
  }
  return { date }
}

export const dayWindow = (date) => ({
  $gte: new Date(date.getTime() - DAY_HALF_MS),
  $lt:  new Date(date.getTime() + DAY_HALF_MS),
})

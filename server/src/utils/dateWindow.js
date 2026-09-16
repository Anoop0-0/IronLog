// LEGACY fallback for requests that carry no `date`.
//
// "Today" used to mean a rolling 24-hour window everywhere, because the
// server had no way to know the caller's timezone. That is no longer
// true — every client now sends the local noon of the day it means (see
// utils/targetDay.js), which pins the gym day exactly. The rolling
// window was wrong in a way users felt: at 10am a session from 10:23am
// the previous day was still "today's", so the next set logged was
// appended to yesterday's workout and showed up under yesterday's date.
//
// This survives only so a stale client bundle still gets a sane answer
// instead of an error. Nothing in the current app reaches it.
export const TODAY_WINDOW_MS = 24 * 60 * 60 * 1000

export const getTodayWindowStart = () => new Date(Date.now() - TODAY_WINDOW_MS)

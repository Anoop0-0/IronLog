// "Today" is defined as a rolling 24-hour window (not calendar day) to
// avoid timezone bugs — see commit history on addSetToToday/updateSetInToday.
export const TODAY_WINDOW_MS = 24 * 60 * 60 * 1000

export const getTodayWindowStart = () => new Date(Date.now() - TODAY_WINDOW_MS)

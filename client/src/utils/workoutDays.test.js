import { describe, it, expect } from 'vitest'
import {
  getActiveSession,
  toDayKey,
  groupByDay,
  buildMonthGrid,
  TODAY_WINDOW_MS,
  dayKeyToNoon,
  isToday,
  formatDayKey,
} from './workoutDays'

const workout = (createdAt, _id = createdAt) => ({ _id, createdAt, exercises: [] })

describe('getActiveSession', () => {
  const now = new Date('2026-09-15T20:00:00').getTime()

  it('returns the workout inside the rolling 24h window', () => {
    const w = workout(new Date(now - 3 * 60 * 60 * 1000).toISOString())
    expect(getActiveSession([w], now)).toBe(w)
  })

  it('returns null when the newest workout has fallen outside the window', () => {
    const old = workout(new Date(now - TODAY_WINDOW_MS - 1000).toISOString())
    expect(getActiveSession([old], now)).toBeNull()
  })

  it('still finds a late-night session from the previous calendar day', () => {
    // trained 11pm "yesterday", it is now 8pm today -> 21h ago, still
    // the session the server would append to
    const lateNight = workout(new Date(now - 21 * 60 * 60 * 1000).toISOString())
    expect(getActiveSession([lateNight], now)).toBe(lateNight)
  })

  it('picks the newest when several sit inside the window', () => {
    const older = workout(new Date(now - 10 * 60 * 60 * 1000).toISOString(), 'older')
    const newer = workout(new Date(now - 1 * 60 * 60 * 1000).toISOString(), 'newer')
    expect(getActiveSession([older, newer], now)._id).toBe('newer')
  })

  it('returns null for no workouts', () => {
    expect(getActiveSession([], now)).toBeNull()
  })
})

describe('toDayKey', () => {
  it('formats as YYYY-MM-DD with zero padding', () => {
    expect(toDayKey(new Date(2026, 8, 5))).toBe('2026-09-05')
  })

  it('uses local date, not UTC — a late-evening time keeps its own day', () => {
    // 11:30pm local on Sep 14. toISOString() would roll this to Sep 15
    // for anyone behind UTC, filing the workout under the wrong day.
    const lateLocal = new Date(2026, 8, 14, 23, 30)
    expect(toDayKey(lateLocal)).toBe('2026-09-14')
  })
})

describe('groupByDay', () => {
  it('buckets workouts by their local calendar date', () => {
    const a = workout(new Date(2026, 8, 14, 10).toISOString(), 'a')
    const b = workout(new Date(2026, 8, 15, 10).toISOString(), 'b')
    const grouped = groupByDay([a, b])
    expect(Object.keys(grouped).sort()).toEqual(['2026-09-14', '2026-09-15'])
  })

  it('keeps multiple workouts from the same day together', () => {
    const a = workout(new Date(2026, 8, 14, 7).toISOString(), 'a')
    const b = workout(new Date(2026, 8, 14, 19).toISOString(), 'b')
    expect(groupByDay([a, b])['2026-09-14']).toHaveLength(2)
  })

  it('returns an empty object for no workouts', () => {
    expect(groupByDay([])).toEqual({})
  })
})

describe('buildMonthGrid', () => {
  it('pads so the 1st falls on the right weekday (Monday-start)', () => {
    // Sep 2026: the 1st is a Tuesday -> exactly 1 leading blank
    const cells = buildMonthGrid(2026, 8)
    expect(cells[0]).toBeNull()
    expect(cells[1]).toMatchObject({ day: 1, key: '2026-09-01' })
  })

  it('emits one cell per day of the month', () => {
    expect(buildMonthGrid(2026, 8).filter(Boolean)).toHaveLength(30) // September
    expect(buildMonthGrid(2026, 1).filter(Boolean)).toHaveLength(28) // Feb 2026
  })

  it('handles a month starting on Sunday (6 leading blanks, not 0)', () => {
    // Nov 2026 starts on a Sunday — the off-by-one trap in Monday-start grids
    const cells = buildMonthGrid(2026, 10)
    expect(cells.slice(0, 6).every(c => c === null)).toBe(true)
    expect(cells[6]).toMatchObject({ day: 1 })
  })

  it('accounts for leap years', () => {
    expect(buildMonthGrid(2028, 1).filter(Boolean)).toHaveLength(29)
  })
})

describe('dayKeyToNoon', () => {
  it('lands on local noon of that day, not UTC midnight', () => {
    const iso = dayKeyToNoon('2026-09-08')
    const d = new Date(iso)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(8)
    expect(d.getHours()).toBe(12)
  })

  it('round-trips through toDayKey for every month boundary', () => {
    ;['2026-01-01', '2026-02-28', '2026-03-01', '2026-12-31'].forEach(key => {
      expect(toDayKey(dayKeyToNoon(key))).toBe(key)
    })
  })

  it('stays on the right day across a DST changeover', () => {
    // US DST springs forward on 2026-03-08; noon is unaffected either side
    ;['2026-03-07', '2026-03-08', '2026-03-09'].forEach(key => {
      expect(toDayKey(dayKeyToNoon(key))).toBe(key)
    })
  })
})

describe('isToday / formatDayKey', () => {
  it('recognises today', () => {
    expect(isToday(toDayKey(new Date()))).toBe(true)
    expect(isToday('2020-01-01')).toBe(false)
  })

  it('formats from local parts, so the day never shifts', () => {
    expect(formatDayKey('2026-09-08')).toContain('Sep 8')
  })
})

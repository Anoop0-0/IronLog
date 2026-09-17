import { describe, it, expect } from 'vitest'
import {
  getActiveSession,
  toDayKey,
  toGymDayKey,
  todayKey,
  groupByDay,
  buildMonthGrid,
  dayKeyToNoon,
  isToday,
  formatDayKey,
  relativeDayLabel,
} from './workoutDays'

const workout = (createdAt, _id = createdAt) => ({ _id, createdAt, exercises: [] })
const local = (...args) => new Date(...args)

describe('toGymDayKey', () => {
  it('reads a normal daytime session as its own date', () => {
    expect(toGymDayKey(local(2026, 8, 15, 10, 23))).toBe('2026-09-15')
  })

  it('keeps a session that ran past midnight on the day it started', () => {
    // finished at 00:30 Tuesday after starting 11pm Monday — one session,
    // and it belongs to Monday
    expect(toGymDayKey(local(2026, 8, 15, 0, 30))).toBe('2026-09-14')
  })

  it('rolls over at 4am, not midnight', () => {
    expect(toGymDayKey(local(2026, 8, 15, 3, 59))).toBe('2026-09-14')
    expect(toGymDayKey(local(2026, 8, 15, 4, 0))).toBe('2026-09-15')
  })
})

describe('getActiveSession', () => {
  const now = local(2026, 8, 15, 20, 0).getTime()

  it("returns today's session", () => {
    const w = workout(local(2026, 8, 15, 17, 0).toISOString())
    expect(getActiveSession([w], now)).toBe(w)
  })

  it("does not treat yesterday's session as today's", () => {
    // the bug this replaces: trained 10:23am yesterday, and at 10:10am
    // today the home screen still called it "today" — so the next set
    // logged was appended to yesterday's workout
    const yesterdayMorning = local(2026, 8, 14, 23, 0).toISOString()
    expect(getActiveSession([workout(yesterdayMorning)], now)).toBeNull()
  })

  it('stays on the same session through midnight', () => {
    // 00:30, still mid-workout from an 11pm start
    const at0030 = local(2026, 8, 15, 0, 30).getTime()
    const started = workout(local(2026, 8, 14, 23, 0).toISOString())
    expect(getActiveSession([started], at0030)).toBe(started)
  })

  it('ignores a future-dated workout', () => {
    // same gym day, but ahead of the clock — never the one you're
    // logging into, and newest-first sorting would otherwise pick it
    const ahead = workout(local(2026, 8, 15, 23, 0).toISOString())
    expect(getActiveSession([ahead], now)).toBeNull()
  })

  it('picks the newest when several sit on the same day', () => {
    const older = workout(local(2026, 8, 15, 10, 0).toISOString(), 'older')
    const newer = workout(local(2026, 8, 15, 19, 0).toISOString(), 'newer')
    expect(getActiveSession([older, newer], now)._id).toBe('newer')
  })

  it('returns null for no workouts', () => {
    expect(getActiveSession([], now)).toBeNull()
  })
})

describe('relativeDayLabel', () => {
  const now = local(2026, 8, 16, 10, 10).getTime()

  it('names the day rather than counting elapsed hours', () => {
    // 23.8 hours earlier, but a different day — the old elapsed-ms
    // version called this "Today"
    expect(relativeDayLabel(local(2026, 8, 15, 10, 23), now)).toBe('Yesterday')
  })

  it('calls the current gym day Today', () => {
    expect(relativeDayLabel(local(2026, 8, 16, 9, 0), now)).toBe('Today')
  })

  it('does not call a two-day-old workout Yesterday', () => {
    // 46 hours earlier: one floor-divided day, but two calendar days
    expect(relativeDayLabel(local(2026, 8, 14, 12, 0), now)).toBe('Sep 14')
  })

  it('labels a past-midnight session with the day it started', () => {
    expect(relativeDayLabel(local(2026, 8, 15, 0, 30), now)).toBe('Sep 14')
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

  it('files a past-midnight session under the day it started', () => {
    // history and the calendar have to agree with the home screen, or a
    // session shows on one date and is called another
    const lateNight = workout(new Date(2026, 8, 15, 0, 30).toISOString(), 'late')
    expect(Object.keys(groupByDay([lateNight]))).toEqual(['2026-09-14'])
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
    // todayKey(), not toDayKey(new Date()) — those differ between
    // midnight and 4am, which would make this pass or fail by clock
    expect(isToday(todayKey())).toBe(true)
    expect(isToday('2020-01-01')).toBe(false)
  })

  it('formats from local parts, so the day never shifts', () => {
    expect(formatDayKey('2026-09-08')).toContain('Sep 8')
  })
})

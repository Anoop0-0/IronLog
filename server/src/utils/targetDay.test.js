import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseTargetDate, dayWindow, createdAtForDay,
  BEFORE_NOON_MS, AFTER_NOON_MS,
} from './targetDay.js'

const HOUR = 60 * 60 * 1000

test('parseTargetDate', async (t) => {
  await t.test('treats a missing date as "today", not an error', () => {
    assert.equal(parseTargetDate(undefined).date, null)
    assert.equal(parseTargetDate(null).date, null)
    assert.equal(parseTargetDate('').date, null)
  })

  await t.test('accepts a past day', () => {
    const past = new Date(Date.now() - 5 * 24 * HOUR).toISOString()
    assert.equal(parseTargetDate(past).date.toISOString(), past)
  })

  await t.test('rejects garbage', () => {
    assert.ok(parseTargetDate('not-a-date').error)
    assert.ok(parseTargetDate({}).error)
  })

  await t.test('rejects a day in the future', () => {
    const tomorrow = new Date(Date.now() + 2 * 24 * HOUR).toISOString()
    assert.ok(parseTargetDate(tomorrow).error)
  })

  await t.test("accepts today's local noon even where that is ahead of UTC now", () => {
    // a client just east of UTC sends noon local, which can be hours
    // ahead of the server's clock — that is still today, not the future
    const noonish = new Date(Date.now() + 6 * HOUR).toISOString()
    assert.equal(parseTargetDate(noonish).error, undefined)
  })

  await t.test('rejects a day whose 4am start has not arrived yet', () => {
    const notBegun = new Date(Date.now() + BEFORE_NOON_MS + HOUR).toISOString()
    assert.ok(parseTargetDate(notBegun).error)
  })
})

test('dayWindow', async (t) => {
  const noon = new Date('2026-09-08T12:00:00.000Z')

  await t.test('runs 04:00 to 04:00, not midnight to midnight', () => {
    const w = dayWindow(noon)
    assert.equal(w.$gte.toISOString(), '2026-09-08T04:00:00.000Z')
    assert.equal(w.$lt.toISOString(),  '2026-09-09T04:00:00.000Z')
  })

  await t.test('covers a session that starts at 11pm and ends after midnight', () => {
    const w = dayWindow(noon)
    const at11pm  = new Date('2026-09-08T23:00:00.000Z')
    const at0030  = new Date('2026-09-09T00:30:00.000Z')
    assert.ok(at11pm >= w.$gte && at11pm < w.$lt)
    assert.ok(at0030 >= w.$gte && at0030 < w.$lt)
  })

  await t.test('excludes the neighbouring days', () => {
    const w = dayWindow(noon)
    const earlyPrevious = new Date('2026-09-08T03:59:00.000Z')  // still Sep 7's day
    const nextMorning   = new Date('2026-09-09T04:01:00.000Z')
    assert.ok(earlyPrevious < w.$gte)
    assert.ok(nextMorning >= w.$lt)
  })

  await t.test('consecutive days tile with no gap and no overlap', () => {
    const next = new Date(noon.getTime() + 24 * HOUR)
    assert.equal(dayWindow(noon).$lt.getTime(), dayWindow(next).$gte.getTime())
  })
})

test('createdAtForDay', async (t) => {
  const noon = new Date('2026-09-08T12:00:00.000Z')

  await t.test('uses the real time when that day is the one in progress', () => {
    const now = new Date('2026-09-08T18:30:00.000Z')
    assert.equal(createdAtForDay(noon, now).getTime(), now.getTime())
  })

  await t.test('uses the real time during the small hours of that day', () => {
    // 00:30 on the 9th still belongs to the 8th's gym day
    const now = new Date('2026-09-09T00:30:00.000Z')
    assert.equal(createdAtForDay(noon, now).getTime(), now.getTime())
  })

  await t.test('falls back to noon when genuinely backdating', () => {
    const now = new Date('2026-09-20T09:00:00.000Z')
    assert.equal(createdAtForDay(noon, now).getTime(), noon.getTime())
  })

  await t.test('never returns a timestamp in the future', () => {
    // the small band parseTargetDate still allows: the target day's 4am
    // start is behind us but its noon is not
    const now = new Date(noon.getTime() - BEFORE_NOON_MS + HOUR)  // 05:00
    assert.ok(createdAtForDay(noon, now) <= now)
  })

  await t.test('offsets sum to a whole day', () => {
    assert.equal(BEFORE_NOON_MS + AFTER_NOON_MS, 24 * HOUR)
  })
})

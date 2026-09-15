import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTargetDate, dayWindow, DAY_HALF_MS } from './targetDay.js'

test('parseTargetDate', async (t) => {
  await t.test('treats a missing date as "today", not an error', () => {
    assert.equal(parseTargetDate(undefined).date, null)
    assert.equal(parseTargetDate(null).date, null)
    assert.equal(parseTargetDate('').date, null)
  })

  await t.test('accepts a past day', () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    assert.equal(parseTargetDate(past).date.toISOString(), past)
  })

  await t.test('rejects garbage', () => {
    assert.ok(parseTargetDate('not-a-date').error)
    assert.ok(parseTargetDate({}).error)
  })

  await t.test('rejects a day in the future', () => {
    const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    assert.ok(parseTargetDate(tomorrow).error)
  })

  await t.test("accepts today's local noon even where that is ahead of UTC now", () => {
    // a client just east of UTC sends noon local, which can be hours
    // ahead of the server's clock — that is still today, not the future
    const noonish = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    assert.equal(parseTargetDate(noonish).error, undefined)
  })

  await t.test('still rejects a date beyond one whole day ahead', () => {
    const wayAhead = new Date(Date.now() + DAY_HALF_MS + 60 * 60 * 1000).toISOString()
    assert.ok(parseTargetDate(wayAhead).error)
  })
})

test('dayWindow', async (t) => {
  await t.test('spans exactly the 24h centred on the given noon', () => {
    const noon = new Date('2026-09-08T12:00:00.000Z')
    const w = dayWindow(noon)
    assert.equal(w.$gte.toISOString(), '2026-09-08T00:00:00.000Z')
    assert.equal(w.$lt.toISOString(),  '2026-09-09T00:00:00.000Z')
  })

  await t.test('covers a late-evening and an early-morning lift on that day', () => {
    const noon = new Date('2026-09-08T12:00:00.000Z')
    const w = dayWindow(noon)
    const at11pm = new Date('2026-09-08T23:00:00.000Z')
    const at1am  = new Date('2026-09-08T01:00:00.000Z')
    assert.ok(at11pm >= w.$gte && at11pm < w.$lt)
    assert.ok(at1am  >= w.$gte && at1am  < w.$lt)
  })

  await t.test('excludes the neighbouring days', () => {
    const w = dayWindow(new Date('2026-09-08T12:00:00.000Z'))
    const dayBefore = new Date('2026-09-07T23:59:00.000Z')
    const dayAfter  = new Date('2026-09-09T00:01:00.000Z')
    assert.ok(dayBefore < w.$gte)
    assert.ok(dayAfter >= w.$lt)
  })
})

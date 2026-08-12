import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { getTodayWindowStart, TODAY_WINDOW_MS } from './dateWindow.js'

describe('getTodayWindowStart', () => {
  test('returns a timestamp exactly TODAY_WINDOW_MS in the past', () => {
    const before = Date.now()
    const start  = getTodayWindowStart()
    const after  = Date.now()

    const expectedEarliest = before - TODAY_WINDOW_MS
    const expectedLatest   = after - TODAY_WINDOW_MS

    assert.ok(start.getTime() >= expectedEarliest)
    assert.ok(start.getTime() <= expectedLatest)
  })

  test('window is exactly 24 hours', () => {
    assert.equal(TODAY_WINDOW_MS, 24 * 60 * 60 * 1000)
  })
})

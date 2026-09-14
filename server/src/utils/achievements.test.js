import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { detectSetAchievements, WEIGHT_PR, REPS_PR } from './achievements.js'

const set = (reps, weight) => ({ reps, weight })

describe('detectSetAchievements', () => {
  test('the very first set of an exercise is a weight PR', () => {
    assert.deepEqual(detectSetAchievements([], 5, 60), [WEIGHT_PR])
  })

  test('a heavier weight than ever before is a weight PR', () => {
    const previous = [set(5, 100), set(8, 90)]
    assert.deepEqual(detectSetAchievements(previous, 3, 105), [WEIGHT_PR])
  })

  test('more reps at a weight already attempted is a rep PR', () => {
    const previous = [set(5, 100), set(6, 100)]
    assert.deepEqual(detectSetAchievements(previous, 7, 100), [REPS_PR])
  })

  test('the two kinds are mutually exclusive — a new heaviest weight has no rep record to beat', () => {
    // a weight heavier than everything before it has by definition never
    // been attempted, so there is no prior rep count at it
    const previous = [set(5, 100)]
    assert.deepEqual(detectSetAchievements(previous, 2, 110), [WEIGHT_PR])

    // and repeating that weight later can then earn the rep PR
    const withThatSet = [...previous, set(2, 110)]
    assert.deepEqual(detectSetAchievements(withThatSet, 3, 110), [REPS_PR])
  })

  test('the first set at a new *sub-max* weight is not an achievement', () => {
    // 82.5 has never been done before, but it's well under the 100 already
    // lifted — trying an untested lighter weight isn't a record
    const previous = [set(5, 100)]
    assert.deepEqual(detectSetAchievements(previous, 10, 82.5), [])
  })

  test('matching an existing record is not a new record', () => {
    const previous = [set(5, 100)]
    assert.deepEqual(detectSetAchievements(previous, 5, 100), [])
  })

  test('fewer reps at the same weight is not an achievement', () => {
    const previous = [set(8, 100)]
    assert.deepEqual(detectSetAchievements(previous, 6, 100), [])
  })

  test('rep records are per-weight, not across weights', () => {
    // 12 reps at 60 doesn't make 8 reps at 100 a rep PR, and vice versa
    const previous = [set(12, 60), set(6, 100)]
    assert.deepEqual(detectSetAchievements(previous, 8, 100), [REPS_PR])
    assert.deepEqual(detectSetAchievements(previous, 10, 60), [])
  })

  test('earlier sets from the same session count as previous history', () => {
    const previous = [set(5, 100)]
    assert.deepEqual(detectSetAchievements(previous, 6, 100), [REPS_PR])
  })

  test('handles fractional plate weights', () => {
    const previous = [set(5, 62.5)]
    assert.deepEqual(detectSetAchievements(previous, 6, 62.5), [REPS_PR])
    assert.deepEqual(detectSetAchievements(previous, 1, 65), [WEIGHT_PR])
  })
})

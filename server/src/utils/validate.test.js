import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { isNonEmptyString, validateSet, MAX_REPS, MAX_WEIGHT_KG } from './validate.js'

describe('isNonEmptyString', () => {
  test('accepts a non-empty string', () => {
    assert.equal(isNonEmptyString('abc'), true)
  })

  test('rejects an empty/whitespace-only string', () => {
    assert.equal(isNonEmptyString(''), false)
    assert.equal(isNonEmptyString('   '), false)
  })

  test('rejects non-string values — this is the NoSQL-injection guard', () => {
    // e.g. a body of { "email": { "$ne": null } } must never reach a query filter
    assert.equal(isNonEmptyString({ $ne: null }), false)
    assert.equal(isNonEmptyString({ $gt: '' }), false)
    assert.equal(isNonEmptyString(null), false)
    assert.equal(isNonEmptyString(undefined), false)
    assert.equal(isNonEmptyString(123), false)
    assert.equal(isNonEmptyString(['a']), false)
  })
})

describe('validateSet', () => {
  test('accepts a normal set', () => {
    assert.equal(validateSet(8, 60), null)
  })

  test('rejects zero or negative reps', () => {
    assert.match(validateSet(0, 60), /reps/i)
    assert.match(validateSet(-5, 60), /reps/i)
  })

  test('rejects zero or negative weight', () => {
    assert.match(validateSet(8, 0), /weight/i)
    assert.match(validateSet(8, -20), /weight/i)
  })

  test('rejects values above the sanity ceiling', () => {
    assert.match(validateSet(MAX_REPS + 1, 60), /reps/i)
    assert.match(validateSet(8, MAX_WEIGHT_KG + 1), /weight/i)
  })

  test('rejects non-numeric input', () => {
    assert.match(validateSet('abc', 60), /reps/i)
    assert.match(validateSet(8, 'abc'), /weight/i)
  })

  test('accepts values right at the boundary', () => {
    assert.equal(validateSet(MAX_REPS, MAX_WEIGHT_KG), null)
    assert.equal(validateSet(1, 1), null)
  })
})

import test from 'node:test'
import assert from 'node:assert/strict'

// The bulk update path rebuilds each set from the request body. It used
// to construct { reps, weight } only, which silently dropped _id (what
// set-level edit and delete address sets by) and achievements (the only
// record of what a set earned). Saving an edit that changed nothing
// still wiped the PR history of every set in the workout.
//
// This mirrors the controller's mapping so the shape is pinned; the
// controller itself needs a database, which the smoke test deliberately
// avoids requiring.
const cleanSets = (sets) => sets.map(set => ({
  ...(set._id ? { _id: set._id } : {}),
  reps:   parseFloat(set.reps),
  weight: parseFloat(set.weight),
  achievements: set.achievements || [],
}))

test('bulk update keeps set identity and earned records', async (t) => {
  await t.test('preserves _id and achievements', () => {
    const out = cleanSets([{ _id: 'abc', reps: '6', weight: '65', achievements: ['weight'] }])
    assert.deepEqual(out, [{ _id: 'abc', reps: 6, weight: 65, achievements: ['weight'] }])
  })

  await t.test('still coerces strings from the edit inputs', () => {
    const [s] = cleanSets([{ reps: '10', weight: '50.5' }])
    assert.equal(s.reps, 10)
    assert.equal(s.weight, 50.5)
  })

  await t.test('a newly added set has no _id and an empty record list', () => {
    const [s] = cleanSets([{ reps: '5', weight: '40' }])
    assert.equal('_id' in s, false)
    assert.deepEqual(s.achievements, [])
  })
})

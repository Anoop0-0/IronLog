import test from 'node:test'
import assert from 'node:assert/strict'
import { saveOrRemoveIfEmpty } from '../controllers/workout.controller.js'

// A workout with no sets left in it used to be saved rather than
// removed, so the day went on claiming a session that had nothing in it:
// a dot on the calendar, a blank card in history, and "Previous workout"
// stepping onto an empty day. Deleting every set you had logged left the
// app still insisting you trained.
//
// The helper takes a document, so a stub is enough to pin what it does.
const stubWorkout = (exercises) => ({
  exercises,
  saved: false,
  deleted: false,
  async save()      { this.saved = true },
  async deleteOne() { this.deleted = true },
})

const ex = (name, setCount) => ({ name, sets: Array.from({ length: setCount }, () => ({})) })

test('saveOrRemoveIfEmpty', async (t) => {
  await t.test('saves a workout that still has sets', async () => {
    const w = stubWorkout([ex('Bench Press', 3)])
    const out = await saveOrRemoveIfEmpty(w)

    assert.equal(w.saved, true)
    assert.equal(w.deleted, false)
    assert.equal(out, w, 'the workout is returned so the caller can send it back')
  })

  await t.test('deletes a workout whose last exercise is gone', async () => {
    const w = stubWorkout([])
    const out = await saveOrRemoveIfEmpty(w)

    assert.equal(w.deleted, true)
    assert.equal(w.saved, false)
    assert.equal(out, null, 'null tells the client the workout no longer exists')
  })

  await t.test('deletes a workout left holding only empty exercises', async () => {
    // the edit form deletes a set at a time, so it empties the sets
    // array without ever removing the exercise itself
    const w = stubWorkout([ex('Bench Press', 0), ex('Squat', 0)])

    assert.equal(await saveOrRemoveIfEmpty(w), null)
    assert.equal(w.deleted, true)
  })

  await t.test('prunes the emptied exercises but keeps the workout', async () => {
    const w = stubWorkout([ex('Bench Press', 0), ex('Squat', 2)])
    const out = await saveOrRemoveIfEmpty(w)

    assert.equal(w.saved, true)
    assert.equal(w.deleted, false)
    assert.deepEqual(out.exercises.map(e => e.name), ['Squat'])
  })

  await t.test('leaves a workout with several live exercises alone', async () => {
    const w = stubWorkout([ex('Bench Press', 3), ex('Squat', 2)])
    const out = await saveOrRemoveIfEmpty(w)

    assert.equal(out.exercises.length, 2)
    assert.equal(w.deleted, false)
  })
})

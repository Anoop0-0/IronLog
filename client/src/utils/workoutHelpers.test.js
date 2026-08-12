import { describe, it, expect } from 'vitest'
import {
  newSet, newExercise, addSet, deleteSet, updateSet, updateNotes, deleteExercise,
} from './workoutHelpers'

describe('newSet / newExercise', () => {
  it('creates a blank set with a unique id', () => {
    const a = newSet()
    const b = newSet()
    expect(a.reps).toBe('')
    expect(a.weight).toBe('')
    expect(a.id).not.toBe(b.id)
  })

  it('creates an exercise pre-populated with one blank set', () => {
    const ex = newExercise('Bench Press', 'Chest')
    expect(ex.name).toBe('Bench Press')
    expect(ex.bodyPart).toBe('Chest')
    expect(ex.sets).toHaveLength(1)
  })
})

describe('addSet / deleteSet', () => {
  const exercises = [newExercise('Bench Press', 'Chest')]

  it('appends a set only to the matching exercise', () => {
    const result = addSet(exercises, exercises[0].id)
    expect(result[0].sets).toHaveLength(2)
  })

  it('removes only the targeted set', () => {
    const withTwo = addSet(exercises, exercises[0].id)
    const setToRemove = withTwo[0].sets[0]
    const result = deleteSet(withTwo, withTwo[0].id, setToRemove.id)
    expect(result[0].sets).toHaveLength(1)
    expect(result[0].sets.find(s => s.id === setToRemove.id)).toBeUndefined()
  })

  it('leaves other exercises untouched', () => {
    const other = newExercise('Squat', 'Legs')
    const list = [exercises[0], other]
    const result = addSet(list, exercises[0].id)
    expect(result[1].sets).toHaveLength(1)
  })
})

describe('updateSet', () => {
  it('updates the given field on the matching set only', () => {
    const ex = newExercise('Bench Press', 'Chest')
    const setId = ex.sets[0].id
    const result = updateSet([ex], ex.id, setId, 'weight', '100')
    expect(result[0].sets[0].weight).toBe('100')
    expect(result[0].sets[0].reps).toBe('')
  })
})

describe('updateNotes', () => {
  it('sets notes on the matching exercise only', () => {
    const a = newExercise('Bench Press', 'Chest')
    const b = newExercise('Squat', 'Legs')
    const result = updateNotes([a, b], a.id, 'felt strong today')
    expect(result[0].notes).toBe('felt strong today')
    expect(result[1].notes).toBe('')
  })
})

describe('deleteExercise', () => {
  it('removes only the targeted exercise', () => {
    const a = newExercise('Bench Press', 'Chest')
    const b = newExercise('Squat', 'Legs')
    const result = deleteExercise([a, b], a.id)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(b.id)
  })
})

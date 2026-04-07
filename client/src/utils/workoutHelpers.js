import { nanoid } from 'nanoid'  // unique ids

// creates a blank set
export const newSet = () => ({ id: nanoid(), reps: '', weight: '' })

// creates a blank exercise
export const newExercise = (name, bodyPart) => ({
  id: nanoid(),
  name,
  bodyPart,
  notes: '',
  sets: [newSet()],  // starts with one empty set
})

// add a set to one specific exercise
export const addSet = (exercises, exerciseId) =>
  exercises.map(ex =>
    ex.id === exerciseId
      ? { ...ex, sets: [...ex.sets, newSet()] }
      : ex
  )

// delete a set from one specific exercise
export const deleteSet = (exercises, exerciseId, setId) =>
  exercises.map(ex =>
    ex.id === exerciseId
      ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) }
      : ex
  )

// update reps or weight on a specific set
export const updateSet = (exercises, exerciseId, setId, field, value) =>
  exercises.map(ex =>
    ex.id === exerciseId
      ? {
          ...ex,
          sets: ex.sets.map(s =>
            s.id === setId ? { ...s, [field]: value } : s
          )
        }
      : ex
  )

// update notes on a specific exercise
export const updateNotes = (exercises, exerciseId, value) =>
  exercises.map(ex =>
    ex.id === exerciseId ? { ...ex, notes: value } : ex
  )

// delete an entire exercise
export const deleteExercise = (exercises, exerciseId) =>
  exercises.filter(ex => ex.id !== exerciseId)
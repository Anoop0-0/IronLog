import Workout from '../models/Workout.model.js'
import { getTodayWindowStart } from '../utils/dateWindow.js'
import { applyContestScore, applyContestScoresForExercises } from '../utils/contestScoring.js'

// ── get all workouts for logged in user ───────────────
export const getWorkouts = async (req, res, next) => {
  try {
    const workouts = await Workout.find({ userId: req.user._id })
      .sort({ createdAt: -1 })

    res.json(workouts)
  } catch (err) {
    next(err)
  }
}

// ── get just today's (rolling 24h) workout ────────────
export const getTodayWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOne({
      userId:    req.user._id,
      createdAt: { $gte: getTodayWindowStart() }
    }).sort({ createdAt: -1 })

    res.json(workout || null)
  } catch (err) {
    next(err)
  }
}

// ── log a new workout ─────────────────────────────────
export const logWorkout = async (req, res, next) => {
  try {
    const { exercises } = req.body

    if (!exercises || exercises.length === 0) {
      return res.status(400).json({ message: 'Add at least one exercise' })
    }

    const cleanedExercises = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => ({
        ...set,
        reps:   parseFloat(set.reps)   || 0,
        weight: parseFloat(set.weight) || 0,
      }))
    }))

    const workout = await Workout.create({
      userId: req.user._id,
      exercises: cleanedExercises,
    })

    await applyContestScoresForExercises(req.user._id, cleanedExercises)

    res.status(201).json(workout)
  } catch (err) {
    next(err)
  }
}

// ── delete a workout ──────────────────────────────────
export const deleteWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findById(req.params.id)

    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' })
    }

    if (workout.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    await workout.deleteOne()
    res.json({ message: 'Workout deleted' })
  } catch (err) {
    next(err)
  }
}

// ── update a workout ──────────────────────────────────
export const updateWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findById(req.params.id)

    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' })
    }

    if (workout.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const { exercises } = req.body

    const cleanedExercises = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => ({
        reps:   parseFloat(set.reps)   || 0,
        weight: parseFloat(set.weight) || 0,
      }))
    }))

    workout.exercises = cleanedExercises
    await workout.save()

    res.json(workout)
  } catch (err) {
    next(err)
  }
}

export const addSetToToday = async (req, res, next) => {
  try {
    const { exerciseName, bodyPart, notes, set } = req.body

    if (!exerciseName || !set || !set.reps || !set.weight) {
      return res.status(400).json({ message: 'Exercise name, reps and weight required' })
    }

    const cleanSet = {
      reps:   parseFloat(set.reps)   || 0,
      weight: parseFloat(set.weight) || 0,
    }

    const workout = await Workout.findOne({
      userId:    req.user._id,
      createdAt: { $gte: getTodayWindowStart() }
    }).sort({ createdAt: -1 })

    let saved
    if (!workout) {
      saved = await Workout.create({
        userId: req.user._id,
        exercises: [{
          name:     exerciseName,
          bodyPart: bodyPart || '',
          notes:    notes    || '',
          sets:     [cleanSet],
        }]
      })
    } else {
      const existingEx = workout.exercises.find(ex => ex.name === exerciseName)

      if (existingEx) {
        existingEx.sets.push(cleanSet)
        if (notes !== undefined) existingEx.notes = notes
      } else {
        workout.exercises.push({
          name:     exerciseName,
          bodyPart: bodyPart || '',
          notes:    notes    || '',
          sets:     [cleanSet],
        })
      }
      await workout.save()
      saved = workout
    }

    await applyContestScore(req.user._id, exerciseName, cleanSet.weight, cleanSet.reps)

    res.json(saved)
  } catch (err) {
    next(err)
  }
}

export const updateSetInToday = async (req, res, next) => {
  try {
    const { reps, weight, exerciseName, notes } = req.body
    const { setId } = req.params

    const workout = await Workout.findOne({
      userId:    req.user._id,
      createdAt: { $gte: getTodayWindowStart() }
    }).sort({ createdAt: -1 })

    if (!workout) {
      return res.status(404).json({ message: 'No workout found for today' })
    }

    let found      = false
    let newWeight  = 0
    let newReps    = 0

    workout.exercises.forEach(ex => {
      if (ex.name === exerciseName) {
        if (notes !== undefined) ex.notes = notes
        ex.sets.forEach(s => {
          if (s._id.toString() === setId) {
            newReps   = parseFloat(reps)   || 0
            newWeight = parseFloat(weight) || 0
            s.reps    = newReps
            s.weight  = newWeight
            found = true
          }
        })
      }
    })

    if (!found) {
      return res.status(404).json({ message: 'Set not found' })
    }

    await workout.save()

    await applyContestScore(req.user._id, exerciseName, newWeight, newReps)

    res.json(workout)
  } catch (err) {
    next(err)
  }
}

// ── update just the note text for an exercise in today's workout ──
export const updateExerciseNotesInToday = async (req, res, next) => {
  try {
    const { exerciseName, notes } = req.body

    if (!exerciseName) {
      return res.status(400).json({ message: 'Exercise name required' })
    }

    const workout = await Workout.findOne({
      userId:    req.user._id,
      createdAt: { $gte: getTodayWindowStart() }
    }).sort({ createdAt: -1 })

    if (!workout) {
      return res.status(404).json({ message: 'No workout found for today' })
    }

    const exercise = workout.exercises.find(ex => ex.name === exerciseName)
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found in today\'s workout' })
    }

    exercise.notes = notes || ''
    await workout.save()

    res.json(workout)
  } catch (err) {
    next(err)
  }
}

// ── remove an exercise (and its saved sets) from today's workout ──
export const deleteExerciseFromToday = async (req, res, next) => {
  try {
    const { exerciseName } = req.body

    if (!exerciseName) {
      return res.status(400).json({ message: 'Exercise name required' })
    }

    const workout = await Workout.findOne({
      userId:    req.user._id,
      createdAt: { $gte: getTodayWindowStart() }
    }).sort({ createdAt: -1 })

    if (!workout) {
      return res.status(404).json({ message: 'No workout found for today' })
    }

    const before = workout.exercises.length
    workout.exercises = workout.exercises.filter(ex => ex.name !== exerciseName)

    if (workout.exercises.length === before) {
      return res.status(404).json({ message: 'Exercise not found in today\'s workout' })
    }

    await workout.save()
    res.json(workout)
  } catch (err) {
    next(err)
  }
}

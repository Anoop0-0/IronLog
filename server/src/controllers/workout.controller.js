import Workout from '../models/Workout.model.js'
import { getTodayWindowStart } from '../utils/dateWindow.js'
import { applyContestScore, applyContestScoresForExercises } from '../utils/contestScoring.js'
import { validateSet, isNonEmptyString } from '../utils/validate.js'
import { detectSetAchievements } from '../utils/achievements.js'
import { parseTargetDate, dayWindow } from '../utils/targetDay.js'

// every set ever logged for one exercise, flattened. Used to judge a new
// set against its own past — callers must run this *before* saving the
// new set, or it'll be compared against itself and never be a record.
// Sets this new one is judged against. `upTo` is the target workout's own
// timestamp, so a set logged against a past day is compared with what
// came before THAT day rather than with everything ever logged —
// otherwise catching up on a missed session could never earn the record
// it actually earned. Its own workout is included (<=), which is what
// makes earlier sets in the same session count, exactly as they do today.
const getPreviousSetsForExercise = async (userId, exerciseName, upTo = null) => {
  const query = { userId, 'exercises.name': exerciseName }
  if (upTo) query.createdAt = { $lte: upTo }

  const workouts = await Workout.find(query).select('exercises')

  return workouts.flatMap(w =>
    w.exercises
      .filter(ex => ex.name === exerciseName)
      .flatMap(ex => ex.sets.map(s => ({ reps: s.reps, weight: s.weight })))
  )
}

// The workout a set-level change applies to. Callers pass a target day
// (local noon, see utils/targetDay.js); with none, it's the rolling
// "today" window the app has always used.
//
// Returns { workout, createdAt } — workout is null when the day has
// nothing logged yet, and createdAt is the timestamp a new one should
// take, so the caller can create it.
const findWorkoutForDay = async (userId, rawDate) => {
  const parsed = parseTargetDate(rawDate)
  if (parsed.error) return { error: parsed.error }

  if (!parsed.date) {
    const workout = await Workout.findOne({
      userId,
      createdAt: { $gte: getTodayWindowStart() },
    }).sort({ createdAt: -1 })
    return { workout, createdAt: new Date() }
  }

  // an existing workout anywhere in that local day wins, so a second set
  // logged for Sep 8 joins the first rather than starting a rival entry
  const workout = await Workout.findOne({
    userId,
    createdAt: dayWindow(parsed.date),
  }).sort({ createdAt: -1 })

  return { workout, createdAt: parsed.date }
}

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

// ── get the workout for one specific day ──────────────
// `date` is local noon on the wanted day (see utils/targetDay.js). Used
// by the logger when it's opened against a past day rather than today.
export const getWorkoutForDay = async (req, res, next) => {
  try {
    const target = await findWorkoutForDay(req.user._id, req.query.date)
    if (target.error) return res.status(400).json({ message: target.error })
    res.json(target.workout || null)
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

// ── full history for one exercise, across all workouts ─
export const getExerciseHistory = async (req, res, next) => {
  try {
    const { name } = req.params

    const workouts = await Workout.find({
      userId: req.user._id,
      'exercises.name': name,
    }).sort({ createdAt: -1 })

    const history = workouts
      .map(w => {
        const ex = w.exercises.find(e => e.name === name)
        return ex
          ? {
              date: w.createdAt,
              sets: ex.sets.map(s => ({
                // _id so the client can pin a record badge to ONE set:
                // three identical sets at the same weight all tie for
                // "most reps at it", and only the first should be badged
                _id:    s._id,
                reps:   s.reps,
                weight: s.weight,
                achievements: s.achievements || [],
              })),
            }
          : null
      })
      .filter(entry => entry && entry.sets.length > 0)

    res.json(history)
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

    for (const ex of exercises) {
      for (const set of ex.sets) {
        const err = validateSet(set.reps, set.weight)
        if (err) return res.status(400).json({ message: err })
      }
    }

    const cleanedExercises = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => ({
        ...set,
        reps:   parseFloat(set.reps),
        weight: parseFloat(set.weight),
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

    for (const ex of exercises) {
      for (const set of ex.sets) {
        const err = validateSet(set.reps, set.weight)
        if (err) return res.status(400).json({ message: err })
      }
    }

    // Rebuilding each set from scratch dropped two fields that aren't the
    // caller's to destroy: _id, which set-level edit and delete address
    // sets by, and achievements, which is the only record of what a set
    // earned when it was logged. Saving an edit — even one that changed
    // nothing — silently wiped the PR history of every set in the workout.
    const cleanedExercises = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => ({
        ...(set._id ? { _id: set._id } : {}),
        reps:   parseFloat(set.reps),
        weight: parseFloat(set.weight),
        achievements: set.achievements || [],
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
    const { exerciseName, bodyPart, notes, set, date } = req.body

    // exerciseName reaches a query filter below (the achievement lookup),
    // so it has to be a real string, not an operator object
    if (!isNonEmptyString(exerciseName) || !set) {
      return res.status(400).json({ message: 'Exercise name, reps and weight required' })
    }

    const setError = validateSet(set.reps, set.weight)
    if (setError) {
      return res.status(400).json({ message: setError })
    }

    const target = await findWorkoutForDay(req.user._id, date)
    if (target.error) return res.status(400).json({ message: target.error })

    const { workout, createdAt } = target

    // must run before the new set is saved, so it's judged against the
    // sets that came before it rather than including itself
    const previousSets = await getPreviousSetsForExercise(
      req.user._id, exerciseName, workout ? workout.createdAt : createdAt
    )

    const cleanSet = {
      reps:   parseFloat(set.reps),
      weight: parseFloat(set.weight),
    }
    cleanSet.achievements = detectSetAchievements(previousSets, cleanSet.reps, cleanSet.weight)

    let saved
    if (!workout) {
      saved = await Workout.create({
        userId: req.user._id,
        createdAt,
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

    await applyContestScore(
      req.user._id, exerciseName, cleanSet.weight, cleanSet.reps, saved.createdAt
    )

    res.json(saved)
  } catch (err) {
    next(err)
  }
}

export const updateSetInToday = async (req, res, next) => {
  try {
    const { reps, weight, exerciseName, notes, date } = req.body
    const { setId } = req.params

    const setError = validateSet(reps, weight)
    if (setError) {
      return res.status(400).json({ message: setError })
    }

    const target = await findWorkoutForDay(req.user._id, date)
    if (target.error) return res.status(400).json({ message: target.error })
    const workout = target.workout

    if (!workout) {
      return res.status(404).json({ message: 'No workout found for that day' })
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

    await applyContestScore(
      req.user._id, exerciseName, newWeight, newReps, workout.createdAt
    )

    res.json(workout)
  } catch (err) {
    next(err)
  }
}

// ── delete a single set from today's workout ──────────
export const deleteSetFromToday = async (req, res, next) => {
  try {
    const { exerciseName, date } = req.body
    const { setId } = req.params

    if (!exerciseName) {
      return res.status(400).json({ message: 'Exercise name required' })
    }

    const target = await findWorkoutForDay(req.user._id, date)
    if (target.error) return res.status(400).json({ message: target.error })
    const workout = target.workout

    if (!workout) {
      return res.status(404).json({ message: 'No workout found for that day' })
    }

    const exercise = workout.exercises.find(ex => ex.name === exerciseName)
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found in that workout' })
    }

    const before = exercise.sets.length
    exercise.sets = exercise.sets.filter(s => s._id.toString() !== setId)

    if (exercise.sets.length === before) {
      return res.status(404).json({ message: 'Set not found' })
    }

    // deleting the last set leaves an exercise with nothing in it — drop
    // the whole entry rather than keep an empty exercise around
    if (exercise.sets.length === 0) {
      workout.exercises = workout.exercises.filter(ex => ex.name !== exerciseName)
    }

    await workout.save()
    res.json(workout)
  } catch (err) {
    next(err)
  }
}

// ── update just the note text for an exercise in today's workout ──
export const updateExerciseNotesInToday = async (req, res, next) => {
  try {
    const { exerciseName, notes, date } = req.body

    if (!exerciseName) {
      return res.status(400).json({ message: 'Exercise name required' })
    }

    const target = await findWorkoutForDay(req.user._id, date)
    if (target.error) return res.status(400).json({ message: target.error })
    const workout = target.workout

    if (!workout) {
      return res.status(404).json({ message: 'No workout found for that day' })
    }

    const exercise = workout.exercises.find(ex => ex.name === exerciseName)
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found in that workout' })
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
    const { exerciseName, date } = req.body

    if (!exerciseName) {
      return res.status(400).json({ message: 'Exercise name required' })
    }

    const target = await findWorkoutForDay(req.user._id, date)
    if (target.error) return res.status(400).json({ message: target.error })
    const workout = target.workout

    if (!workout) {
      return res.status(404).json({ message: 'No workout found for that day' })
    }

    const before = workout.exercises.length
    workout.exercises = workout.exercises.filter(ex => ex.name !== exerciseName)

    if (workout.exercises.length === before) {
      return res.status(404).json({ message: 'Exercise not found in that workout' })
    }

    await workout.save()
    res.json(workout)
  } catch (err) {
    next(err)
  }
}

import Workout from '../models/Workout.model.js'
import { getTodayWindowStart } from '../utils/dateWindow.js'
import { applyContestScore, applyContestScoresForExercises } from '../utils/contestScoring.js'
import { validateSet, isNonEmptyString } from '../utils/validate.js'
import { detectSetAchievements } from '../utils/achievements.js'
import { parseTargetDate, dayWindow, createdAtForDay } from '../utils/targetDay.js'

// Every workout that has ever contained this exercise, carrying only
// that one exercise rather than the whole session.
//
// The projection matters as history grows: without it this pulled every
// exercise of every matching workout across the wire — squats and rows
// and everything else — to look at one lift's sets. $elemMatch returns
// just the first match, and exercise names are unique within a workout.
//
// `upTo` only has to be an upper bound the caller can name before it
// knows which workout the set is landing in, so that this can be issued
// in parallel with that lookup instead of waiting on it. setsBefore()
// applies the exact cutoff afterwards.
const findExerciseWorkouts = (userId, exerciseName, upTo) =>
  Workout.find(
    { userId, 'exercises.name': exerciseName, createdAt: { $lte: upTo } },
    { createdAt: 1, exercises: { $elemMatch: { name: exerciseName } } },
  ).lean()

// Sets a new one is judged against, flattened. The cutoff is the target
// workout's own timestamp, so a set logged against a past day is
// compared with what came before THAT day rather than with everything
// ever logged — otherwise catching up on a missed session could never
// earn the record it actually earned. Its own workout is included (<=),
// which is what makes earlier sets in the same session count.
// Persist a workout after sets or exercises have been taken out of it,
// dropping it entirely once there is nothing left.
//
// An exercise with no sets, or a workout with no exercises, is not an
// empty session — it is a leftover, and it isn't invisible: the calendar
// draws a workout dot on that day, history renders a blank card, and
// "Previous workout" steps onto nothing. Deleting every set you logged
// left the app still insisting you trained.
//
// Returns the workout, or null when it was removed. Callers hand that
// straight to res.json, so the client can tell the two apart.
//
// Exported for its test: it only touches workout.exercises, .save() and
// .deleteOne(), so a stub pins the real behaviour rather than a copy of
// it restated in the test file.
export const saveOrRemoveIfEmpty = async (workout) => {
  workout.exercises = workout.exercises.filter(ex => ex.sets.length > 0)

  if (workout.exercises.length === 0) {
    await workout.deleteOne()
    return null
  }
  await workout.save()
  return workout
}

const setsBefore = (workouts, upTo) =>
  workouts
    .filter(w => w.createdAt <= upTo)
    .flatMap(w => (w.exercises || []).flatMap(ex =>
      ex.sets.map(s => ({ reps: s.reps, weight: s.weight }))))

// The workout a set-level change applies to. Callers pass a target day
// (local noon, see utils/targetDay.js); with none, it falls back to the
// legacy rolling window, which only a stale client bundle still hits.
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
      // bounded at both ends: an unbounded $gte sorted newest-first would
      // hand back a future-dated workout ahead of the real one
      createdAt: { $gte: getTodayWindowStart(), $lte: new Date() },
    }).sort({ createdAt: -1 })
    return { workout, createdAt: new Date() }
  }

  // an existing workout anywhere in that gym day wins, so a second set
  // logged for Sep 8 joins the first rather than starting a rival entry
  const workout = await Workout.findOne({
    userId,
    createdAt: dayWindow(parsed.date),
  }).sort({ createdAt: -1 })

  return { workout, createdAt: createdAtForDay(parsed.date) }
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

// ── LEGACY: today's workout by the rolling 24h window ─
// Superseded by getWorkoutForDay, which the app now calls for every day
// including today. Kept so a cached older bundle keeps working; see
// utils/dateWindow.js for why the rolling window was wrong.
export const getTodayWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOne({
      userId:    req.user._id,
      createdAt: { $gte: getTodayWindowStart(), $lte: new Date() }
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

    // The edit form can delete a set at a time, so it can empty an
    // exercise and then the whole workout. saveOrRemoveIfEmpty prunes
    // the exercises that are left with no sets and removes the workout
    // if that accounts for all of them.
    res.json(await saveOrRemoveIfEmpty(workout))
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

    // Saving a set was four database round trips deep, one after the
    // next, and on a free instance whose database sits in another region
    // each one is the dominant cost — the queries themselves are
    // trivial. These two don't depend on each other: the record lookup
    // only needs an upper bound, and the end of the target day is one it
    // can have before the day's workout comes back.
    const parsed = parseTargetDate(date)
    if (parsed.error) return res.status(400).json({ message: parsed.error })

    const [target, exerciseWorkouts] = await Promise.all([
      findWorkoutForDay(req.user._id, date),
      findExerciseWorkouts(
        req.user._id, exerciseName,
        parsed.date ? dayWindow(parsed.date).$lt : new Date(),
      ),
    ])
    if (target.error) return res.status(400).json({ message: target.error })

    const { workout, createdAt } = target
    const performedAt = workout ? workout.createdAt : createdAt

    // the exact cutoff, applied now that we know which workout this set
    // is landing in. Must be narrowed before the new set is saved, so
    // it's judged against what came before rather than including itself.
    const previousSets = setsBefore(exerciseWorkouts, performedAt)

    const cleanSet = {
      reps:   parseFloat(set.reps),
      weight: parseFloat(set.weight),
    }
    cleanSet.achievements = detectSetAchievements(previousSets, cleanSet.reps, cleanSet.weight)

    const persist = async () => {
      if (!workout) {
        return Workout.create({
          userId: req.user._id,
          createdAt,
          exercises: [{
            name:     exerciseName,
            bodyPart: bodyPart || '',
            notes:    notes    || '',
            sets:     [cleanSet],
          }]
        })
      }

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
      return workout
    }

    // The contest score touches a different collection and needs nothing
    // the write produces — performedAt is known above — so it rides
    // alongside rather than adding a round trip after it. Still awaited:
    // a failure here should surface, not vanish.
    const [saved] = await Promise.all([
      persist(),
      applyContestScore(
        req.user._id, exerciseName, cleanSet.weight, cleanSet.reps, performedAt
      ),
    ])

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

    // deleting the last set drops the exercise, and the last exercise
    // drops the workout — otherwise the day keeps claiming a session
    res.json(await saveOrRemoveIfEmpty(workout))
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

    // removing the only exercise leaves nothing worth keeping
    res.json(await saveOrRemoveIfEmpty(workout))
  } catch (err) {
    next(err)
  }
}

import Workout from '../models/Workout.model.js'
import Contest from '../models/Contest.model.js'

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

    // ── auto-update contest scores ──────────────────
    const activeContests = await Contest.find({
      'participants.userId': req.user._id,
      endDate:   { $gte: new Date() },
      startDate: { $lte: new Date() },
    })

    for (const contest of activeContests) {
      let bestWeight = 0
      let bestReps   = 0

      cleanedExercises.forEach(ex => {
        if (ex.name === contest.exercise) {
          ex.sets.forEach(set => {
            if (set.weight > bestWeight) {
              bestWeight = set.weight
              bestReps   = set.reps
            }
          })
        }
      })

      if (bestWeight > 0) {
        const participant = contest.participants.find(
          p => p.userId.toString() === req.user._id.toString()
        )
        if (participant && bestWeight > participant.weight) {
          participant.weight = bestWeight
          participant.reps   = bestReps
          await contest.save()
        }
      }
    }
    // ───────────────────────────────────────────────

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
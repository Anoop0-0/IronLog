import Workout from '../models/Workout.model.js'

// ── get all workouts for logged in user ───────────────
export const getWorkouts = async (req, res, next) => {
  try {
    const workouts = await Workout.find({ userId: req.user._id })
      .sort({ createdAt: -1 })  // newest first

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

    const workout = await Workout.create({
      userId: req.user._id,
      exercises,
    })

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

    // make sure user owns this workout
    if (workout.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    await workout.deleteOne()
    res.json({ message: 'Workout deleted' })
  } catch (err) {
    next(err)
  }
}
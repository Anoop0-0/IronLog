import CustomExercise from '../models/CustomExercise.model.js'
import { isNonEmptyString } from '../utils/validate.js'

// ── list this user's custom exercises ─────────────────
export const getCustomExercises = async (req, res, next) => {
  try {
    const exercises = await CustomExercise.find({ userId: req.user._id })
      .sort({ name: 1 })

    res.json(exercises)
  } catch (err) {
    next(err)
  }
}

// ── create a custom exercise ───────────────────────────
export const createCustomExercise = async (req, res, next) => {
  try {
    const { name, bodyPart } = req.body

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ message: 'Exercise name is required' })
    }
    if (!isNonEmptyString(bodyPart)) {
      return res.status(400).json({ message: 'Body part is required' })
    }

    const trimmedName = name.trim()

    // already exists (case-insensitive) — hand back the existing one
    // instead of erroring, so re-adding an already-saved custom exercise
    // (e.g. from a second device) is a harmless no-op
    const existing = await CustomExercise.findOne({
      userId: req.user._id,
      name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    })
    if (existing) {
      return res.status(200).json(existing)
    }

    const exercise = await CustomExercise.create({
      userId:   req.user._id,
      name:     trimmedName,
      bodyPart,
    })

    res.status(201).json(exercise)
  } catch (err) {
    next(err)
  }
}

// ── rename / re-tag a custom exercise ──────────────────
export const updateCustomExercise = async (req, res, next) => {
  try {
    const { name, bodyPart } = req.body

    const exercise = await CustomExercise.findById(req.params.id)
    if (!exercise) {
      return res.status(404).json({ message: 'Custom exercise not found' })
    }
    if (exercise.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    if (name !== undefined) {
      if (!isNonEmptyString(name)) {
        return res.status(400).json({ message: 'Exercise name is required' })
      }
      exercise.name = name.trim()
    }
    if (bodyPart !== undefined) {
      if (!isNonEmptyString(bodyPart)) {
        return res.status(400).json({ message: 'Body part is required' })
      }
      exercise.bodyPart = bodyPart
    }

    await exercise.save()
    res.json(exercise)
  } catch (err) {
    next(err)
  }
}

// ── delete a custom exercise ───────────────────────────
export const deleteCustomExercise = async (req, res, next) => {
  try {
    const exercise = await CustomExercise.findById(req.params.id)
    if (!exercise) {
      return res.status(404).json({ message: 'Custom exercise not found' })
    }
    if (exercise.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    await exercise.deleteOne()
    res.json({ message: 'Custom exercise deleted' })
  } catch (err) {
    next(err)
  }
}

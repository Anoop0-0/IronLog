import Contest from '../models/Contest.model.js'
import Workout from '../models/Workout.model.js'
import { nanoid } from 'nanoid'

// ── get all contests for logged in user ───────────────
export const getContests = async (req, res, next) => {
  try {
    const contests = await Contest.find({
      'participants.userId': req.user._id
    }).sort({ createdAt: -1 })

    res.json(contests)
  } catch (err) {
    next(err)
  }
}

// ── create a contest ──────────────────────────────────
export const createContest = async (req, res, next) => {
  try {
    const { name, exercise, metric, startDate, endDate } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Contest name is required' })
    }
    if (!exercise) {
      return res.status(400).json({ message: 'Exercise is required' })
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end date are required' })
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' })
    }

    const contest = await Contest.create({
      name:      name.trim(),
      exercise,
      metric,
      startDate,
      endDate,
      inviteCode: nanoid(6).toUpperCase(),
      createdBy: req.user._id,
      participants: [{
        userId:   req.user._id,
        username: req.user.username,
        weight:   0,
        reps:     0,
      }]
    })

    res.status(201).json(contest)
  } catch (err) {
    next(err)
  }
}

// ── join a contest via invite code ────────────────────
export const joinContest = async (req, res, next) => {
  try {
    const { code } = req.body

    const contest = await Contest.findOne({ inviteCode: code })
    if (!contest) {
      return res.status(404).json({ message: 'Invalid code or contest not found' })
    }

    const alreadyIn = contest.participants.some(
      p => p.userId.toString() === req.user._id.toString()
    )
    if (alreadyIn) {
      return res.status(400).json({ message: 'Already in this contest' })
    }

    contest.participants.push({
      userId:   req.user._id,
      username: req.user.username,
      weight:   0,
      reps:     0,
    })

    await contest.save()
    res.json(contest)
  } catch (err) {
    next(err)
  }
}

// ── get leaderboard for a contest ─────────────────────
export const getLeaderboard = async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.id)
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' })
    }

    const isParticipant = contest.participants.some(
      p => p.userId.toString() === req.user._id.toString()
    )
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not a participant in this contest' })
    }

    const participantIds = contest.participants.map(p => p.userId)

    // single aggregation instead of one workout query per participant —
    // find each participant's best set for this exercise within the window
    const bestLifts = await Workout.aggregate([
      { $match: {
          userId:    { $in: participantIds },
          createdAt: { $gte: contest.startDate, $lte: contest.endDate },
      }},
      { $unwind: '$exercises' },
      { $match: { 'exercises.name': contest.exercise } },
      { $unwind: '$exercises.sets' },
      { $sort: { 'exercises.sets.weight': -1 } },
      { $group: {
          _id:    '$userId',
          weight: { $first: '$exercises.sets.weight' },
          reps:   { $first: '$exercises.sets.reps' },
      }},
    ])

    const bestByUser = new Map(
      bestLifts.map(b => [b._id.toString(), { weight: b.weight, reps: b.reps }])
    )

    const leaderboard = contest.participants.map(participant => {
      const fromWorkouts = bestByUser.get(participant.userId.toString())
      // participant.weight/reps is the floor (also updated by logContestLift,
      // which isn't tied to a workout doc); use it unless a logged workout beats it
      const best = fromWorkouts && fromWorkouts.weight > (participant.weight || 0)
        ? fromWorkouts
        : { weight: participant.weight || 0, reps: participant.reps || 0 }

      return {
        userId:   participant.userId,
        username: participant.username,
        weight:   best.weight,
        reps:     best.reps,
      }
    })

    leaderboard.sort((a, b) => b.weight - a.weight)
    res.json(leaderboard)
  } catch (err) {
    next(err)
  }
}

// ── log a direct lift for a contest ──────────────────
export const logContestLift = async (req, res, next) => {
  try {
    const { weight, reps } = req.body

    if (!weight || !reps) {
      return res.status(400).json({ message: 'Weight and reps are required' })
    }

    const contest = await Contest.findById(req.params.id)
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' })
    }

    const now = new Date()
    if (now < new Date(contest.startDate) || now > new Date(contest.endDate)) {
      return res.status(400).json({ message: 'Contest is not active' })
    }

    const participant = contest.participants.find(
      p => p.userId.toString() === req.user._id.toString()
    )

    if (!participant) {
      return res.status(403).json({ message: 'You are not in this contest' })
    }

    const newWeight = parseFloat(weight)
    const newReps   = parseFloat(reps)

    if (newWeight > participant.weight) {
      participant.weight = newWeight
      participant.reps   = newReps
      await contest.save()
      return res.json({ updated: true, weight: newWeight, reps: newReps })
    }

    res.json({ updated: false, message: 'Current best is already heavier' })
  } catch (err) {
    next(err)
  }
}

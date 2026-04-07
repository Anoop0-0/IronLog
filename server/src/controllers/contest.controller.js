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

    const contest = await Contest.create({
      name,
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

    // check if already a participant
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

    // for each participant find their best lift for this exercise
    const leaderboard = await Promise.all(
      contest.participants.map(async (participant) => {
        // find all workouts by this user
        const workouts = await Workout.find({
          userId: participant.userId,
          createdAt: {
            $gte: contest.startDate,
            $lte: contest.endDate,
          }
        })

        // find heaviest set for the contest exercise
        let bestWeight = 0
        let bestReps   = 0

        workouts.forEach(workout => {
          workout.exercises.forEach(ex => {
            if (ex.name === contest.exercise) {
              ex.sets.forEach(set => {
                if (set.weight > bestWeight) {
                  bestWeight = set.weight
                  bestReps   = set.reps
                }
              })
            }
          })
        })

        return {
          userId:   participant.userId,
          username: participant.username,
          weight:   bestWeight,
          reps:     bestReps,
        }
      })
    )

    // sort by weight descending
    leaderboard.sort((a, b) => b.weight - a.weight)

    res.json(leaderboard)
  } catch (err) {
    next(err)
  }
}
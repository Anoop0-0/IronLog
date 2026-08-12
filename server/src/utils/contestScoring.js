import Contest from '../models/Contest.model.js'

// Shared by logWorkout and addSetToToday — finds any contest the user is
// currently competing in for this exercise and bumps their score if this
// lift is a new best.
export const applyContestScore = async (userId, exerciseName, weight, reps) => {
  if (!weight || weight <= 0) return

  const activeContests = await Contest.find({
    'participants.userId': userId,
    exercise:  exerciseName,
    endDate:   { $gte: new Date() },
    startDate: { $lte: new Date() },
  })

  for (const contest of activeContests) {
    const participant = contest.participants.find(
      p => p.userId.toString() === userId.toString()
    )
    if (participant && weight > participant.weight) {
      participant.weight = weight
      participant.reps   = reps
      await contest.save()
    }
  }
}

// logWorkout logs several exercises/sets at once — apply the best set per
// exercise rather than firing a save per set.
export const applyContestScoresForExercises = async (userId, exercises) => {
  const bestByExercise = new Map()

  exercises.forEach(ex => {
    ex.sets.forEach(set => {
      const current = bestByExercise.get(ex.name)
      if (!current || set.weight > current.weight) {
        bestByExercise.set(ex.name, { weight: set.weight, reps: set.reps })
      }
    })
  })

  for (const [exerciseName, best] of bestByExercise) {
    await applyContestScore(userId, exerciseName, best.weight, best.reps)
  }
}

import { Router } from 'express'
import {
  getContests,
  createContest,
  joinContest,
  getLeaderboard,
  logContestLift,  
} from '../controllers/contest.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/',          getContests)
router.post('/',         createContest)
router.post('/join',     joinContest)
router.get('/:id/leaderboard', getLeaderboard)
router.post('/:id/lift', logContestLift)

export default router
import { Router }                              from 'express'
import { getWorkouts, logWorkout, deleteWorkout } from '../controllers/workout.controller.js'
import { protect }                             from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/',       getWorkouts)
router.post('/',      logWorkout)
router.delete('/:id', deleteWorkout)

export default router
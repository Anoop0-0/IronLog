import { Router } from 'express'
import {
  getWorkouts,
  logWorkout,
  deleteWorkout,
  updateWorkout,
  addSetToToday
} from '../controllers/workout.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/',            getWorkouts)
router.post('/',           logWorkout)
router.post('/today/set',  addSetToToday)
router.put('/:id',         updateWorkout)
router.delete('/:id',      deleteWorkout)

export default router
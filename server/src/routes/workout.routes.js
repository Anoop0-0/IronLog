import { Router }                                        from 'express'
import { getWorkouts, logWorkout, deleteWorkout, updateWorkout,addsetToToday } from '../controllers/workout.controller.js'
import { protect }                                       from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/',       getWorkouts)
router.post('/',      logWorkout)
router.put('/:id',    updateWorkout)
router.delete('/:id', deleteWorkout)
router.post('/today/set',addsetToToday)
export default router
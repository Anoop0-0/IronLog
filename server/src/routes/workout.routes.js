import { Router } from 'express'
import {
  getWorkouts,
  getTodayWorkout,
  logWorkout,
  deleteWorkout,
  updateWorkout,
  addSetToToday,
  updateSetInToday,
  updateExerciseNotesInToday,
  deleteExerciseFromToday,
} from '../controllers/workout.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/',                  getWorkouts)
router.get('/today',             getTodayWorkout)
router.post('/',                 logWorkout)
router.post('/today/set',        addSetToToday)
router.put('/today/set/:setId',  updateSetInToday)
router.put('/today/exercise/notes',   updateExerciseNotesInToday)
router.delete('/today/exercise',      deleteExerciseFromToday)
router.put('/:id',               updateWorkout)
router.delete('/:id',            deleteWorkout)

export default router
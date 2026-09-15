import { Router } from 'express'
import {
  getWorkouts,
  getWorkoutForDay,
  getTodayWorkout,
  getExerciseHistory,
  logWorkout,
  deleteWorkout,
  updateWorkout,
  addSetToToday,
  updateSetInToday,
  deleteSetFromToday,
  updateExerciseNotesInToday,
  deleteExerciseFromToday,
} from '../controllers/workout.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/',                  getWorkouts)
router.get('/today',             getTodayWorkout)
router.get('/day',               getWorkoutForDay)
router.get('/exercise/:name/history', getExerciseHistory)
router.post('/',                 logWorkout)
router.post('/today/set',        addSetToToday)
router.put('/today/set/:setId',  updateSetInToday)
router.delete('/today/set/:setId', deleteSetFromToday)
router.put('/today/exercise/notes',   updateExerciseNotesInToday)
router.delete('/today/exercise',      deleteExerciseFromToday)
router.post('/set',              addSetToToday)
router.put('/set/:setId',        updateSetInToday)
router.delete('/set/:setId',     deleteSetFromToday)
router.put('/exercise/notes',    updateExerciseNotesInToday)
router.delete('/exercise',       deleteExerciseFromToday)

router.put('/:id',               updateWorkout)
router.delete('/:id',            deleteWorkout)

export default router
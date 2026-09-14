import { Router } from 'express'
import {
  getCustomExercises,
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
} from '../controllers/exercise.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/',      getCustomExercises)
router.post('/',     createCustomExercise)
router.put('/:id',   updateCustomExercise)
router.delete('/:id', deleteCustomExercise)

export default router

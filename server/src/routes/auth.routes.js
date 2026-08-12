import { Router }    from 'express'
import rateLimit     from 'express-rate-limit'
import {
  register, login, googleLogin,
  forgotPassword, resetPassword,
  changePassword, updateProfile, deleteAccount,
} from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

// brute-force protection on credential-guessing / account-recovery endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts — please try again later' },
})

router.post('/register',         authLimiter, register)
router.post('/login',            authLimiter, login)
router.post('/google',           googleLogin)
router.post('/forgot-password',  authLimiter, forgotPassword)
router.post('/reset-password',   authLimiter, resetPassword)

router.put('/change-password',   protect, changePassword)
router.put('/profile',           protect, updateProfile)
router.delete('/account',        protect, deleteAccount)

export default router

import { Router }                       from 'express'
import rateLimit                        from 'express-rate-limit'
import { register, login, googleLogin } from '../controllers/auth.controller.js'

const router = Router()

// brute-force protection on credential-guessing endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts — please try again later' },
})

router.post('/register', authLimiter, register)
router.post('/login',    authLimiter, login)
router.post('/google',   googleLogin)

export default router

import express   from 'express'
import mongoose  from 'mongoose'
import cors      from 'cors'
import dotenv    from 'dotenv'

import authRoutes    from './routes/auth.routes.js'
import workoutRoutes from './routes/workout.routes.js'
import contestRoutes from './routes/contest.routes.js'
import { errorHandler } from './middleware/error.middleware.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin:[
    'http://localhost:5173',
    'https://ironlog.vercel.app',  // we'll update this after Vercel deploys
  ]}))
app.use(express.json())

app.use('/api/auth',     authRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/contests', contestRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'IRONLOG API running' })
})

app.use(errorHandler)

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`)
    })
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })
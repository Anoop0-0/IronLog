import express   from 'express'
import mongoose  from 'mongoose'
import { pathToFileURL } from 'url'
import cors      from 'cors'
import dotenv    from 'dotenv'

import authRoutes    from './routes/auth.routes.js'
import workoutRoutes from './routes/workout.routes.js'
import contestRoutes from './routes/contest.routes.js'
import exerciseRoutes from './routes/exercise.routes.js'
import { errorHandler } from './middleware/error.middleware.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 5000

// fixed origins (localhost + known production URLs), plus a pattern match
// for Vercel preview deployments — every push gets its own unique
// "<project>-<hash>-anoop0-0s-projects.vercel.app" URL, so a static list
// can never keep up with those; this matches any deployment under this
// Vercel team/scope instead
const allowedOrigins = [
  'http://localhost:5173',
  // the two stable Vercel aliases that follow production. Both already
  // match vercelPreviewPattern below, but they're listed explicitly so
  // the app's real URLs stay obvious to anyone reading this list.
  'https://iron-log-anoop0-0s-projects.vercel.app',
  'https://iron-log-git-main-anoop0-0s-projects.vercel.app',
  'https://www.anoopbaghel.in',
  'https://anoopbaghel.in',
]

const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+-anoop0-0s-projects\.vercel\.app$/

const corsOptions = {
  origin: (origin, callback) => {
    // no Origin header (curl, server-to-server, same-origin) — allow
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      return callback(null, true)
    }

    // a disallowed origin is a rejected request, not a server fault —
    // tag it 403 so errorHandler doesn't report it as a 500. Without
    // this, every blocked origin (and every bot probing the API) shows
    // up in logs and monitoring as a server error.
    const err = new Error('Not allowed by CORS')
    err.status = 403
    callback(err)
  },
  credentials: true,
}

app.options('*any', cors(corsOptions))
app.use(cors(corsOptions))
app.use(express.json())

// fix Google OAuth popup
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})

app.use('/api/auth',     authRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/contests', contestRoutes)
app.use('/api/exercises', exerciseRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'IRONLOG API running' })
})

app.use(errorHandler)

// Connecting and listening only when this file is what was run keeps
// `import`ing it side-effect-free, so the smoke test can build the app
// and hit a route without a database. `npm start` (node src/index.js) is
// unaffected — that path still takes the branch below.
const isEntrypoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
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
}

export default app
import { useState, useEffect, useRef } from 'react'
import { useTimer } from '../../hooks/useTimer'

const PRESETS = [
  { label: '60s',  seconds: 60  },
  { label: '90s',  seconds: 90  },
  { label: '2min', seconds: 120 },
  { label: '3min', seconds: 180 },
]

function ProgressRing({ seconds, total }) {
  const radius           = 54
  const stroke           = 6
  const normalizedRadius = radius - stroke / 2
  const circumference    = 2 * Math.PI * normalizedRadius
  const progress         = total > 0 ? seconds / total : 0
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <svg width="120" height="120" className="rotate-[-90deg]">
      <circle
        cx="60" cy="60" r={normalizedRadius}
        fill="none" stroke="#1f1f1f" strokeWidth={stroke}
      />
      <circle
        cx="60" cy="60" r={normalizedRadius}
        fill="none"
        stroke={seconds <= 10 ? '#e24b4a' : '#3b82f6'}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
      />
    </svg>
  )
}

export default function RestTimer() {
  const { autoStart, setAutoStart, triggerStart } = useTimer()

  const [open,      setOpen]      = useState(false)
  const [total,     setTotal]     = useState(90)
  const [remaining, setRemaining] = useState(null)
  const [running,   setRunning]   = useState(false)
  const [custom,    setCustom]    = useState('')
  const intervalRef               = useRef(null)

  const playBeep = () => {
    try {
      const ctx        = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gainNode   = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 880
      oscillator.type            = 'sine'
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    } catch {
      // AudioContext unsupported/blocked (e.g. no user gesture yet) —
      // the beep is a non-critical enhancement, safe to skip silently
    }
  }

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200])
  }

  const startTimer = (seconds) => {
    clearInterval(intervalRef.current)
    setTotal(seconds)
    setRemaining(seconds)
    setRunning(true)
  }

  // auto-start when triggerStart changes — this effect intentionally syncs
  // local timer state to an external signal: WorkoutLogger increments
  // triggerStart (via TimerContext) whenever a set is saved elsewhere in
  // the app. That's exactly what effects are for; the batched setState
  // calls inside startTimer() are safe here.
  useEffect(() => {
    if (triggerStart > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startTimer(total)
    }
  }, [triggerStart])

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            playBeep()
            vibrate()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const handlePreset = (seconds) => {
    setTotal(seconds)
    startTimer(seconds)
  }

  const handleCustom = () => {
    const secs = parseInt(custom)
    if (!secs || secs < 1) return
    startTimer(secs)
    setCustom('')
  }

  const handlePauseResume = () => {
    if (remaining === 0) {
      startTimer(total)
    } else {
      setRunning(prev => !prev)
    }
  }

  const handleReset = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setRemaining(null)
  }

  const formatTime = (secs) => {
    if (secs === null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isFinished = remaining === 0

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-28 right-4 z-40 w-14 h-14 rounded-full
                    shadow-lg flex items-center justify-center
                    transition-all active:scale-95
                    ${running
                      ? 'bg-blue-600 animate-pulse'
                      : isFinished
                      ? 'bg-red-600'
                      : 'bg-gray-800 border border-gray-700'}`}
      >
        {running ? (
          <span className="text-white text-xs font-bold font-mono">
            {formatTime(remaining)}
          </span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        )}
      </button>

      {/* Timer sheet */}
      {open && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col justify-end">
          <div className="bg-gray-900 rounded-t-2xl pb-24">

            {/* Header */}
            <div className="flex justify-between items-center px-4 pt-4 pb-2">
              <h2 className="font-semibold text-white">Rest timer</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-sm">
                Close
              </button>
            </div>

            {/* Auto-start toggle */}
            <div className="flex justify-between items-center px-4 py-3
                            border-b border-gray-800 mb-2">
              <div>
                <p className="text-sm text-white">Auto-start</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Starts automatically when you log a set
                </p>
              </div>
              <button
                onClick={() => setAutoStart(prev => !prev)}
                className={`w-12 h-6 rounded-full transition-colors relative
                            ${autoStart ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white
                                 transition-all
                                 ${autoStart ? 'left-7' : 'left-1'}`}/>
              </button>
            </div>

            {/* Timer ring */}
            <div className="flex flex-col items-center py-4">
              <div className="relative">
                <ProgressRing seconds={remaining ?? total} total={total} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold font-mono
                                   ${isFinished ? 'text-red-400' : 'text-white'}`}>
                    {formatTime(remaining)}
                  </span>
                  {isFinished && (
                    <span className="text-xs text-red-400 mt-1">Done!</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                {remaining !== null && (
                  <button
                    onClick={handleReset}
                    className="bg-gray-800 text-gray-400 px-5 py-2.5 rounded-xl text-sm"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={handlePauseResume}
                  className={`px-8 py-2.5 rounded-xl text-sm font-semibold
                              ${isFinished || remaining === null
                                ? 'bg-blue-600 text-white'
                                : running
                                ? 'bg-gray-700 text-white'
                                : 'bg-blue-600 text-white'}`}
                >
                  {remaining === null ? 'Start' :
                   isFinished        ? 'Restart' :
                   running           ? 'Pause' : 'Resume'}
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="px-4 mb-4">
              <p className="text-xs text-gray-400 mb-2">Quick select</p>
              <div className="flex gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.seconds}
                    onClick={() => handlePreset(p.seconds)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium
                                transition-colors
                                ${total === p.seconds && remaining !== null
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-800 text-gray-400'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom */}
            <div className="px-4">
              <p className="text-xs text-gray-400 mb-2">Custom (seconds)</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 45"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700
                             rounded-xl px-3 py-2.5 text-sm text-white
                             placeholder-gray-600 outline-none focus:border-blue-600"
                />
                <button
                  onClick={handleCustom}
                  disabled={!custom}
                  className="bg-blue-600 disabled:opacity-40 text-white
                             text-sm font-medium px-5 rounded-xl"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
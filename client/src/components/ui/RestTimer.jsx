import { useState, useEffect, useRef } from 'react'
import { useTimer } from '../../hooks/useTimer'
import { vibrate, REST_TIMER_DONE } from '../../utils/haptics'

const PRESETS = [
  { label: '60s',  seconds: 60  },
  { label: '90s',  seconds: 90  },
  { label: '2min', seconds: 120 },
  { label: '3min', seconds: 180 },
]

const NOTIFY_KEY = 'ironlog-timer-notify'

function ProgressRing({ seconds, total }) {
  const radius           = 54
  const stroke           = 6
  const normalizedRadius = radius - stroke / 2
  const circumference    = 2 * Math.PI * normalizedRadius
  // clamped to 1 — a +15s nudge near the end can push remaining above the
  // original total, which would otherwise send strokeDashoffset negative
  const progress         = total > 0 ? Math.min(1, seconds / total) : 0
  const strokeDashoffset = circumference * (1 - progress)
  const urgent           = seconds <= 10

  return (
    <svg width="120" height="120" className="rotate-[-90deg]">
      <circle
        cx="60" cy="60" r={normalizedRadius}
        fill="none" stroke="#1f1f1f" strokeWidth={stroke}
      />
      <circle
        cx="60" cy="60" r={normalizedRadius}
        fill="none"
        stroke="#e24b4a"
        strokeOpacity={urgent ? 1 : 0.75}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke-opacity 0.3s' }}
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
  const [endTime,   setEndTime]   = useState(null) // wall-clock ms timestamp the countdown finishes at
  const [custom,    setCustom]    = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(() => {
    try { return localStorage.getItem(NOTIFY_KEY) === 'true' } catch { return false }
  })
  const intervalRef = useRef(null)

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

  // real OS-level notification via the service worker we already register
  // for the PWA — this is what actually reaches you if you've switched to
  // another app. It does NOT reliably fire with the phone fully locked;
  // that needs Push API + server-side scheduling, a separate feature.
  // Skipped while the app is already visible — you're looking at it.
  const notifyDone = () => {
    if (!notifyEnabled) return
    if (document.visibilityState === 'visible') return
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (!navigator.serviceWorker) return

    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification('Rest complete', {
        body: 'Time to get back to it 💪',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: REST_TIMER_DONE,
        tag: 'ironlog-rest-timer',
      })
    }).catch(() => {})
  }

  const toggleNotify = async () => {
    if (notifyEnabled) {
      setNotifyEnabled(false)
      try { localStorage.setItem(NOTIFY_KEY, 'false') } catch { /* ignore */ }
      return
    }
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    setNotifyEnabled(true)
    try { localStorage.setItem(NOTIFY_KEY, 'true') } catch { /* ignore */ }
  }

  const finishTimer = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setEndTime(null)
    setRemaining(0)
    playBeep()
    vibrate(REST_TIMER_DONE)
    notifyDone()
  }

  const startTimer = (seconds) => {
    clearInterval(intervalRef.current)
    setTotal(seconds)
    setRemaining(seconds)
    setEndTime(Date.now() + seconds * 1000)
    setRunning(true)
  }

  // auto-start when triggerStart changes — this effect intentionally syncs
  // local timer state to an external signal: WorkoutLogger increments
  // triggerStart (via TimerContext) whenever a set is saved elsewhere in
  // the app. That's exactly what effects are for; the batched setState
  // calls inside startTimer() are safe here.
  useEffect(() => {
    if (triggerStart > 0) {
      startTimer(total)
    }
  }, [triggerStart])

  // wall-clock driven: recompute remaining from the stored end-timestamp
  // rather than trusting the interval tick count, so a throttled/paused
  // background timer self-corrects instead of silently drifting
  useEffect(() => {
    if (!running || endTime === null) return

    const tick = () => {
      const secsLeft = Math.max(0, Math.round((endTime - Date.now()) / 1000))
      if (secsLeft <= 0) {
        finishTimer()
      } else {
        setRemaining(secsLeft)
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, endTime])

  // catch up immediately when the tab/app regains focus — a backgrounded
  // interval may have been throttled or fully paused by the OS
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && running && endTime !== null) {
        const secsLeft = Math.max(0, Math.round((endTime - Date.now()) / 1000))
        if (secsLeft <= 0) finishTimer()
        else setRemaining(secsLeft)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, endTime])

  const handlePreset = (seconds) => {
    startTimer(seconds)
    setOpen(false) // the FAB already shows the live countdown — get back to the workout
  }

  const handleCustom = () => {
    const secs = parseInt(custom)
    if (!secs || secs < 1) return
    startTimer(secs)
    setCustom('')
    setOpen(false)
  }

  const handlePauseResume = () => {
    if (remaining === 0) {
      startTimer(total)
      return
    }
    if (running) {
      clearInterval(intervalRef.current)
      setRunning(false)
      setEndTime(null) // freeze — `remaining` already holds the correct value
    } else {
      setEndTime(Date.now() + (remaining ?? total) * 1000)
      setRunning(true)
    }
  }

  const handleReset = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setRemaining(null)
    setEndTime(null)
  }

  // nudge the current countdown without a full reset — works whether
  // running or paused
  const adjustTime = (delta) => {
    setRemaining(prev => {
      if (prev === null) return prev
      const next = Math.max(0, prev + delta)
      if (running) setEndTime(Date.now() + next * 1000)
      return next
    })
  }

  const formatTime = (secs) => {
    if (secs === null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isFinished = remaining === 0
  const urgent     = running && remaining !== null && remaining <= 10

  return (
    <>
      {/* Floating button — translucent + blurred when idle so it dims
          whatever's underneath instead of fully hiding it (it's a fixed
          element, so page content inevitably scrolls behind it). Solid
          while running/finished; turns red in the last 10s as an urgency
          cue that mirrors the ring inside the sheet. */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-28 right-4 z-40 rounded-full
                    shadow-lg flex items-center justify-center
                    transition-all active:scale-95
                    ${running
                      ? `w-14 h-14 ${urgent ? 'bg-red-600' : 'bg-red-600/90'} ${urgent ? 'animate-pulse' : ''}`
                      : isFinished
                      ? 'w-14 h-14 bg-red-600 animate-pulse'
                      : 'w-11 h-11 bg-gray-800/60 backdrop-blur-md border border-gray-700/60'}`}
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
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col justify-end">
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
                            border-b border-gray-800">
              <div>
                <p className="text-sm text-white">Auto-start</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Starts automatically when you log a set
                </p>
              </div>
              <button
                onClick={() => setAutoStart(prev => !prev)}
                className={`w-12 h-6 rounded-full transition-colors relative
                            ${autoStart ? 'bg-red-600' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white
                                 transition-all
                                 ${autoStart ? 'left-7' : 'left-1'}`}/>
              </button>
            </div>

            {/* Notify toggle */}
            <div className="flex justify-between items-center px-4 py-3
                            border-b border-gray-800 mb-2">
              <div>
                <p className="text-sm text-white">Notify when done</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {notifyEnabled
                    ? 'Alerts you even if you\'ve switched apps'
                    : 'On iPhone, add to Home Screen first for this to work'}
                </p>
              </div>
              <button
                onClick={toggleNotify}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0
                            ${notifyEnabled ? 'bg-red-600' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white
                                 transition-all
                                 ${notifyEnabled ? 'left-7' : 'left-1'}`}/>
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

              {remaining !== null && !isFinished && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => adjustTime(-15)}
                    className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    −15s
                  </button>
                  <button
                    onClick={() => adjustTime(15)}
                    className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    +15s
                  </button>
                </div>
              )}

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
                                ? 'bg-red-600 text-white'
                                : running
                                ? 'bg-gray-700 text-white'
                                : 'bg-red-600 text-white'}`}
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
                                ${total === p.seconds
                                  ? 'bg-red-600 text-white'
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
                             placeholder-gray-600 outline-none focus:border-red-600"
                />
                <button
                  onClick={handleCustom}
                  disabled={!custom}
                  className="bg-red-600 disabled:opacity-40 text-white
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

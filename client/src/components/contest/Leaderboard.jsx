import { useState, useEffect } from 'react'
import { getLeaderboard, logLift } from '../../api/contests.api'
import { useAuth } from '../../hooks/useAuth'

const MEDALS = ['🥇', '🥈', '🥉']

const getCountdown = (endDate) => {
  const diff = new Date(endDate) - new Date()
  const days = Math.ceil(diff / 86400000)
  if (diff <= 0) return 'Ended'
  if (days === 0) return 'Ends today'
  return `${days}d left`
}

const isActive = (contest) => {
  const now = new Date()
  return now >= new Date(contest.startDate) && now <= new Date(contest.endDate)
}

export default function Leaderboard({ contest, onClose }) {
  const { user }                      = useAuth()
  const [entries,  setEntries]        = useState([])
  const [loading,  setLoading]        = useState(true)
  const [loadError, setLoadError]     = useState('')
  const [showForm, setShowForm]       = useState(false)
  const [weight,   setWeight]         = useState('')
  const [reps,     setReps]           = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [message,  setMessage]        = useState('')

  const fetchLeaderboard = async () => {
    try {
      const res = await getLeaderboard(contest._id || contest.id)
      setEntries(res.data)
      setLoadError('')
    } catch {
      setLoadError('Failed to load leaderboard')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [contest._id])

  const handleLogLift = async () => {
    if (!weight || !reps) return
    setSubmitting(true)
    setMessage('')
    try {
      const res = await logLift(contest._id || contest.id, {
        weight: parseFloat(weight),
        reps:   parseFloat(reps),
      })
      if (res.data.updated) {
        setMessage(`✅ New PR! ${weight}kg × ${reps} reps saved`)
        await fetchLeaderboard()
        setWeight('')
        setReps('')
        setShowForm(false)
      } else {
        setMessage(`Current best is already heavier — keep pushing!`)
      }
    } catch {
      setMessage('Failed to log lift. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // find current user's entry
  const myEntry = entries.find(
    e => e.userId === user?.id || e.userId === user?._id
  )

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col justify-end">
      <div className="bg-gray-900 rounded-t-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-white">{contest.name}</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {contest.exercise} · Heaviest single lift
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 text-sm">
              Close
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <span className="text-xs bg-gray-800 text-gray-400 px-2.5
                             py-1 rounded-full border border-gray-700">
              {getCountdown(contest.endDate)}
            </span>
            <span className="text-xs bg-gray-800 text-gray-400 px-2.5
                             py-1 rounded-full border border-gray-700">
              {entries.length} athletes
            </span>
            <span className="text-xs bg-gray-800 text-gray-400 px-2.5
                             py-1 rounded-full border border-gray-700">
              🔄 Live
            </span>
          </div>

          {/* Your current best */}
          {myEntry && myEntry.weight > 0 && (
            <div className="mt-3 bg-gray-800 rounded-xl px-3 py-2
                            flex justify-between items-center">
              <span className="text-xs text-gray-500">Your best</span>
              <span className="text-sm font-bold text-red-400">
                {myEntry.weight}kg × {myEntry.reps} reps
              </span>
            </div>
          )}
        </div>

        {/* Log lift form */}
        {isActive(contest) && (
          <div className="px-4 py-3 border-b border-gray-800">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-red-600 text-white font-semibold
                           py-3 rounded-xl text-sm active:scale-95 transition-all"
              >
                + Log your lift
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium">
                  {contest.exercise} — log your best single lift
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g. 100"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700
                                 rounded-xl px-3 py-2.5 text-sm text-white
                                 text-center outline-none focus:border-red-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Reps
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 5"
                      value={reps}
                      onChange={e => setReps(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700
                                 rounded-xl px-3 py-2.5 text-sm text-white
                                 text-center outline-none focus:border-red-700"
                    />
                  </div>
                </div>

                {message && (
                  <p className={`text-xs text-center ${
                    message.includes('✅') ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {message}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowForm(false); setMessage('') }}
                    className="flex-1 bg-gray-800 text-gray-400 py-2.5
                               rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogLift}
                    disabled={submitting || !weight || !reps}
                    className="flex-1 bg-red-600 disabled:opacity-40
                               text-white font-semibold py-2.5 rounded-xl
                               text-sm active:scale-95 transition-all"
                  >
                    {submitting ? 'Saving...' : 'Submit lift'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard list */}
        <div className="overflow-y-auto pb-24">
          {loadError && (
            <div className="mx-4 mt-4 bg-red-900/20 border border-red-800
                            rounded-xl p-3 text-red-400 text-sm flex
                            justify-between items-center">
              <span>{loadError}</span>
              <button onClick={fetchLeaderboard} className="text-xs underline ml-2">
                Retry
              </button>
            </div>
          )}

          {loading && (
            <div className="space-y-2 p-4">
              {[1,2,3].map(i => (
                <div key={i}
                  className="h-16 bg-gray-800 rounded-xl animate-pulse"/>
              ))}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-600 text-sm">No entries yet</p>
              <p className="text-gray-700 text-xs mt-1">
                Be the first to log a lift
              </p>
            </div>
          )}

          {!loading && entries.map((entry, i) => {
            const isMe = entry.userId === user?.id ||
                         entry.userId === user?._id

            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between px-4 py-3.5
                            border-b border-gray-800
                            ${i === 0 ? 'bg-yellow-900/10' : ''}
                            ${isMe ? 'border-l-2 border-l-red-600' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">
                    {i < 3 ? MEDALS[i] : (
                      <span className="text-sm text-gray-600 font-medium">
                        {i + 1}
                      </span>
                    )}
                  </span>

                  <div className={`w-9 h-9 rounded-full border
                                  flex items-center justify-center
                                  text-sm font-medium
                                  ${isMe
                                    ? 'bg-red-900/30 border-red-700 text-red-400'
                                    : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                    {entry.username?.[0]?.toUpperCase()}
                  </div>

                  <div>
                    <p className={`text-sm font-medium ${isMe ? 'text-red-400' : 'text-white'}`}>
                      {entry.username} {isMe && '(you)'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {entry.reps > 0 ? `${entry.reps} reps` : 'No lift yet'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-bold
                                ${i === 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {entry.weight > 0 ? `${entry.weight}kg` : '—'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
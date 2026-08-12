import { useState, useEffect } from 'react'
import AppLayout            from '../components/layout/AppLayout'
import CreateContestModal   from '../components/contest/CreateContestModal'
import Leaderboard          from '../components/contest/Leaderboard'
import { useContests }      from '../hooks/useContests'
import { joinContest }      from '../api/contests.api'
import { useAuth }          from '../hooks/useAuth'

// countdown timer
const getCountdown = (endDate) => {
  const diff = new Date(endDate) - new Date()
  if (diff <= 0) return { label: 'Ended', color: 'text-gray-400' }
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return { label: `${days}d ${hours}h left`, color: 'text-green-400' }
  if (hours > 0) return { label: `${hours}h left`, color: 'text-yellow-400' }
  return { label: 'Ends soon', color: 'text-red-400' }
}

export default function Contests() {
  const { contests, loading, error, addContest } = useContests()
  const { user } = useAuth()

  const [createOpen,      setCreateOpen]      = useState(false)
  const [selectedContest, setSelectedContest] = useState(null)
  const [joinCode,        setJoinCode]        = useState('')
  const [joinLoading,     setJoinLoading]     = useState(false)
  const [joinError,       setJoinError]       = useState('')
  const [copiedId,        setCopiedId]        = useState(null)
  // ticking state exists purely to force a re-render each minute — the
  // countdown labels themselves recompute from `new Date()` at render time
  const [, forceTick] = useState(0)

  // update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => forceTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setJoinLoading(true)
    setJoinError('')
    try {
      const res = await joinContest(joinCode.trim().toUpperCase())
      addContest(res.data)
      setJoinCode('')
    } catch {
      setJoinError('Invalid code or contest not found')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // get user's rank in a contest
  const getUserRank = (contest) => {
    if (!contest.participants || !user) return null
    const sorted = [...contest.participants].sort((a, b) => b.weight - a.weight)
    const rank = sorted.findIndex(p => p.userId === user.id || p.userId === user._id) + 1
    return rank > 0 ? rank : null
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-10 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Contests</h1>
          <p className="text-xs text-gray-400 mt-0.5">Compete with friends</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-red-600 text-white text-sm font-semibold
                     px-4 py-2 rounded-xl active:scale-95 transition-all"
        >
          + New
        </button>
      </div>

      {/* Join via code */}
      <div className="px-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">Join with invite code</p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError('') }}
              placeholder="e.g. AB12CD"
              maxLength={6}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl
                         px-3 py-2.5 text-sm text-white placeholder-gray-600
                         outline-none focus:border-red-700 tracking-widest
                         font-mono uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={joinLoading || joinCode.length < 4}
              className="bg-gray-700 disabled:opacity-40 text-white text-sm
                         font-medium px-4 rounded-xl active:scale-95 transition-all"
            >
              {joinLoading ? '...' : 'Join'}
            </button>
          </div>
          {joinError && <p className="text-red-400 text-xs mt-2">{joinError}</p>}
        </div>
      </div>

      {/* Contest list */}
      <div className="px-4">
        <h2 className="text-xs font-medium text-gray-400 uppercase
                       tracking-wider mb-3">
          Your contests
        </h2>

        {loading && (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="h-32 bg-gray-900 rounded-xl animate-pulse"/>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl
                          p-4 text-red-400 text-sm">{error}</div>
        )}

        {!loading && !error && contests.length === 0 && (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🏆</p>
            <p className="text-gray-400 font-medium">No contests yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Create one or join with an invite code
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {contests.map(contest => {
              const { label, color } = getCountdown(contest.endDate)
              const rank = getUserRank(contest)

              return (
                <div
                  key={contest._id || contest.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                >
                  {/* Top row — name + countdown */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-white text-sm">
                        {contest.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {contest.exercise}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${color}`}>
                      {label}
                    </span>
                  </div>

                  {/* Middle row — rank badge + participants */}
                  <div className="flex items-center gap-3 mb-3">
                    {rank && (
                      <div className={`flex items-center gap-1.5 px-2.5 py-1
                                      rounded-full text-xs font-semibold border
                                      ${rank === 1
                                        ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900'
                                        : rank === 2
                                        ? 'bg-gray-700/50 text-gray-300 border-gray-600'
                                        : rank === 3
                                        ? 'bg-orange-900/30 text-orange-400 border-orange-900'
                                        : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                        <span>Your rank</span>
                      </div>
                    )}

                    {/* Participant avatars */}
                    <div className="flex -space-x-2">
                      {(contest.participants || []).slice(0, 4).map((p, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full bg-gray-700 border-2
                                     border-gray-900 flex items-center justify-center
                                     text-xs text-gray-400 font-medium"
                        >
                          {p.username?.[0]?.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {(contest.participants || []).length} athletes
                    </span>
                  </div>

                  {/* Bottom row — invite code + leaderboard button */}
                  <div className="flex items-center justify-between pt-3
                                  border-t border-gray-800">
                    {/* Invite code */}
                    <button
                      onClick={() => handleCopyCode(contest.inviteCode, contest._id)}
                      className="flex items-center gap-2 active:scale-95 transition-all"
                    >
                      <span className="font-mono text-sm font-bold text-gray-400
                                       tracking-widest">
                        {contest.inviteCode}
                      </span>
                      <span className="text-xs text-gray-400">
                        {copiedId === contest._id ? '✓ Copied' : 'Copy code'}
                      </span>
                    </button>

                    {/* Leaderboard button */}
                    <button
                      onClick={() => setSelectedContest(contest)}
                      className="text-xs text-red-400 font-medium
                                 active:text-red-300 transition-colors"
                    >
                      Leaderboard →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {createOpen && (
        <CreateContestModal
          onClose={() => setCreateOpen(false)}
          onCreated={addContest}
        />
      )}

      {selectedContest && (
        <Leaderboard
          contest={selectedContest}
          onClose={() => setSelectedContest(null)}
        />
      )}
    </AppLayout>
  )
}
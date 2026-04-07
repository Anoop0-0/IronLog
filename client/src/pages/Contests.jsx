import { useState } from 'react'
import AppLayout            from '../components/layout/AppLayout'
import CreateContestModal   from '../components/contest/CreateContestModal'
import Leaderboard          from '../components/contest/Leaderboard'
import { useContests }      from '../hooks/useContests'
import { joinContest }      from '../api/contests.api'

const daysLeft = (endDate) => {
  const diff = new Date(endDate) - new Date()
  const days = Math.ceil(diff / 86400000)
  if (days < 0)   return { label: 'Ended',     color: 'text-gray-600' }
  if (days === 0) return { label: 'Ends today', color: 'text-red-400'  }
  return           { label: `${days}d left`,    color: 'text-green-400' }
}

export default function Contests() {
  const { contests, loading, error, addContest } = useContests()

  const [createOpen,     setCreateOpen]     = useState(false)
  const [selectedContest, setSelectedContest] = useState(null)
  const [joinCode,       setJoinCode]       = useState('')
  const [joinLoading,    setJoinLoading]    = useState(false)
  const [joinError,      setJoinError]      = useState('')

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

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-10 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Contests</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Compete with friends
          </p>
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
              onChange={e => {
                setJoinCode(e.target.value.toUpperCase())
                setJoinError('')
              }}
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
          {joinError && (
            <p className="text-red-400 text-xs mt-2">{joinError}</p>
          )}
        </div>
      </div>

      {/* Contest list */}
      <div className="px-4">
        <h2 className="text-xs font-medium text-gray-600 uppercase
                       tracking-wider mb-3">
          Your contests
        </h2>

        {loading && (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i}
                className="h-24 bg-gray-900 rounded-xl animate-pulse"/>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl
                          p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && contests.length === 0 && (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🏆</p>
            <p className="text-gray-400 font-medium">No contests yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Create one or join with an invite code
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {contests.map(contest => {
              const { label, color } = daysLeft(contest.endDate)
              return (
                <button
                  key={contest.id}
                  onClick={() => setSelectedContest(contest)}
                  className="w-full bg-gray-900 border border-gray-800
                             rounded-xl p-4 text-left active:border-gray-600
                             transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white text-sm">
                        {contest.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {contest.exercise}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${color}`}>
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    {/* Participant avatars */}
                    <div className="flex -space-x-2">
                      {(contest.participants || []).slice(0, 4).map((p, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full bg-gray-700 border-2
                                     border-gray-900 flex items-center justify-center
                                     text-xs text-gray-400 font-medium"
                        >
                          {p.username[0].toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">
                      {(contest.participants || []).length} athletes
                    </span>
                    <span className="ml-auto text-xs text-gray-600">
                      View leaderboard →
                    </span>
                  </div>
                </button>
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
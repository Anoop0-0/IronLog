import { useState, useEffect } from 'react'
import { getLeaderboard } from '../../api/contests.api'

const MEDALS = ['🥇', '🥈', '🥉']

const daysLeft = (endDate) => {
  const diff = new Date(endDate) - new Date()
  const days = Math.ceil(diff / 86400000)
  if (days < 0)  return 'Ended'
  if (days === 0) return 'Ends today'
  return `${days}d left`
}

export default function Leaderboard({ contest, onClose }) {
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getLeaderboard(contest.id)
      .then(res => setEntries(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contest.id])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col justify-end">
      <div className="bg-gray-900 rounded-t-2xl max-h-[85vh] flex flex-col">

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

          {/* Contest meta */}
          <div className="flex gap-2 mt-3">
            <span className="text-xs bg-gray-800 text-gray-400 px-2.5
                             py-1 rounded-full border border-gray-700">
              {daysLeft(contest.endDate)}
            </span>
            <span className="text-xs bg-gray-800 text-gray-400 px-2.5
                             py-1 rounded-full border border-gray-700">
              {entries.length} athletes
            </span>
          </div>
        </div>

        {/* Leaderboard list */}
        <div className="overflow-y-auto pb-8">
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
                Log a {contest.exercise} workout to appear here
              </p>
            </div>
          )}

          {!loading && entries.map((entry, i) => (
            <div
              key={entry.userId}
              className={`flex items-center justify-between px-4 py-3.5
                          border-b border-gray-800
                          ${i === 0 ? 'bg-yellow-900/10' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span className="text-lg w-8 text-center">
                  {i < 3 ? MEDALS[i] : (
                    <span className="text-sm text-gray-600 font-medium">
                      {i + 1}
                    </span>
                  )}
                </span>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gray-800 border
                                border-gray-700 flex items-center justify-center
                                text-sm font-medium text-gray-400">
                  {entry.username[0].toUpperCase()}
                </div>

                <div>
                  <p className="text-sm font-medium text-white">
                    {entry.username}
                  </p>
                  <p className="text-xs text-gray-600">
                    {entry.reps} reps
                  </p>
                </div>
              </div>

              {/* Weight */}
              <div className="text-right">
                <p className={`text-lg font-bold
                              ${i === 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {entry.weight}kg
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
import { useState } from 'react'

const formatDate = (iso) => {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.floor((today - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// One exercise row — shows set 1 by default, chevron expands rest
function ExerciseRow({ exercise }) {
  const [open, setOpen] = useState(false)
  const { name, sets } = exercise  // sets is now an array

  if (!sets || sets.length === 0) return null

  const firstSet = sets[0]
  const remainingSets = sets.slice(1)

  return (
    <div className="border-t border-gray-800 py-2.5">
      {/* First set always visible */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-200 font-medium">{name}</p>
          <p className="text-xs text-red-400 mt-0.5">
            Set 1 &nbsp; {firstSet.reps} reps @ {firstSet.weight}kg
          </p>
        </div>

        {/* Only show chevron if there are more sets */}
        {remainingSets.length > 0 && (
          <button
            onClick={() => setOpen(prev => !prev)}
            className="p-1 text-gray-600 active:text-gray-400 transition-colors"
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Remaining sets — only rendered when open */}
      {open && (
        <div className="mt-2 space-y-1.5 pl-2">
          {remainingSets.map((set, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-xs text-gray-600">Set {i + 2}</span>
              <span className="text-xs text-gray-500">
                {set.reps} reps @ {set.weight}kg
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WorkoutCard({ workout }) {
  const { type, createdAt, exercises } = workout

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <div>
          <h3 className="font-semibold text-white">{type}</h3>
          <p className="text-xs text-gray-600 mt-0.5">{formatDate(createdAt)}</p>
        </div>
        <span className="text-xs bg-gray-800 text-gray-500 px-2.5 py-1 rounded-full border border-gray-700">
          {exercises.length} exercises
        </span>
      </div>

      {/* Exercise rows */}
      <div className="px-4 pb-4">
        {exercises.map((ex, i) => (
          <ExerciseRow key={i} exercise={ex} />
        ))}
      </div>
    </div>
  )
}
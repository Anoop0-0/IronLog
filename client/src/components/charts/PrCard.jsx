const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

const PART_COLORS = {
  Chest:     'bg-red-900/30 text-red-400 border-red-900',
  Back:      'bg-blue-900/30 text-blue-400 border-blue-900',
  Shoulders: 'bg-purple-900/30 text-purple-400 border-purple-900',
  Biceps:    'bg-green-900/30 text-green-400 border-green-900',
  Triceps:   'bg-orange-900/30 text-orange-400 border-orange-900',
  Legs:      'bg-yellow-900/30 text-yellow-400 border-yellow-900',
  Core:      'bg-teal-900/30 text-teal-400 border-teal-900',
}

export default function PRCard({ record }) {
  const { exercise, bodyPart, weight, reps, date } = record
  const colorClass = PART_COLORS[bodyPart] || 'bg-gray-800 text-gray-400 border-gray-700'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3
                    flex justify-between items-center">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{exercise}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
            {bodyPart}
          </span>
        </div>
        <p className="text-xs text-gray-600">{formatDate(date)}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-red-400">{weight}kg</p>
        <p className="text-xs text-gray-600">{reps} reps</p>
      </div>
    </div>
  )
}
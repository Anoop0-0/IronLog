import { useState } from 'react'
import { createContest } from '../../api/contests.api'
import { EXERCISES, BODY_PARTS } from '../../utils/exerciseList'

export default function CreateContestModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name:      '',
    bodyPart:  'Chest',
    exercise:  'Bench Press',
    startDate: '',
    endDate:   '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleChange = (e) =>
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
      // reset exercise when bodyPart changes
      ...(e.target.name === 'bodyPart'
        ? { exercise: EXERCISES[e.target.value][0] }
        : {})
    }))

  const validate = () => {
    if (!form.name.trim())      return 'Contest name is required'
    if (!form.startDate)        return 'Start date is required'
    if (!form.endDate)          return 'End date is required'
    if (form.endDate <= form.startDate) return 'End date must be after start date'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      const res = await createContest({
        name:     form.name,
        exercise: form.exercise,
        metric:   'heaviest_lift',
        startDate: form.startDate,
        endDate:   form.endDate,
      })
      onCreated(res.data)
      onClose()
    } catch {
      setError('Failed to create contest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col justify-end">
      <div className="bg-gray-900 rounded-t-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-4 pb-3
                        border-b border-gray-800">
          <h2 className="font-semibold text-white">Create contest</h2>
          <button onClick={onClose} className="text-gray-500 text-sm">
            Cancel
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl
                            p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Contest name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Contest name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Bench Press Battle"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl
                         px-3 py-2.5 text-sm text-white placeholder-gray-600
                         outline-none focus:border-red-700"
            />
          </div>

          {/* Body part selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Body part
            </label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {BODY_PARTS.map(part => (
                <button
                  key={part}
                  onClick={() =>
                    handleChange({ target: { name: 'bodyPart', value: part } })
                  }
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs
                              font-medium transition-colors
                              ${form.bodyPart === part
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800 text-gray-400'}`}
                >
                  {part}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Exercise
            </label>
            <select
              name="exercise"
              value={form.exercise}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl
                         px-3 py-2.5 text-sm text-white outline-none
                         focus:border-red-700"
            >
              {EXERCISES[form.bodyPart].map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Start date
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl
                           px-3 py-2.5 text-sm text-white outline-none
                           focus:border-red-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                End date
              </label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl
                           px-3 py-2.5 text-sm text-white outline-none
                           focus:border-red-700"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-red-600 disabled:opacity-40 text-white
                       font-semibold py-3.5 rounded-xl text-sm
                       active:scale-95 transition-all"
          >
            {loading ? 'Creating...' : 'Create contest'}
          </button>
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
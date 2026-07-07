import { useState } from 'react'

const formatDate = (iso) => {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.floor((today - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ExerciseRow({ exercise }) {
  const [open, setOpen] = useState(false)
  const { name, sets } = exercise
  if (!sets || sets.length === 0) return null
  const firstSet      = sets[0]
  const remainingSets = sets.slice(1)

  return (
    <div className="border-t border-gray-800 py-2.5">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-200 font-medium">{name}</p>
          <p className="text-xs text-red-400 mt-0.5">
            Set 1 &nbsp; {firstSet.reps} reps @ {firstSet.weight}kg
          </p>
        </div>
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

function EditableSetRow({ set, index, onChange, onDelete, showDelete }) {
  return (
    <div className="grid grid-cols-12 items-center gap-1 py-1">
      <span className="col-span-2 text-xs text-gray-600">{index + 1}</span>
      <input
        type="number"
        inputMode="numeric"
        value={set.reps}
        onChange={e => onChange('reps', e.target.value)}
        placeholder="reps"
        className="col-span-4 bg-gray-800 border border-gray-700 rounded-lg
                   px-2 py-2 text-sm text-white text-center outline-none
                   focus:border-red-700"
      />
      <input
        type="number"
        inputMode="decimal"
        value={set.weight}
        onChange={e => onChange('weight', e.target.value)}
        placeholder="kg"
        className="col-span-4 bg-gray-800 border border-gray-700 rounded-lg
                   px-2 py-2 text-sm text-white text-center outline-none
                   focus:border-red-700"
      />
      <div className="col-span-2 flex justify-center">
        {showDelete && (
          <button
            onClick={onDelete}
            className="text-gray-700 active:text-red-500 p-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function WorkoutCard({ workout, onDelete, onUpdate }) {
  const { exercises, createdAt } = workout
  const [editing,         setEditing]         = useState(false)
  const [editedExercises, setEditedExercises] = useState([])
  const [saving,          setSaving]          = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(false)

  const startEdit = () => {
    setEditedExercises(exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s }))
    })))
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditedExercises([])
  }

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(editedExercises)
    setSaving(false)
    setEditing(false)
  }

  const updateSet = (exIndex, setIndex, field, value) => {
    setEditedExercises(prev => prev.map((ex, ei) =>
      ei === exIndex
        ? {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si === setIndex ? { ...s, [field]: value } : s
            )
          }
        : ex
    ))
  }

  const deleteSet = (exIndex, setIndex) => {
    setEditedExercises(prev => prev.map((ex, ei) =>
      ei === exIndex
        ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIndex) }
        : ex
    ))
  }

  const addSet = (exIndex) => {
    setEditedExercises(prev => prev.map((ex, ei) =>
      ei === exIndex
        ? { ...ex, sets: [...ex.sets, { reps: '', weight: '' }] }
        : ex
    ))
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <div>
          <p className="text-xs text-gray-600 mt-0.5">{formatDate(createdAt)}</p>
          <p className="text-xs text-gray-600">{exercises.length} exercises</p>
        </div>

        {!editing && (
          <div className="flex gap-2">
            <button
              onClick={startEdit}
              className="text-xs text-gray-500 border border-gray-700
                         px-3 py-1.5 rounded-full active:text-white transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-900 border border-red-900
                         px-3 py-1.5 rounded-full active:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mx-4 mb-3 bg-red-900/20 border border-red-800
                        rounded-xl p-3 flex justify-between items-center">
          <p className="text-xs text-red-400">Delete this workout?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-500 px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-red-400 font-medium px-2 py-1"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* View mode */}
      {!editing && (
        <div className="px-4 pb-4">
          {exercises.map((ex, i) => (
            <ExerciseRow key={i} exercise={ex} />
          ))}
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="px-4 pb-4">
          {editedExercises.map((ex, exIndex) => (
            <div key={exIndex} className="border-t border-gray-800 pt-3 pb-2">
              <p className="text-sm font-medium text-gray-300 mb-2">{ex.name}</p>

              <div className="grid grid-cols-12 mb-1">
                <span className="col-span-2 text-xs text-gray-600">Set</span>
                <span className="col-span-4 text-xs text-gray-600 text-center">Reps</span>
                <span className="col-span-4 text-xs text-gray-600 text-center">kg</span>
              </div>

              {ex.sets.map((set, setIndex) => (
                <EditableSetRow
                  key={setIndex}
                  set={set}
                  index={setIndex}
                  onChange={(field, value) => updateSet(exIndex, setIndex, field, value)}
                  onDelete={() => deleteSet(exIndex, setIndex)}
                  showDelete={ex.sets.length > 1}
                />
              ))}

              <button
                onClick={() => addSet(exIndex)}
                className="text-xs text-gray-600 active:text-red-400
                           transition-colors mt-1"
              >
                + Add set
              </button>
            </div>
          ))}

          <div className="flex gap-2 mt-4">
            <button
              onClick={cancelEdit}
              className="flex-1 bg-gray-800 text-gray-400 py-2.5
                         rounded-xl text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-red-600 disabled:opacity-40 text-white
                         font-semibold py-2.5 rounded-xl text-sm
                         active:scale-95 transition-all"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
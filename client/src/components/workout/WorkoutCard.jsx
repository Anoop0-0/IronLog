import { useState, Fragment } from 'react'

const formatDate = (iso) => {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.floor((today - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ExerciseRow({ exercise, defaultExpanded = false }) {
  const [open, setOpen] = useState(defaultExpanded)
  const { name, sets } = exercise
  if (!sets || sets.length === 0) return null

  const best = sets.reduce((b, s) => (!b || s.weight > b.weight) ? s : b, null)

  return (
    <div className="border-t border-gray-800 py-2.5">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex justify-between items-center text-left"
      >
        <div>
          <p className="text-sm text-gray-200 font-medium">{name}</p>
          {/* collapsed summary — a set count and the top weight say more
              at a glance than singling out set 1 did */}
          {!open && (
            <p className="text-xs text-gray-400 mt-0.5">
              {sets.length} {sets.length === 1 ? 'set' : 'sets'}
              {best && <> · best <span className="text-red-400">{best.weight}kg</span></>}
            </p>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        // every set rendered identically — set 1 used to be styled as a
        // headline and the rest as an afterthought, which read as two
        // different kinds of row once they were all on screen together
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pl-1">
          {sets.map((set, i) => (
            <Fragment key={i}>
              <span className="text-xs text-gray-400">Set {i + 1}</span>
              <span className="text-xs text-gray-300 text-right tabular-nums">
                {set.reps} reps @ {set.weight}kg
              </span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

function EditableSetRow({ set, index, onChange, onDelete, showDelete }) {
  return (
    <div className="grid grid-cols-12 items-center gap-1 py-1">
      <span className="col-span-2 text-xs text-gray-400">{index + 1}</span>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max="1000"
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
        min="1"
        max="2000"
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
            className="text-gray-500 active:text-red-500 p-1"
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

// expandSets: render every exercise's sets open on mount. The home
// screen's "Today" card wants that (you're mid-session, you want to see
// what you've done); the history list leaves them collapsed so a long
// back-catalogue stays scannable.
export default function WorkoutCard({ workout, onDelete, onUpdate, expandSets = false }) {
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
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(createdAt)}</p>
          <p className="text-xs text-gray-400">{exercises.length} exercises</p>
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
            <ExerciseRow key={i} exercise={ex} defaultExpanded={expandSets} />
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
                <span className="col-span-2 text-xs text-gray-400">Set</span>
                <span className="col-span-4 text-xs text-gray-400 text-center">Reps</span>
                <span className="col-span-4 text-xs text-gray-400 text-center">kg</span>
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
                className="text-xs text-gray-400 active:text-red-400
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
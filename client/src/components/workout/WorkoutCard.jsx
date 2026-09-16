import { useState, Fragment } from 'react'
import { AchievementBadge } from './Achievement'
import { standingAchievements } from '../../utils/progressHelpers'
import { relativeDayLabel } from '../../utils/workoutDays'

const formatDate = (iso) => relativeDayLabel(iso)

function ExerciseRow({ exercise, defaultExpanded = false, records }) {
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
        // one grid for the whole list so the numbers line up in columns
        // instead of drifting with each row's width
        <div className="mt-2 grid grid-cols-[1.5rem_1fr_auto] items-center gap-x-3 gap-y-0.5">
          {sets.map((set, i) => (
            <Fragment key={i}>
              <span className="h-5 rounded-md bg-gray-800/80 text-[10px] font-medium
                               text-gray-500 flex items-center justify-center">
                {i + 1}
              </span>
              <span className="flex items-center justify-end gap-1.5">
                {standingAchievements(set, records).map(kind => (
                  <AchievementBadge key={kind} kind={kind} />
                ))}
              </span>
              <span className="text-sm tabular-nums text-right whitespace-nowrap">
                <span className="text-white font-semibold">{set.weight}</span>
                <span className="text-gray-500 text-xs ml-0.5">kg</span>
                <span className="text-gray-600 mx-1.5">×</span>
                <span className="text-white font-semibold">{set.reps}</span>
                <span className="text-gray-500 text-xs ml-0.5">reps</span>
              </span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

// A labelled field rather than a bare number box: the unit sits inside
// the input, so a column of them reads as "60 kg" instead of leaving you
// to remember which box was which.
function SetField({ value, unit, onChange, inputMode, max }) {
  return (
    <div className="relative flex-1">
      <input
        type="number"
        inputMode={inputMode}
        min="1"
        max={max}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg
                   pl-3 pr-8 py-2.5 text-sm text-white font-semibold tabular-nums
                   outline-none focus:border-red-600 focus:bg-gray-800/60
                   transition-colors"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2
                       text-[11px] text-gray-500">
        {unit}
      </span>
    </div>
  )
}

function EditableSetRow({ set, index, onChange, onDelete, showDelete }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-6 h-6 shrink-0 rounded-md bg-gray-800 text-[11px] font-medium
                       text-gray-500 flex items-center justify-center">
        {index + 1}
      </span>
      <SetField
        value={set.weight}
        unit="kg"
        inputMode="decimal"
        max="2000"
        onChange={v => onChange('weight', v)}
      />
      <SetField
        value={set.reps}
        unit="reps"
        inputMode="numeric"
        max="1000"
        onChange={v => onChange('reps', v)}
      />
      {/* always rendered so the fields don't shift width on the last set */}
      <button
        onClick={onDelete}
        disabled={!showDelete}
        aria-label={`Remove set ${index + 1}`}
        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center
                   text-gray-600 active:text-red-400 active:bg-red-950/30
                   disabled:opacity-0 disabled:pointer-events-none transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

// expandSets: render every exercise's sets open on mount. The home
// screen's "Today" card wants that (you're mid-session, you want to see
// what you've done); the history list leaves them collapsed so a long
// back-catalogue stays scannable.
export default function WorkoutCard({ workout, onDelete, onUpdate, expandSets = false, badgesFor }) {
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
            <ExerciseRow
              key={i}
              exercise={ex}
              defaultExpanded={expandSets}
              records={badgesFor?.(ex.name)}
            />
          ))}
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="px-4 pb-4">
          {editedExercises.map((ex, exIndex) => (
            <div key={exIndex} className="border-t border-gray-800 pt-3 pb-2">
              <p className="text-sm font-medium text-gray-300 mb-2">{ex.name}</p>

              <div className="flex items-center gap-2 mb-1.5 px-0.5">
                <span className="w-6 shrink-0" />
                <span className="flex-1 text-[10px] uppercase tracking-wider text-gray-500">Weight</span>
                <span className="flex-1 text-[10px] uppercase tracking-wider text-gray-500">Reps</span>
                <span className="w-8 shrink-0" />
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
                className="w-full mt-2 py-2 rounded-lg border border-dashed border-gray-700
                           text-xs text-gray-500 active:border-red-700 active:text-red-400
                           transition-colors"
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
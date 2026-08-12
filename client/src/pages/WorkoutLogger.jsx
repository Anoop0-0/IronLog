import { useState, useEffect } from 'react'
import AppLayout       from '../components/layout/AppLayout'
import ExercisePicker  from '../components/workout/ExercisePicker'
import {
  addSetToToday, getTodayWorkout, updateSetInToday,
  updateExerciseNotes, deleteExerciseFromToday,
} from '../api/workouts.api'
import { useTimer }    from '../hooks/useTimer'
import { newSet }      from '../utils/workoutHelpers'
import { nanoid }      from 'nanoid'

const newExercise = (name, bodyPart) => ({
  id:       nanoid(),
  name,
  bodyPart,
  notes:    '',
  sets:     [newSet()],
})

export default function WorkoutLogger() {
  const [exercises,    setExercises]    = useState([])
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const [expandedNote, setExpandedNote] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const { startRestTimer } = useTimer()

  useEffect(() => {
    const loadToday = async () => {
      try {
        const res = await getTodayWorkout()
        const todayWorkout = res.data

        if (todayWorkout) {
          setExercises(todayWorkout.exercises.map(ex => ({
            id:       ex._id?.toString() || nanoid(),
            name:     ex.name,
            bodyPart: ex.bodyPart,
            notes:    ex.notes || '',
            sets:     ex.sets.map(s => ({
              id:         s._id?.toString() || nanoid(),
              originalId: s._id?.toString(),
              reps:       s.reps,
              weight:     s.weight,
              saved:      true,
              editing:    false,
            }))
          })))
        }
      } catch {
        setError('Failed to load today\'s workout')
      } finally {
        setLoading(false)
      }
    }
    loadToday()
  }, [])

  const handleAddExercise = (name, bodyPart) => {
    setExercises(prev => [...prev, newExercise(name, bodyPart)])
  }

  const handleDeleteExercise = async (exercise) => {
    const hasSavedSets = exercise.sets.some(s => s.originalId)

    if (hasSavedSets) {
      try {
        await deleteExerciseFromToday(exercise.name)
      } catch {
        setError('Failed to delete exercise — try again')
        return
      }
    }

    setExercises(prev => prev.filter(ex => ex.id !== exercise.id))
  }

  const handleAddSet = (exId) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exId
        ? { ...ex, sets: [...ex.sets, newSet()] }
        : ex
    ))
  }

  const handleDeleteSet = (exId, setId) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exId
        ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) }
        : ex
    ))
  }

  const handleUpdateSet = (exId, setId, field, value) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exId
        ? {
            ...ex,
            sets: ex.sets.map(s =>
              s.id === setId ? { ...s, [field]: value } : s
            )
          }
        : ex
    ))
  }

  const handleNotes = (exId, value) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exId ? { ...ex, notes: value } : ex
    ))
  }

  // notes for an unsaved exercise ride along with its first saved set;
  // for an exercise that already has saved sets there's no later save
  // point to piggyback on, so persist the note explicitly on blur
  const handleNotesBlur = async (exercise) => {
    const hasSavedSets = exercise.sets.some(s => s.originalId)
    if (!hasSavedSets) return

    try {
      await updateExerciseNotes({ exerciseName: exercise.name, notes: exercise.notes })
    } catch {
      setError('Failed to save note — try again')
    }
  }

  const handleEditSet = (exId, setId) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exId
        ? {
            ...ex,
            sets: ex.sets.map(s =>
              s.id === setId
                ? { ...s, editing: true, saved: false }
                : s
            )
          }
        : ex
    ))
  }

  const handleSaveSet = async (exercise, set) => {
    if (!set.reps || !set.weight) return
    setError('')

    try {
      if (set.editing && set.originalId) {
        await updateSetInToday(set.originalId, {
          exerciseName: exercise.name,
          reps:         set.reps,
          weight:       set.weight,
        })
      } else {
        await addSetToToday({
          exerciseName: exercise.name,
          bodyPart:     exercise.bodyPart,
          notes:        exercise.notes,
          set:          { reps: set.reps, weight: set.weight },
        })
      }

      setExercises(prev => prev.map(ex =>
        ex.id === exercise.id
          ? {
              ...ex,
              sets: ex.sets.map(s =>
                s.id === set.id
                  ? { ...s, saved: true, editing: false }
                  : s
              )
            }
          : ex
      ))

      startRestTimer()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save set — check your connection and try again')
    }
  }

  return (
    <AppLayout>
      <div className="px-4 pt-10 pb-4">
        <h1 className="text-xl font-bold text-white">Log workout</h1>
        <p className="text-xs text-gray-600 mt-0.5">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'short', day: 'numeric'
          })}
        </p>
      </div>

      <div className="px-4 space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl
                          p-3 text-red-400 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 text-xs ml-2">✕</button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="h-32 bg-gray-900 rounded-xl animate-pulse"/>
          </div>
        )}

        {!loading && exercises.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💪</p>
            <p className="text-gray-400 font-medium">No exercises yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Tap below to add your first exercise
            </p>
          </div>
        )}

        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            noteOpen={expandedNote === ex.id}
            onToggleNote={() =>
              setExpandedNote(prev => prev === ex.id ? null : ex.id)
            }
            onDeleteExercise={() => handleDeleteExercise(ex)}
            onAddSet={() => handleAddSet(ex.id)}
            onDeleteSet={(setId) => handleDeleteSet(ex.id, setId)}
            onUpdateSet={(setId, field, val) =>
              handleUpdateSet(ex.id, setId, field, val)
            }
            onNoteChange={(val) => handleNotes(ex.id, val)}
            onNoteBlur={() => handleNotesBlur(ex)}
            onSaveSet={(set) => handleSaveSet(ex, set)}
            onEditSet={(setId) => handleEditSet(ex.id, setId)}
          />
        ))}

        <button
          onClick={() => setPickerOpen(true)}
          className="w-full border border-dashed border-gray-700 text-gray-500
                     rounded-xl py-4 text-sm active:border-red-700
                     active:text-red-500 transition-colors"
        >
          + Add exercise
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          onAdd={handleAddExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </AppLayout>
  )
}

function ExerciseCard({
  exercise, noteOpen,
  onToggleNote, onDeleteExercise,
  onAddSet, onDeleteSet,
  onUpdateSet, onNoteChange, onNoteBlur,
  onSaveSet, onEditSet
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex justify-between items-start px-4 pt-4 pb-3">
        <div>
          <h3 className="font-semibold text-white">{exercise.name}</h3>
          <span className="text-xs text-gray-600">{exercise.bodyPart}</span>
        </div>
        <div className="flex gap-3 items-center mt-0.5">
          <button
            onClick={onToggleNote}
            className={`text-xs transition-colors
              ${noteOpen ? 'text-red-400' : 'text-gray-600'}`}
          >
            Notes
          </button>
          <button onClick={onDeleteExercise} className="text-gray-700 active:text-red-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      {noteOpen && (
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Add a note..."
            value={exercise.notes}
            onChange={e => onNoteChange(e.target.value)}
            onBlur={onNoteBlur}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-sm text-gray-300 placeholder-gray-600
                       outline-none focus:border-gray-500"
          />
        </div>
      )}

      <div className="grid grid-cols-12 px-4 pb-1">
        <span className="col-span-1 text-xs text-gray-600">Set</span>
        <span className="col-span-4 text-xs text-gray-600">Reps</span>
        <span className="col-span-4 text-xs text-gray-600">Weight</span>
        <span className="col-span-3"></span>
      </div>

      <div className="px-4 space-y-2 pb-3">
        {exercise.sets.map((set, i) => (
          <div key={set.id} className="grid grid-cols-12 items-center gap-1">
            <span className="col-span-1 text-xs text-gray-600 font-medium">
              {i + 1}
            </span>

            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              min="1"
              max="1000"
              value={set.reps}
              onChange={e => onUpdateSet(set.id, 'reps', e.target.value)}
              disabled={set.saved && !set.editing}
              className={`col-span-4 border rounded-lg px-2 py-2 text-sm
                          text-white text-center outline-none
                          ${set.saved && !set.editing
                            ? 'bg-gray-800/50 border-gray-800 text-gray-500'
                            : 'bg-gray-800 border-gray-700 focus:border-red-700'}`}
            />

            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              min="1"
              max="2000"
              value={set.weight}
              onChange={e => onUpdateSet(set.id, 'weight', e.target.value)}
              disabled={set.saved && !set.editing}
              className={`col-span-4 border rounded-lg px-2 py-2 text-sm
                          text-white text-center outline-none
                          ${set.saved && !set.editing
                            ? 'bg-gray-800/50 border-gray-800 text-gray-500'
                            : 'bg-gray-800 border-gray-700 focus:border-red-700'}`}
            />

            <div className="col-span-3 flex justify-end gap-1">
              {!set.saved ? (
                <>
                  <button
                    onClick={() => onSaveSet(set)}
                    disabled={!set.reps || !set.weight}
                    className="bg-green-700 disabled:opacity-30 text-white
                               text-xs px-2 py-1.5 rounded-lg active:scale-95
                               transition-all"
                  >
                    Save
                  </button>
                  {exercise.sets.length > 1 && (
                    <button
                      onClick={() => onDeleteSet(set.id)}
                      className="text-gray-700 active:text-red-500 p-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </>
              ) : set.editing ? (
                <button
                  onClick={() => onSaveSet(set)}
                  disabled={!set.reps || !set.weight}
                  className="bg-blue-600 disabled:opacity-30 text-white
                             text-xs px-2 py-1.5 rounded-lg active:scale-95
                             transition-all"
                >
                  Update
                </button>
              ) : (
                <button
                  onClick={() => onEditSet(set.id)}
                  className="text-green-500 text-xs px-2 active:text-green-300"
                >
                  ✓
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onAddSet}
        className="w-full border-t border-gray-800 py-3 text-xs text-gray-600
                   active:text-red-400 transition-colors"
      >
        + Add set
      </button>
    </div>
  )
}
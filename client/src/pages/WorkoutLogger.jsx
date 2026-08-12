import { useState, useEffect } from 'react'
import AppLayout       from '../components/layout/AppLayout'
import ExercisePicker  from '../components/workout/ExercisePicker'
import Stepper         from '../components/workout/Stepper'
import {
  addSetToToday, getTodayWorkout, updateSetInToday, deleteSetFromToday,
  updateExerciseNotes, deleteExerciseFromToday,
} from '../api/workouts.api'
import { useTimer }    from '../hooks/useTimer'
import { nanoid }      from 'nanoid'

const newExercise = (name, bodyPart) => ({
  id:            nanoid(),
  name,
  bodyPart,
  notes:         '',
  sets:          [],   // saved sets only: [{ id, originalId, reps, weight }]
  draftWeight:   '',
  draftReps:     '',
  selectedSetId: null, // id of the set loaded into the entry panel, or null for "new set"
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
          setExercises(todayWorkout.exercises.map(ex => {
            const sets = ex.sets.map(s => ({
              id:         s._id?.toString() || nanoid(),
              originalId: s._id?.toString(),
              reps:       s.reps,
              weight:     s.weight,
            }))
            const last = sets[sets.length - 1]

            return {
              id:            ex._id?.toString() || nanoid(),
              name:          ex.name,
              bodyPart:      ex.bodyPart,
              notes:         ex.notes || '',
              sets,
              draftWeight:   last ? last.weight : '',
              draftReps:     last ? last.reps   : '',
              selectedSetId: null,
            }
          }))
        }
      } catch {
        setError('Failed to load today\'s workout')
      } finally {
        setLoading(false)
      }
    }
    loadToday()
  }, [])

  const updateExercise = (exId, patch) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exId ? { ...ex, ...(typeof patch === 'function' ? patch(ex) : patch) } : ex
    ))
  }

  const handleAddExercise = (name, bodyPart) => {
    setExercises(prev => [...prev, newExercise(name, bodyPart)])
  }

  const handleDeleteExercise = async (exercise) => {
    const hasSavedSets = exercise.sets.length > 0

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

  const handleDraftChange = (exId, field, value) => {
    updateExercise(exId, { [field]: value })
  }

  const handleStep = (exId, field, delta) => {
    updateExercise(exId, ex => {
      const next = Math.max(0, (parseFloat(ex[field]) || 0) + delta)
      return { [field]: Math.round(next * 10) / 10 }
    })
  }

  const handleSelectSet = (exId, set) => {
    updateExercise(exId, ex => ex.selectedSetId === set.id
      // tapping the already-selected row again backs out of edit mode
      ? { selectedSetId: null, draftWeight: '', draftReps: '' }
      : { selectedSetId: set.id, draftWeight: set.weight, draftReps: set.reps }
    )
  }

  const handleClearDraft = (exId) => {
    updateExercise(exId, { draftWeight: '', draftReps: '' })
  }

  const handleNotes = (exId, value) => {
    updateExercise(exId, { notes: value })
  }

  // notes for a brand-new exercise ride along with its first saved set;
  // an exercise that already has saved sets has no later save point to
  // piggyback on, so persist the note explicitly on blur
  const handleNotesBlur = async (exercise) => {
    if (exercise.sets.length === 0) return

    try {
      await updateExerciseNotes({ exerciseName: exercise.name, notes: exercise.notes })
    } catch {
      setError('Failed to save note — try again')
    }
  }

  const handleSaveDraft = async (exercise) => {
    const { draftWeight, draftReps, selectedSetId } = exercise
    if (!draftWeight || !draftReps) return
    setError('')

    try {
      if (selectedSetId) {
        const set = exercise.sets.find(s => s.id === selectedSetId)
        await updateSetInToday(set.originalId, {
          exerciseName: exercise.name,
          reps:         draftReps,
          weight:       draftWeight,
        })

        updateExercise(exercise.id, ex => ({
          sets: ex.sets.map(s =>
            s.id === selectedSetId ? { ...s, reps: draftReps, weight: draftWeight } : s
          ),
          selectedSetId: null,
        }))
      } else {
        const res = await addSetToToday({
          exerciseName: exercise.name,
          bodyPart:     exercise.bodyPart,
          notes:        exercise.notes,
          set:          { reps: draftReps, weight: draftWeight },
        })

        // pull the real Mongo _id for the set we just added so a later
        // edit/delete on it hits the right document instead of re-adding
        const savedExercise = res.data.exercises.find(e => e.name === exercise.name)
        const savedSet       = savedExercise.sets[savedExercise.sets.length - 1]

        updateExercise(exercise.id, ex => ({
          sets: [...ex.sets, {
            id:         savedSet._id,
            originalId: savedSet._id,
            reps:       savedSet.reps,
            weight:     savedSet.weight,
          }],
        }))

        startRestTimer()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save set — check your connection and try again')
    }
  }

  const handleDeleteSelected = async (exercise) => {
    const set = exercise.sets.find(s => s.id === exercise.selectedSetId)
    if (!set) return
    setError('')

    try {
      await deleteSetFromToday(set.originalId, exercise.name)
      updateExercise(exercise.id, ex => ({
        sets:          ex.sets.filter(s => s.id !== set.id),
        selectedSetId: null,
        draftWeight:   '',
        draftReps:     '',
      }))
    } catch {
      setError('Failed to delete set — try again')
    }
  }

  return (
    <AppLayout>
      <div className="px-4 pt-10 pb-4">
        <h1 className="font-display text-xl font-bold text-white">Log workout</h1>
        <p className="text-xs text-gray-400 mt-0.5">
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
            <p className="text-gray-400 text-sm mt-1">
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
            onDraftChange={(field, val) => handleDraftChange(ex.id, field, val)}
            onStep={(field, delta) => handleStep(ex.id, field, delta)}
            onSelectSet={(set) => handleSelectSet(ex.id, set)}
            onClearDraft={() => handleClearDraft(ex.id)}
            onNoteChange={(val) => handleNotes(ex.id, val)}
            onNoteBlur={() => handleNotesBlur(ex)}
            onSaveDraft={() => handleSaveDraft(ex)}
            onDeleteSelected={() => handleDeleteSelected(ex)}
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
  onDraftChange, onStep, onSelectSet, onClearDraft,
  onNoteChange, onNoteBlur,
  onSaveDraft, onDeleteSelected,
}) {
  const isEditing = exercise.selectedSetId !== null
  const canSave   = parseFloat(exercise.draftWeight) > 0 && parseFloat(exercise.draftReps) > 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex justify-between items-start px-4 pt-4 pb-3">
        <div>
          <h3 className="font-semibold text-white">{exercise.name}</h3>
          <span className="text-xs text-gray-400">{exercise.bodyPart}</span>
        </div>
        <div className="flex gap-1 items-center mt-0.5">
          <button
            onClick={onToggleNote}
            className={`text-xs px-2 py-2 -my-2 transition-colors
              ${noteOpen ? 'text-red-400' : 'text-gray-400'}`}
          >
            Notes
          </button>
          <button onClick={onDeleteExercise} className="text-gray-500 active:text-red-500 p-2 -my-2">
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

      {/* Entry panel — big steppers instead of a cramped inline row */}
      <div className="px-4 pt-1 pb-4 space-y-4">
        <Stepper
          label="Weight (kg)"
          value={exercise.draftWeight}
          onChange={(v) => onDraftChange('draftWeight', v)}
          onStep={(delta) => onStep('draftWeight', delta)}
          step={2.5}
        />
        <Stepper
          label="Reps"
          value={exercise.draftReps}
          onChange={(v) => onDraftChange('draftReps', v)}
          onStep={(delta) => onStep('draftReps', delta)}
          step={1}
        />

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={onSaveDraft}
                disabled={!canSave}
                className="flex-1 bg-green-700 disabled:opacity-30 text-white
                           font-semibold py-3.5 rounded-xl active:scale-95 transition-all"
              >
                Update
              </button>
              <button
                onClick={onDeleteSelected}
                className="flex-1 bg-red-700 text-white font-semibold py-3.5
                           rounded-xl active:scale-95 transition-all"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSaveDraft}
                disabled={!canSave}
                className="flex-1 bg-green-700 disabled:opacity-30 text-white
                           font-semibold py-3.5 rounded-xl active:scale-95 transition-all"
              >
                Save
              </button>
              <button
                onClick={onClearDraft}
                className="flex-1 bg-gray-800 border border-gray-700 text-gray-300
                           font-semibold py-3.5 rounded-xl active:scale-95 transition-all"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Saved sets — tap a row to load it back into the entry panel */}
      {exercise.sets.length > 0 && (
        <div className="border-t border-gray-800">
          {exercise.sets.map((set, i) => (
            <button
              key={set.id}
              onClick={() => onSelectSet(set)}
              className={`w-full flex items-center px-4 py-3 text-left
                         border-b border-gray-800 last:border-0 transition-colors
                         ${exercise.selectedSetId === set.id
                           ? 'bg-red-950/30'
                           : 'active:bg-gray-800/50'}`}
            >
              <span className="w-8 text-xs text-gray-400 font-medium">{i + 1}</span>
              <span className="flex-1 text-sm text-white text-center">
                {set.weight}<span className="text-gray-500 text-xs ml-1">kg</span>
              </span>
              <span className="flex-1 text-sm text-white text-center">
                {set.reps}<span className="text-gray-500 text-xs ml-1">reps</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

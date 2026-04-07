import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import ExercisePicker from '../components/workout/ExercisePicker'
import { logWorkout } from '../api/workouts.api'
import {
  newExercise, addSet, deleteSet,
  updateSet, updateNotes, deleteExercise
} from '../utils/workoutHelpers'

export default function WorkoutLogger() {
  const [exercises,    setExercises]    = useState([])
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const [expandedNote, setExpandedNote] = useState(null) // exercise id
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')
  const navigate = useNavigate()

  // ── exercise actions ─────────────────────────────
  const handleAddExercise = (name, bodyPart) => {
    setExercises(prev => [...prev, newExercise(name, bodyPart)])
  }

  const handleDeleteExercise = (exId) => {
    setExercises(prev => deleteExercise(prev, exId))
  }

  // ── set actions ───────────────────────────────────
  const handleAddSet = (exId) => {
    setExercises(prev => addSet(prev, exId))
  }

  const handleDeleteSet = (exId, setId) => {
    setExercises(prev => deleteSet(prev, exId, setId))
  }

  const handleUpdateSet = (exId, setId, field, value) => {
    setExercises(prev => updateSet(prev, exId, setId, field, value))
  }

  // ── notes ─────────────────────────────────────────
  const handleNotes = (exId, value) => {
    setExercises(prev => updateNotes(prev, exId, value))
  }

  // ── submit ────────────────────────────────────────
  const handleSubmit = async () => {
    if (exercises.length === 0) {
      setError('Add at least one exercise')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await logWorkout({ exercises })
      navigate('/dashboard')
    } catch (err) {
      setError('Failed to save. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="px-4 pt-10 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Log workout</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'short', day: 'numeric'
            })}
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || exercises.length === 0}
          className="bg-red-600 disabled:opacity-40 text-white text-sm
                     font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all"
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 bg-red-900/20 border border-red-800
                        rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Exercise cards */}
      <div className="px-4 space-y-4">
        {exercises.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💪</p>
            <p className="text-gray-400 font-medium">No exercises yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Tap below to add your first exercise
            </p>
          </div>
        )}

        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            noteOpen={expandedNote === ex.id}
            onToggleNote={() =>
              setExpandedNote(prev => prev === ex.id ? null : ex.id)
            }
            onDeleteExercise={() => handleDeleteExercise(ex.id)}
            onAddSet={() => handleAddSet(ex.id)}
            onDeleteSet={(setId) => handleDeleteSet(ex.id, setId)}
            onUpdateSet={(setId, field, val) =>
              handleUpdateSet(ex.id, setId, field, val)
            }
            onNoteChange={(val) => handleNotes(ex.id, val)}
          />
        ))}

        {/* Add exercise button */}
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full border border-dashed border-gray-700 text-gray-500
                     rounded-xl py-4 text-sm active:border-red-700
                     active:text-red-500 transition-colors"
        >
          + Add exercise
        </button>
      </div>

      {/* Exercise picker bottom sheet */}
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
  onUpdateSet, onNoteChange
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* Exercise header */}
      <div className="flex justify-between items-start px-4 pt-4 pb-3">
        <div>
          <h3 className="font-semibold text-white">{exercise.name}</h3>
          <span className="text-xs text-gray-600">{exercise.bodyPart}</span>
        </div>
        <div className="flex gap-3 items-center mt-0.5">
          {/* Notes toggle */}
          <button
            onClick={onToggleNote}
            className={`text-xs transition-colors
              ${noteOpen ? 'text-red-400' : 'text-gray-600'}`}
          >
            Notes
          </button>
          {/* Delete exercise */}
          <button onClick={onDeleteExercise} className="text-gray-700 active:text-red-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Notes input — only when open */}
      {noteOpen && (
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Add a note..."
            value={exercise.notes}
            onChange={e => onNoteChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-sm text-gray-300 placeholder-gray-600
                       outline-none focus:border-gray-500"
          />
        </div>
      )}

      {/* Sets table header */}
      <div className="grid grid-cols-12 px-4 pb-1">
        <span className="col-span-2 text-xs text-gray-600">Set</span>
        <span className="col-span-4 text-xs text-gray-600">Reps</span>
        <span className="col-span-4 text-xs text-gray-600">Weight (kg)</span>
        <span className="col-span-2"></span>
      </div>

      {/* Sets */}
      <div className="px-4 space-y-2 pb-3">
        {exercise.sets.map((set, i) => (
          <div key={set.id} className="grid grid-cols-12 items-center gap-1">
            {/* Set number */}
            <span className="col-span-2 text-xs text-gray-600 font-medium">
              {i + 1}
            </span>

            {/* Reps input */}
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={set.reps}
              onChange={e => onUpdateSet(set.id, 'reps', e.target.value)}
              className="col-span-4 bg-gray-800 border border-gray-700
                         rounded-lg px-2 py-2 text-sm text-white text-center
                         outline-none focus:border-red-700"
            />

            {/* Weight input */}
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={set.weight}
              onChange={e => onUpdateSet(set.id, 'weight', e.target.value)}
              className="col-span-4 bg-gray-800 border border-gray-700
                         rounded-lg px-2 py-2 text-sm text-white text-center
                         outline-none focus:border-red-700"
            />

            {/* Delete set — only show if more than 1 set */}
            <div className="col-span-2 flex justify-center">
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
            </div>
          </div>
        ))}
      </div>

      {/* Add set */}
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
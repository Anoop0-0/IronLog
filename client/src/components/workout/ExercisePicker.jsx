import { useState } from "react";
import { BODY_PARTS, EXERCISES } from "../../utils/exerciseList";
import { useCustomExercises } from "../../hooks/useCustomExercises";
import { createCustomExercise, updateCustomExercise, deleteCustomExercise } from "../../api/exercises.api";

export default function ExercisePicker({ onAdd, onClose }) {
    const [selectedBodyPart, setSelectedPart] = useState(BODY_PARTS[0])
    const [search, setSearch] = useState("")
    const [error, setError] = useState("")

    const { customExercises, addCustomExercise, replaceCustomExercise, removeCustomExercise } = useCustomExercises()

    // inline rename state
    const [editingId, setEditingId] = useState(null)
    const [editValue, setEditValue] = useState("")
    const [savingEdit, setSavingEdit] = useState(false)

    // inline delete-confirm state
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const presetMatches = EXERCISES[selectedBodyPart]
        .filter(ex => ex.toLowerCase().includes(search.toLowerCase()))
        .map(name => ({ name, isCustom: false }))

    const customMatches = customExercises
        .filter(ex => ex.bodyPart === selectedBodyPart)
        .filter(ex => ex.name.toLowerCase().includes(search.toLowerCase()))
        .map(ex => ({ name: ex.name, isCustom: true, id: ex._id }))

    // your own exercises first — they're the ones you actually asked for
    const combined = [...customMatches, ...presetMatches]

    const trimmedSearch = search.trim()
    const hasExactMatch = combined.some(ex => ex.name.toLowerCase() === trimmedSearch.toLowerCase())
    const showCustomOption = trimmedSearch.length > 0 && !hasExactMatch

    const handleAddCustom = async () => {
        setError("")
        try {
            const res = await createCustomExercise({ name: trimmedSearch, bodyPart: selectedBodyPart })
            addCustomExercise(res.data)
        } catch {
            // don't block logging today's set just because remembering it
            // for next time failed — that part is a convenience, not the
            // actual thing the user is here to do
        }
        onAdd(trimmedSearch, selectedBodyPart)
        onClose()
    }

    const startEdit = (ex) => {
        setEditingId(ex.id)
        setEditValue(ex.name)
        setConfirmDeleteId(null)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditValue("")
    }

    const saveEdit = async () => {
        const trimmed = editValue.trim()
        if (!trimmed) return
        setSavingEdit(true)
        setError("")
        try {
            const res = await updateCustomExercise(editingId, { name: trimmed })
            replaceCustomExercise(res.data)
            setEditingId(null)
        } catch {
            setError("Failed to rename exercise — try again")
        } finally {
            setSavingEdit(false)
        }
    }

    const handleDelete = async (id) => {
        setDeleting(true)
        setError("")
        try {
            await deleteCustomExercise(id)
            removeCustomExercise(id)
            setConfirmDeleteId(null)
        } catch {
            setError("Failed to delete exercise — try again")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col justify-end">
      <div className="bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-4 pb-2">
          <h2 className="font-semibold text-white">Add exercise</h2>
          <button onClick={onClose} className="text-gray-500 text-sm">Cancel</button>
        </div>

        {/* Search */}
        <div className="px-4 mb-3">
          <input
            type="text"
            placeholder="Search exercise..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5
                       text-sm text-white placeholder-gray-600 outline-none"
          />
        </div>

        {/* Body part tabs — horizontal scroll */}
        <div className="relative">
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {BODY_PARTS.map(part => (
              <button
                key={part}
                onClick={() => setSelectedPart(part)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                            transition-colors
                            ${selectedBodyPart === part
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-800 text-gray-400'}`}
              >
                {part}
              </button>
            ))}
          </div>
          {/* fade hint that there's more to scroll to the right */}
          <div className="pointer-events-none absolute top-0 right-0 bottom-3 w-8
                          bg-gradient-to-l from-gray-900 to-transparent" />
        </div>

        {error && (
          <div className="mx-4 mb-2 bg-red-900/20 border border-red-800 rounded-lg
                          px-3 py-2 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Exercise list — scrollable */}
        <div className="overflow-y-auto pb-8">
          {showCustomOption && (
            <button
              onClick={handleAddCustom}
              className="w-full text-left px-4 py-3.5 border-b border-gray-800
                         flex items-center gap-2.5 active:bg-gray-800 transition-colors"
            >
              <span className="w-5 h-5 flex-shrink-0 rounded-full bg-red-600
                               text-white text-sm leading-none flex items-center
                               justify-center">+</span>
              <span className="text-sm text-gray-200">
                Add <span className="font-semibold text-white">"{trimmedSearch}"</span> as new exercise
              </span>
            </button>
          )}

          {combined.length === 0 && !showCustomOption && (
            <p className="text-gray-400 text-sm text-center py-8">No exercises found</p>
          )}

          {combined.map(ex => {
            if (ex.isCustom && editingId === ex.id) {
              return (
                <div key={ex.id} className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg
                               px-2.5 py-1.5 text-sm text-white outline-none focus:border-red-700"
                  />
                  <button
                    onClick={saveEdit}
                    disabled={savingEdit || !editValue.trim()}
                    className="text-green-500 disabled:opacity-30 text-xs font-medium px-2 py-2"
                  >
                    Save
                  </button>
                  <button onClick={cancelEdit} className="text-gray-500 text-xs px-2 py-2">
                    Cancel
                  </button>
                </div>
              )
            }

            if (ex.isCustom && confirmDeleteId === ex.id) {
              return (
                <div key={ex.id} className="px-4 py-2.5 border-b border-gray-800
                                            flex items-center justify-between gap-2 bg-red-950/20">
                  <span className="text-sm text-red-300">Delete "{ex.name}"?</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(ex.id)}
                      disabled={deleting}
                      className="text-red-400 disabled:opacity-30 text-xs font-medium px-2 py-2"
                    >
                      Delete
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-gray-500 text-xs px-2 py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={ex.isCustom ? ex.id : ex.name}
                className="flex items-center border-b border-gray-800"
              >
                <button
                  onClick={() => { onAdd(ex.name, selectedBodyPart); onClose() }}
                  className="flex-1 min-w-0 text-left px-4 py-3.5 text-sm text-gray-200
                             active:bg-gray-800 transition-colors truncate"
                >
                  {ex.name}
                </button>
                {ex.isCustom && (
                  <div className="flex items-center gap-1 pr-3 flex-shrink-0">
                    <button
                      onClick={() => startEdit(ex)}
                      className="text-gray-500 active:text-white p-2"
                      aria-label={`Rename ${ex.name}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(ex.id)}
                      className="text-gray-500 active:text-red-500 p-2"
                      aria-label={`Delete ${ex.name}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

}

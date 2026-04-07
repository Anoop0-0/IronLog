import { useState } from "react";
import { BODY_PARTS,EXERCISES } from "../../utils/exerciseList";

export default function ExercisePicker({onAdd,onClose}){
    const [selectedBodyPart,setSelectedPart] = useState(BODY_PARTS[0])
    const [search,setSearch] = useState("")

    const filtered = EXERCISES[selectedBodyPart].filter(ex =>
        ex.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col justify-end">
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
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {BODY_PARTS.map(part => (
            <button
              key={part}
              onClick={() => { setSelectedPart(part); setSearch('') }}
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

        {/* Exercise list — scrollable */}
        <div className="overflow-y-auto pb-8">
          {filtered.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">No exercises found</p>
          )}
          {filtered.map(ex => (
            <button
              key={ex}
              onClick={() => { onAdd(ex, selectedBodyPart); onClose() }}
              className="w-full text-left px-4 py-3.5 border-b border-gray-800
                         text-sm text-gray-200 active:bg-gray-800 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
    
}
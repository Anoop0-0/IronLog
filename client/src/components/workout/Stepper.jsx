// Big +/- stepper for entering weight/reps on a phone without needing the
// keyboard — replaces tapping into a cramped text box for the common case
// (nudging up/down from a nearby value). The center value is still a real
// input so a big jump (e.g. a fresh exercise with nothing logged yet) can
// be typed directly instead of tapped one increment at a time.
export default function Stepper({ label, value, onChange, onStep, step }) {
  const round = (n) => Math.round(n * 10) / 10

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase
                        tracking-wide pb-2 mb-3 border-b border-gray-800">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onStep(round(-step))}
          className="w-14 h-14 flex-shrink-0 rounded-xl bg-gray-800 border
                     border-gray-700 text-white text-2xl font-light
                     active:bg-gray-700 active:scale-95 transition-all"
        >
          −
        </button>

        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-white text-4xl
                     font-bold text-center outline-none
                     [appearance:textfield]
                     [&::-webkit-outer-spin-button]:appearance-none
                     [&::-webkit-inner-spin-button]:appearance-none"
        />

        <button
          type="button"
          onClick={() => onStep(round(step))}
          className="w-14 h-14 flex-shrink-0 rounded-xl bg-gray-800 border
                     border-gray-700 text-white text-2xl font-light
                     active:bg-gray-700 active:scale-95 transition-all"
        >
          +
        </button>
      </div>
    </div>
  )
}

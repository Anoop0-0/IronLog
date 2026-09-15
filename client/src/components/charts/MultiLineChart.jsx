import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// One line per rep count, for the Personal Records and Max Weight for
// Reps graphs. Companion to TrendAreaChart, which stays the single-series
// case — a gradient area fill only reads well with one series.

// Distinct at a glance and on a dark ground. Red stays first so the most
// prominent line matches the app's accent.
const SERIES_COLORS = ['#e24b4a', '#38bdf8', '#a78bfa', '#facc15', '#4ade80']

function CustomTooltip({ active, payload, label, valueSuffix }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-sm font-semibold" style={{ color: p.stroke }}>
          {p.dataKey} reps — {p.value?.toLocaleString()}{valueSuffix}
        </p>
      ))}
    </div>
  )
}

// data: [{ label: 'Sep 1', '5': 100, '8': 80 }, ...]
// keys: ['5', '8'] — a key missing from a row draws a gap, not a zero
export default function MultiLineChart({ data, keys, valueSuffix = 'kg', height = 200 }) {
  const [hidden, setHidden] = useState(() => new Set())

  if (!data || data.length === 0 || keys.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-gray-400 text-sm">No data yet</p>
      </div>
    )
  }

  const toggle = (key) =>
    setHidden(prev => {
      const next = new Set(prev)
      // keep at least one line on screen — hiding the last one leaves an
      // empty chart with no obvious way back
      if (next.has(key)) next.delete(key)
      else if (next.size < keys.length - 1) next.add(key)
      return next
    })

  const colorFor = (key) => SERIES_COLORS[keys.indexOf(key) % SERIES_COLORS.length]

  return (
    <div>
      {/* Legend — tap a rep count to hide its line */}
      <div className="flex flex-wrap gap-2 mb-3">
        {keys.map(key => {
          const off = hidden.has(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                          font-medium border transition-colors
                          ${off
                            ? 'border-gray-800 text-gray-600'
                            : 'border-gray-700 text-gray-200'}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: off ? '#3f3f3f' : colorFor(key) }}
              />
              {key} reps
            </button>
          )
        })}
        <span className="self-center text-[10px] text-gray-500 uppercase tracking-wide">
          tap to hide
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={['auto', 'auto']}
            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
          />
          <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} cursor={{ stroke: '#333' }} />
          {keys.filter(k => !hidden.has(k)).map(key => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colorFor(key)}
              strokeWidth={2}
              // bridge sessions where this rep count wasn't trained, so a
              // record line stays continuous instead of shattering into dots
              connectNulls
              dot={data.length <= 12 ? { fill: colorFor(key), r: 3 } : false}
              activeDot={{ r: 5 }}
              animationDuration={600}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

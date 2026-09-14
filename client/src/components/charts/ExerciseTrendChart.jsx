import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-red-400">
        {payload[0].value}kg
      </p>
    </div>
  )
}

// data: [{ date: 'Sep 1', weight: 80 }, ...] — best (heaviest) set per session
export default function ExerciseTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className="text-gray-400 text-sm">No data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#555', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#555', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}kg`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333' }} />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#e24b4a"
          strokeWidth={2}
          dot={{ fill: '#e24b4a', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

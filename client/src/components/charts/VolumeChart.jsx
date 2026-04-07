import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// Custom tooltip shown on bar tap/hover
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-red-400">
        {payload[0].value.toLocaleString()} kg
      </p>
    </div>
  )
}

export default function VolumeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className="text-gray-600 text-sm">No data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={28}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1f1f1f"
          vertical={false}
        />
        <XAxis
          dataKey="week"
          tick={{ fill: '#555', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#555', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${(v/1000).toFixed(1)}k`}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: '#ffffff08' }}
        />
        <Bar
          dataKey="volume"
          fill="#e24b4a"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
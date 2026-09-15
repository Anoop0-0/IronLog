import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// Replaces the old separate VolumeChart (bar) and ExerciseTrendChart
// (plain line) with one shared, more polished component — gradient fill,
// smooth animated draw-in, consistent styling wherever a "value over
// time" trend needs showing.

function CustomTooltip({ active, payload, label, valueSuffix }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-red-400">
        {payload[0].value.toLocaleString()}{valueSuffix}
      </p>
    </div>
  )
}

// data: [{ label: 'Sep 1', value: 4200 }, ...]
export default function TrendAreaChart({ data, valueSuffix = 'kg', height = 180 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-gray-400 text-sm">No data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e24b4a" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#e24b4a" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
        />
        <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} cursor={{ stroke: '#333' }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#e24b4a"
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={data.length <= 12 ? { fill: '#e24b4a', r: 3 } : false}
          activeDot={{ r: 5 }}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

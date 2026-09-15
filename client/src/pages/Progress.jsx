import { useState, useMemo } from 'react'
import { useNavigate }       from 'react-router-dom'
import AppLayout             from '../components/layout/AppLayout'
import TrendAreaChart        from '../components/charts/TrendAreaChart'
import PRCard                from '../components/charts/PrCard'
import { useWorkouts }       from '../hooks/useWorkouts'
import {
  getPersonalRecords,
  filterByDays,
  getSessionTrend,
  TIMELINE_RANGES,
  PROGRESS_GRAPHS,
} from '../utils/progressHelpers'
import { BODY_PARTS } from '../utils/exerciseList'
import { navigateToExerciseGraphs } from '../utils/exerciseNav'

export default function Progress() {
  const { workouts, loading } = useWorkouts()
  const navigate = useNavigate()
  const [bodyFilter, setBodyFilter] = useState('All')
  const [range,      setRange]      = useState(TIMELINE_RANGES[0])
  const [metric,     setMetric]     = useState(PROGRESS_GRAPHS[0].id)

  const activeGraph = PROGRESS_GRAPHS.find(g => g.id === metric) || PROGRESS_GRAPHS[0]

  const rangeWorkouts = useMemo(
    () => filterByDays(workouts, range.days),
    [workouts, range]
  )

  const trend = useMemo(
    () => getSessionTrend(rangeWorkouts, metric),
    [rangeWorkouts, metric]
  )

  const periodTotal = trend.reduce((sum, t) => sum + t.value, 0)

  // personal records are deliberately all-time regardless of the trend's
  // timeline filter — "best ever" filtered to "best in the last 30 days"
  // would hide your actual PR if you set it outside the window
  const allPRs = useMemo(() => getPersonalRecords(workouts), [workouts])

  const filteredPRs = bodyFilter === 'All'
    ? allPRs
    : allPRs.filter(pr => pr.bodyPart === bodyFilter)

  return (
    <AppLayout>
      <div className="px-4 pt-10 pb-4">
        <h1 className="font-display text-xl font-bold text-white">Progress</h1>
        <p className="text-xs text-gray-400 mt-0.5">Track trends and personal records</p>
      </div>

      {loading ? (
        <div className="px-4 space-y-4">
          <div className="h-48 bg-gray-900 rounded-xl animate-pulse"/>
          <div className="h-24 bg-gray-900 rounded-xl animate-pulse"/>
          <div className="h-24 bg-gray-900 rounded-xl animate-pulse"/>
        </div>
      ) : (
        <>
          {/* Timeline range */}
          <div className="px-4 mb-3">
            <div className="flex gap-2">
              {TIMELINE_RANGES.map(r => (
                <button
                  key={r.label}
                  onClick={() => setRange(r)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                              ${range.label === r.label
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-900 text-gray-400 border border-gray-800'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trend chart section */}
          <div className="px-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="relative flex-1 min-w-0">
                  <select
                    value={metric}
                    onChange={e => setMetric(e.target.value)}
                    aria-label="Graph type"
                    className="w-full appearance-none bg-gray-800 border border-gray-700
                               rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-white
                               outline-none focus:border-red-700"
                  >
                    {PROGRESS_GRAPHS.map(g => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#777"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-red-400">
                    {periodTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">{activeGraph.totalLabel}</p>
                </div>
              </div>
              <TrendAreaChart
                data={trend.map(t => ({ label: t.label, value: t.value }))}
                valueSuffix={activeGraph.suffix}
              />
            </div>
          </div>

          {/* Personal records section */}
          <div className="px-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-white">
                Personal records
              </h2>
              <span className="text-xs text-gray-400">
                {filteredPRs.length} exercises
              </span>
            </div>

            {/* Body part filter pills */}
            <div className="relative mb-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {['All', ...BODY_PARTS].map(part => (
                  <button
                    key={part}
                    onClick={() => setBodyFilter(part)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs
                                font-medium transition-colors
                                ${bodyFilter === part
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-800 text-gray-400'}`}
                  >
                    {part}
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute top-0 right-0 bottom-1 w-8
                              bg-gradient-to-l from-gray-950 to-transparent" />
            </div>

            {/* PR list — tap through to that exercise's full graphs */}
            {filteredPRs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">No records yet</p>
                <p className="text-gray-500 text-xs mt-1">
                  Log a workout to see your PRs
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPRs.map(pr => (
                  <button
                    key={pr.exercise}
                    onClick={() => navigateToExerciseGraphs(navigate, pr)}
                    className="w-full text-left active:opacity-80 transition-opacity"
                  >
                    <PRCard record={pr} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  )
}

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
} from '../utils/progressHelpers'
import { BODY_PARTS } from '../utils/exerciseList'

const RANGES = [
  { label: '1M',  days: 30 },
  { label: '3M',  days: 90 },
  { label: '6M',  days: 180 },
  { label: '1Y',  days: 365 },
  { label: 'All', days: null },
]

export default function Progress() {
  const { workouts, loading } = useWorkouts()
  const navigate = useNavigate()
  const [bodyFilter, setBodyFilter] = useState('All')
  const [range,      setRange]      = useState(RANGES[0])
  const [metric,     setMetric]     = useState('volume') // 'volume' | 'reps'

  const rangeWorkouts = useMemo(
    () => range.days === null ? workouts : filterByDays(workouts, range.days),
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

  const goToExerciseGraphs = (pr) => {
    // ExerciseDetail treats "no entry today AND no bodyPart in state" as
    // not-found (it's how it knows whether a fresh log is legitimate) —
    // a PR is very often for an exercise you haven't done today, so this
    // has to come along or it bounces straight back to /log
    navigate(`/log/${encodeURIComponent(pr.exercise)}`, {
      state: { initialTab: 2, bodyPart: pr.bodyPart },
    })
  }

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
              {RANGES.map(r => (
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
              <div className="flex justify-between items-start mb-4">
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                  {['volume', 'reps'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors
                                  ${metric === m ? 'bg-red-600 text-white' : 'text-gray-400'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-400">
                    {periodTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {metric === 'volume' ? 'kg total' : 'reps total'}
                  </p>
                </div>
              </div>
              <TrendAreaChart
                data={trend.map(t => ({ label: t.label, value: t.value }))}
                valueSuffix={metric === 'volume' ? 'kg' : ' reps'}
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
                    onClick={() => goToExerciseGraphs(pr)}
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

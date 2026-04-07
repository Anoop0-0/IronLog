import { useState, useMemo } from 'react'
import AppLayout             from '../components/layout/AppLayout'
import VolumeChart           from '../components/charts/VolumeChart'
import PRCard                from '../components/charts/PrCard'
import { useWorkouts }       from '../hooks/useWorkouts'
import {
  getWeeklyVolume,
  getPersonalRecords,
  filterByDays
} from '../utils/progressHelpers'
import { BODY_PARTS } from '../utils/exerciseList'

export default function Progress() {
  const { workouts, loading } = useWorkouts()
  const [bodyFilter, setBodyFilter] = useState('All')

  // useMemo — only recomputes when workouts changes, not on every render
  const last30 = useMemo(
    () => filterByDays(workouts, 30),
    [workouts]
  )

  const weeklyVolume = useMemo(
    () => getWeeklyVolume(last30),
    [last30]
  )

  const allPRs = useMemo(
    () => getPersonalRecords(workouts),
    [workouts]
  )

  // filter PRs by selected body part
  const filteredPRs = bodyFilter === 'All'
    ? allPRs
    : allPRs.filter(pr => pr.bodyPart === bodyFilter)

  return (
    <AppLayout>
      <div className="px-4 pt-10 pb-4">
        <h1 className="text-xl font-bold text-white">Progress</h1>
        <p className="text-xs text-gray-600 mt-0.5">Last 30 days</p>
      </div>

      {loading ? (
        <div className="px-4 space-y-4">
          <div className="h-48 bg-gray-900 rounded-xl animate-pulse"/>
          <div className="h-24 bg-gray-900 rounded-xl animate-pulse"/>
          <div className="h-24 bg-gray-900 rounded-xl animate-pulse"/>
        </div>
      ) : (
        <>
          {/* Volume chart section */}
          <div className="px-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Weekly volume
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Total kg lifted per week
                  </p>
                </div>
                {/* Total for the period */}
                <div className="text-right">
                  <p className="text-lg font-bold text-red-400">
                    {weeklyVolume
                      .reduce((sum, w) => sum + w.volume, 0)
                      .toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">kg total</p>
                </div>
              </div>
              <VolumeChart data={weeklyVolume} />
            </div>
          </div>

          {/* Personal records section */}
          <div className="px-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-white">
                Personal records
              </h2>
              <span className="text-xs text-gray-600">
                {filteredPRs.length} exercises
              </span>
            </div>

            {/* Body part filter pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
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

            {/* PR list */}
            {filteredPRs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-sm">No records yet</p>
                <p className="text-gray-700 text-xs mt-1">
                  Log a workout to see your PRs
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPRs.map(pr => (
                  <PRCard key={pr.exercise} record={pr} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  )
}
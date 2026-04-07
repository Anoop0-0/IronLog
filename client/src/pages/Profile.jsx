import { useMemo }      from 'react'
import { useNavigate }  from 'react-router-dom'
import AppLayout        from '../components/layout/AppLayout'
import { useAuth }      from '../context/AuthContext'
import { useWorkouts }  from '../hooks/useWorkouts'
import {
  getTotalVolume,
  getTotalSets,
  getMostTrainedPart,
} from '../utils/progressHelpers'

// single stat card
function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

// confirmation dialog for logout
function LogoutButton({ onLogout }) {
  return (
    <button
      onClick={onLogout}
      className="w-full bg-gray-900 border border-gray-800 rounded-xl
                 p-4 text-left active:border-red-900 transition-colors group"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* icon */}
          <div className="w-9 h-9 rounded-full bg-red-900/20 border
                          border-red-900/40 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#e24b4a" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-red-400">Log out</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#555" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </button>
  )
}

export default function Profile() {
  const { user, logout }              = useAuth()
  const { workouts, loading }         = useWorkouts()
  const navigate                      = useNavigate()

  const totalVolume   = useMemo(() => getTotalVolume(workouts),     [workouts])
  const totalSets     = useMemo(() => getTotalSets(workouts),       [workouts])
  const topBodyPart   = useMemo(() => getMostTrainedPart(workouts), [workouts])

  // format volume — show in tonnes if over 1000kg
  const volumeDisplay = totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(1)}t`
    : `${Math.round(totalVolume)}kg`

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // get initials from username — e.g. "anoop" → "A", "anoop kumar" → "AK"
  const initials = (user?.username || 'A')
    .split(' ')
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('')

  return (
    <AppLayout>
      {/* Avatar + username */}
      <div className="flex flex-col items-center pt-12 pb-8 px-4">
        <div className="w-20 h-20 rounded-full bg-red-900/30 border-2
                        border-red-700/50 flex items-center justify-center
                        text-2xl font-bold text-red-400 mb-3">
          {initials}
        </div>
        <h1 className="text-xl font-bold text-white">
          {user?.username ?? 'Athlete'}
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {user?.email ?? ''}
        </p>
      </div>

      {/* Stats grid */}
      <div className="px-4 mb-6">
        <h2 className="text-xs font-medium text-gray-600 uppercase
                       tracking-wider mb-3">
          Your stats
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i}
                className="h-24 bg-gray-900 rounded-xl animate-pulse"/>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total workouts"
              value={workouts.length}
              sub="sessions logged"
            />
            <StatCard
              label="Total volume"
              value={volumeDisplay}
              sub="weight lifted"
            />
            <StatCard
              label="Sets logged"
              value={totalSets.toLocaleString()}
              sub="across all sessions"
            />
            <StatCard
              label="Most trained"
              value={topBodyPart}
              sub="body part"
            />
          </div>
        )}
      </div>

      {/* Account section */}
      <div className="px-4 mb-6">
        <h2 className="text-xs font-medium text-gray-600 uppercase
                       tracking-wider mb-3">
          Account
        </h2>
        <LogoutButton onLogout={handleLogout} />
      </div>

      {/* App version */}
      <p className="text-center text-xs text-gray-800 pb-4">
        IRONLOG v1.0.0
      </p>
    </AppLayout>
  )
}
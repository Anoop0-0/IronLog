import { useAuth }      from '../context/AuthContext'
import { useWorkouts }  from '../hooks/useWorkouts'
import AppLayout        from '../components/layout/AppLayout'
import WorkoutCard      from '../components/workout/Workoutcard'
import { useNavigate }  from 'react-router-dom'

// Skeleton card shown while loading
function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-1/3" />
      <div className="h-3 bg-gray-800 rounded w-1/4" />
      <div className="h-3 bg-gray-800 rounded w-full" />
      <div className="h-3 bg-gray-800 rounded w-5/6" />
    </div>
  )
}

export default function Dashboard() {
  const { user, logout }              = useAuth()
  const { workouts, loading, error }  = useWorkouts()
  const navigate                      = useNavigate()

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-10 pb-6">
        <div>
          <p className="text-gray-500 text-sm">Welcome back</p>
          <h1 className="text-2xl font-bold text-white">
            {user?.username ?? 'Athlete'} 👋
          </h1>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-600 border border-gray-800 px-3 py-1.5 rounded-full"
        >
          Logout
        </button>
      </div>

      {/* Quick action */}
      <div className="px-4 mb-6">
        <button
          onClick={() => navigate('/log')}
          className="w-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all
                     text-white font-semibold py-4 rounded-xl text-base"
        >
          + Log today's workout
        </button>
      </div>

      {/* Recent workouts */}
      <div className="px-4">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Recent workouts
        </h2>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && workouts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="text-gray-400 font-medium">No workouts yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Log your first session to get started
            </p>
          </div>
        )}

        {/* Workout list */}
        {!loading && !error && workouts.length > 0 && (
          <div className="space-y-3">
            {workouts.map(workout => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
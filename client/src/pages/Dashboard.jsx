import { useState }     from 'react'
import { useAuth }      from '../context/AuthContext'
import { useWorkouts }  from '../hooks/useWorkouts'
import AppLayout        from '../components/layout/AppLayout'
import WorkoutCard      from '../components/workout/WorkoutCard'
import { useNavigate }  from 'react-router-dom'
import { deleteWorkout, updateWorkout } from '../api/workouts.api'

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
  const { user, logout }                          = useAuth()
  const { workouts, loading, error,
          removeWorkout, replaceWorkout }          = useWorkouts()
  const navigate                                  = useNavigate()
  const [actionError, setActionError]             = useState('')

  const handleDelete = async (id) => {
    setActionError('')
    try {
      await deleteWorkout(id)
      removeWorkout(id)
    } catch {
      setActionError('Failed to delete workout — try again')
    }
  }

  const handleUpdate = async (id, exercises) => {
    setActionError('')
    try {
      const res = await updateWorkout(id, { exercises })
      replaceWorkout(res.data)
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save changes — try again')
    }
  }

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

        {loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {actionError && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4
                          text-red-400 text-sm mb-3 flex justify-between items-center">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-red-500 text-xs ml-2">✕</button>
          </div>
        )}

        {!loading && !error && workouts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="text-gray-400 font-medium">No workouts yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Log your first session to get started
            </p>
          </div>
        )}

        {!loading && !error && workouts.length > 0 && (
          <div className="space-y-3">
            {workouts.map(workout => (
              <WorkoutCard
                key={workout._id}
                workout={workout}
                onDelete={() => handleDelete(workout._id)}
                onUpdate={(exercises) => handleUpdate(workout._id, exercises)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
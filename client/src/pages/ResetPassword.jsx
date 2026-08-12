import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { resetPassword } from '../api/auth.api'
import { useAuth } from '../hooks/useAuth'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate   = useNavigate()
  const { login }  = useAuth()

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await resetPassword(token, password)
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or has expired')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-black text-red-500 text-center mb-8 tracking-widest">IRONLOG</h1>

        <h2 className="text-lg font-semibold mb-1">Set a new password</h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose a new password for your account.
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-red-500
                         rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-red-500
                         rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50
                       py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Saving...' : 'Reset password'}
          </button>
        </form>

        <Link to="/login" className="block text-center text-sm text-gray-500 mt-6 hover:text-gray-300">
          ← Back to login
        </Link>
      </div>
    </div>
  )
}

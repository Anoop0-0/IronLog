import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth.api'
import AuthShell from '../components/layout/AuthShell'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error,   setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) {
      setError('Enter a valid email')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await forgotPassword(email)
      setMessage(res.data.message)
    } catch {
      // backend always responds 200 with a generic message on success,
      // so a caught error here means something actually went wrong
      setError('Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
        <h1 className="font-display text-5xl font-black text-red-500 text-center mb-8 tracking-widest">IRONLOG</h1>

        <h2 className="text-lg font-semibold mb-1">Forgot password</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enter your account email and we'll send you a reset link.
        </p>

        {message && (
          <div className="bg-green-900/20 border border-green-800 text-green-400 text-sm rounded-lg p-3 mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-red-500
                         rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50
                       py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <Link to="/login" className="block text-center text-sm text-gray-500 mt-6 hover:text-gray-300">
          ← Back to login
        </Link>
    </AuthShell>
  )
}

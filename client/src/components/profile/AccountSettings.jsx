import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { updateProfile, changePassword, deleteAccount } from '../../api/auth.api'

function SectionCard({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Banner({ type, children }) {
  const styles = type === 'success'
    ? 'bg-green-900/20 border-green-800 text-green-400'
    : 'bg-red-900/20 border-red-800 text-red-400'
  return (
    <div className={`border rounded-lg px-3 py-2 text-xs mb-3 ${styles}`}>
      {children}
    </div>
  )
}

function EditProfileForm() {
  const { user, updateUser } = useAuth()
  const [username, setUsername] = useState(user?.username || '')
  const [email,    setEmail]    = useState(user?.email || '')
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState(null) // { type, text }

  const handleSave = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await updateProfile({ username, email })
      updateUser({ ...user, ...res.data.user })
      setMessage({ type: 'success', text: 'Profile updated' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="Edit profile">
      {message && <Banner type={message.type}>{message.text}</Banner>}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Username</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-sm text-white outline-none focus:border-red-700"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-sm text-white outline-none focus:border-red-700"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-gray-800 disabled:opacity-40 text-white text-sm
                     font-medium py-2.5 rounded-lg active:scale-95 transition-all"
        >
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </SectionCard>
  )
}

function ChangePasswordForm() {
  const { user, updateUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirm,         setConfirm]         = useState('')
  const [loading,         setLoading]         = useState(false)
  const [message,         setMessage]         = useState(null)

  const handleSave = async () => {
    setMessage(null)
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' })
      return
    }
    if (newPassword !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      updateUser({ ...user, hasPassword: true })
      setMessage({ type: 'success', text: 'Password updated' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title={user?.hasPassword ? 'Change password' : 'Set a password'}>
      {message && <Banner type={message.type}>{message.text}</Banner>}
      {!user?.hasPassword && (
        <p className="text-xs text-gray-600 mb-3">
          Your account currently only signs in with Google. Set a password to also log in with email.
        </p>
      )}
      <div className="space-y-3">
        {user?.hasPassword && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg
                         px-3 py-2 text-sm text-white outline-none focus:border-red-700"
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-sm text-white outline-none focus:border-red-700"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-sm text-white outline-none focus:border-red-700"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-gray-800 disabled:opacity-40 text-white text-sm
                     font-medium py-2.5 rounded-lg active:scale-95 transition-all"
        >
          {loading ? 'Saving...' : 'Update password'}
        </button>
      </div>
    </SectionCard>
  )
}

function DeleteAccountSection() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    try {
      await deleteAccount()
      logout()
      navigate('/')
    } catch {
      setError('Failed to delete account — try again')
      setLoading(false)
    }
  }

  return (
    <SectionCard title="Delete account">
      {error && <Banner type="error">{error}</Banner>}
      <p className="text-xs text-gray-600 mb-3">
        This permanently deletes your account and workout history. This can't be undone.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full border border-red-900 text-red-500 text-sm font-medium
                     py-2.5 rounded-lg active:bg-red-900/20 transition-colors"
        >
          Delete my account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-red-400">
            Type <span className="font-mono font-bold">DELETE</span> to confirm.
          </p>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="w-full bg-gray-800 border border-red-900 rounded-lg
                       px-3 py-2 text-sm text-white outline-none"
            placeholder="DELETE"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirming(false); setConfirmText('') }}
              className="flex-1 bg-gray-800 text-gray-400 py-2.5 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || loading}
              className="flex-1 bg-red-700 disabled:opacity-40 text-white
                         font-semibold py-2.5 rounded-lg text-sm"
            >
              {loading ? 'Deleting...' : 'Confirm delete'}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

export default function AccountSettings() {
  return (
    <div className="space-y-3">
      <EditProfileForm />
      <ChangePasswordForm />
      <DeleteAccountSection />
    </div>
  )
}

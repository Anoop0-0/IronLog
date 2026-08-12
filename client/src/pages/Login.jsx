import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { loginUser, registerUser } from '../api/auth.api'
import { useGoogleLogin } from '@react-oauth/google'
import { googleAuth }     from '../api/auth.api'
import AuthShell          from '../components/layout/AuthShell'

export default function Login() {
    const [tab, setTab] = useState('login')
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirm: '' })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [serverError, setServerError] = useState('')


    const {login}=useAuth();
    const navigate=useNavigate();

    const handleChange=(e)=>{
        setFormData(prev=>({...prev,[e.target.name]:e.target.value}));
        setErrors(prev=>({...prev,[e.target.name]:''}));
        setServerError('');
    }
    const validateLogin = () => {
    const errs = {}
    if (!formData.email.includes('@')) errs.email = 'Enter a valid email'
    if (formData.password.length < 6) errs.password = 'Min 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }
    const validateRegister = () => {
        const errs = {}
        if (formData.username.length < 3) errs.username = 'Min 3 characters'
        if (!formData.email.includes('@')) errs.email = 'Enter a valid email'
        if (formData.password.length < 6) errs.password = 'Min 6 characters'
        if (formData.password !== formData.confirm) errs.confirm = 'Passwords do not match'
        setErrors(errs)
        return Object.keys(errs).length === 0
  }

  const handleLogin = async () => {
    if (!validateLogin()) return
    setLoading(true)
    setServerError('')
    try {
      const res = await loginUser({ email: formData.email, password: formData.password })
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!validateRegister()) return
    setLoading(true)
    setServerError('')
    try {
      const res = await registerUser({ username: formData.username, email: formData.email, password: formData.password })
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }
  const handleGoogleLogin = useGoogleLogin({
  onSuccess: async (response) => {
    try {
      setLoading(true)
      setServerError('')
      const res = await googleAuth(response.access_token)
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch {
      setServerError('Google login failed. Try again.')
    } finally {
      setLoading(false)
    }
  },
  onError: () => setServerError('Google login failed. Try again.')
})

  return(
    <AuthShell>
        <h1 className="font-display text-5xl font-black text-red-500 text-center tracking-widest">IRONLOG</h1>
        <p className="text-center text-sm text-gray-500 mt-2 mb-8">
          Track lifts. Crush friends.
        </p>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 pb-3 text-sm font-medium capitalize transition-colors
                ${tab === t ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}>
              {t === 'login' ? 'Log in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg p-3 mb-4">
            {serverError}
          </div>
        )}

        {/* Login form */}
        {tab === 'login' && (
          <div className="flex flex-col gap-4">
            <Field label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} />
            <Field label="Password" name="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} />
            <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-gray-300 -mt-2 self-end">
              Forgot password?
            </Link>
            <button onClick={handleLogin} disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 py-3 rounded-lg font-medium transition-colors">
              {loading ? 'Logging in...' : 'Log in'}
            </button>
            {/* add this after the submit button in both login and register panels */}
<div className="flex items-center gap-3 my-2">
  <div className="flex-1 h-px bg-gray-800"/>
  <span className="text-xs text-gray-400">or</span>
  <div className="flex-1 h-px bg-gray-800"/>
</div>

<button
  onClick={handleGoogleLogin}
  disabled={loading}
  className="w-full flex items-center justify-center gap-3
             bg-white text-gray-800 font-medium py-3 rounded-xl
             text-sm active:scale-95 transition-all disabled:opacity-50"
>
  {/* Google SVG icon */}
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
  Continue with Google
</button>
          </div>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <div className="flex flex-col gap-4">
            <Field label="Username" name="username" value={formData.username} onChange={handleChange} error={errors.username} />
            <Field label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} />
            <Field label="Password" name="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} />
            <Field label="Confirm password" name="confirm" type="password" value={formData.confirm} onChange={handleChange} error={errors.confirm} />
            <button onClick={handleRegister} disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 py-3 rounded-lg font-medium transition-colors">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            {/* add this after the submit button in both login and register panels */}
<div className="flex items-center gap-3 my-2">
  <div className="flex-1 h-px bg-gray-800"/>
  <span className="text-xs text-gray-400">or</span>
  <div className="flex-1 h-px bg-gray-800"/>
</div>

<button
  onClick={handleGoogleLogin}
  disabled={loading}
  className="w-full flex items-center justify-center gap-3
             bg-white text-gray-800 font-medium py-3 rounded-xl
             text-sm active:scale-95 transition-all disabled:opacity-50"
>
  {/* Google SVG icon */}
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
  Continue with Google
</button>
          </div>
        )}
    </AuthShell>
  )
}

// Small reusable input component — defined in the same file for now
function Field({ label, name, type = 'text', value, onChange, error }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange}
        className="w-full bg-gray-900 border border-gray-700 focus:border-red-500 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}




  
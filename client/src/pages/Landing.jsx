import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser, registerUser } from '../api/auth.api'

export default function Landing(){
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


  return(
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-black text-red-500 text-center mb-8 tracking-widest">IRONLOG</h1>

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
            <button onClick={handleLogin} disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 py-3 rounded-lg font-medium transition-colors">
              {loading ? 'Logging in...' : 'Log in'}
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
          </div>
        )}
      </div>
    </div>
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




  
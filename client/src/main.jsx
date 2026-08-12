import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { TimerProvider } from './context/TimerContext'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { registerSW } from 'virtual:pwa-register'

// silently refresh the cached app shell when a new version deploys —
// this is what actually makes the installed PWA work offline
registerSW({ immediate: true })


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <AuthProvider>
    <TimerProvider>
    <App />
    </TimerProvider>
    </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute  from './components/layout/ProtectedRoute'
import RestTimer       from './components/ui/RestTimer'
import Landing         from './pages/Landing'
import Login           from './pages/Login'
import Dashboard       from './pages/Dashboard'
import WorkoutLogger   from './pages/WorkoutLogger'
import Progress        from './pages/Progress'
import Contests        from './pages/Contests'
import Profile         from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <RestTimer />
      <Routes>
        <Route path="/"          element={<Landing />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/log"       element={<ProtectedRoute><WorkoutLogger /></ProtectedRoute>} />
        <Route path="/progress"  element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/contests"  element={<ProtectedRoute><Contests /></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={
          <div className="min-h-screen bg-gray-950 text-white flex flex-col
                          items-center justify-center gap-3">
            <p className="text-5xl">404</p>
            <p className="text-gray-500 text-sm">Page not found</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}
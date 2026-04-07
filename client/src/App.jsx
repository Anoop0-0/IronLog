import { BrowserRouter,Routes,Route } from 'react-router-dom'
import ProtectedRoutes from './components/layout/ProtetctedRoutes'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import WorkoutLogger from './pages/WorloutLogger'
import Progress from './pages/Progress'
import Contests from './pages/Contests'
import Profile from './pages/Profile'
function App() {


  return (
    <>
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Landing/>}/>
      <Route path='/dashboard' element={<ProtectedRoutes><Dashboard/></ProtectedRoutes>}/>
      <Route path="/log" element={<ProtectedRoutes><WorkoutLogger/></ProtectedRoutes>} />
      <Route path="/progress" element={<ProtectedRoutes><Progress/></ProtectedRoutes>} />
      <Route path="/contests" element={<ProtectedRoutes><Contests/></ProtectedRoutes>} />
      <Route path="/profile"  element={<ProtectedRoutes><Profile/></ProtectedRoutes>} />
      {/* add this as the last Route inside <Routes> */}
      <Route path="*" element={
        <div className="min-h-screen bg-gray-950 text-white flex flex-col
                  items-center justify-center gap-3">
          <p className="text-5xl">404</p>
          <p className="text-gray-500 text-sm">Page not found</p>
        </div>
      } />
    </Routes>
    </BrowserRouter>
    </>
  )
}

export default App

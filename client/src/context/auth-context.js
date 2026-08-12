import { createContext } from 'react'

// the raw context object lives in its own file so AuthContext.jsx (the
// AuthProvider component) and useAuth.js (the hook) can each export a
// single kind of thing — Fast Refresh requires component files to only
// export components
export const AuthContext = createContext()

import { useContext } from 'react'
import { AuthContext } from '../context/auth-context'

//custom hook to use the context
export function useAuth(){
    return useContext(AuthContext);
}

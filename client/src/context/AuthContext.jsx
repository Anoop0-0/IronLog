import { useState } from "react";
import { AuthContext } from "./auth-context";

//wrapping the whole app
export function AuthProvider({children}){
    const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user'))
  )
    const [token, setToken] = useState(localStorage.getItem('token'))

    //login function
    const login=(userData,authToken)=>{
        setUser(userData);
        setToken(authToken);
        localStorage.setItem("token",authToken);
        localStorage.setItem('user', JSON.stringify(userData))
    }

    //logout function
    const logout=()=>{
        setUser(null)
        setToken(null)
        localStorage.removeItem("token");
        localStorage.removeItem('user')
    }

    // patch the stored user after a profile edit (no new token involved)
    const updateUser=(userData)=>{
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData))
    }

    return(
        <AuthContext.Provider value={{user,token,login,logout,updateUser,isLoggedIn: !!token}}>
            {children}
        </AuthContext.Provider>
    )
}

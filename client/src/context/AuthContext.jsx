import { createContext, useContext,useState } from "react";

//creating context object
const AuthContext = createContext();


//wrapping the whole app
export function AuthProvider({children}){
    const [user, setUser] = useState({ username: 'Anoop' })  // fake user
    const [token, setToken] = useState('fake-token')          // fake token

    //login function
    const login=(userData,authToken)=>{
        setUser(userData);
        setToken(authToken);
        localStorage.setItem("token",authToken);
    }

    //logout function
    const logout=()=>{
        setUser(null)
        setToken(null)
        localStorage.removeItem("token");
    }
    return(
        <AuthContext.Provider value={{user,token,login,logout,isLoggedIn: !!token}}>
            {children}
        </AuthContext.Provider>
    )
}

//custom hook to use the context
export function useAuth(){
    return useContext(AuthContext);
}


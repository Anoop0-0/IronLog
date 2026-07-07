import { createContext, useContext, useState } from 'react'

const TimerContext = createContext(null)

export function TimerProvider({ children }) {
  const [autoStart,    setAutoStart]    = useState(true)
  const [triggerStart, setTriggerStart] = useState(0) // increment to trigger

  const startRestTimer = () => {
    if (autoStart) {
      setTriggerStart(prev => prev + 1)
    }
  }

  return (
    <TimerContext.Provider value={{ autoStart, setAutoStart, triggerStart, startRestTimer }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  return useContext(TimerContext)
}
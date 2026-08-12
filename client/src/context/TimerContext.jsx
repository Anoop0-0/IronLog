import { useState } from 'react'
import { TimerContext } from './timer-context'

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

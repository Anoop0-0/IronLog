import { useContext } from 'react'
import { TimerContext } from '../context/timer-context'

export function useTimer() {
  return useContext(TimerContext)
}

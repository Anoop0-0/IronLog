import { useState, useEffect } from 'react'
import { getContests } from '../api/contests.api'

export function useContests() {
  const [contests, setContests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getContests()
        setContests(res.data)
      } catch (err) {
        setError('Failed to load contests')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const addContest = (contest) =>
    setContests(prev => [contest, ...prev])

  return { contests, loading, error, addContest }
}
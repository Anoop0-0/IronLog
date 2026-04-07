import api from './axios'

export const getContests      = ()          => api.get('/contests')
export const createContest    = (data)      => api.post('/contests', data)
export const joinContest      = (code)      => api.post('/contests/join', { code })
export const getLeaderboard   = (id)        => api.get(`/contests/${id}/leaderboard`)
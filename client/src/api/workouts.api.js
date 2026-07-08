import api from './axios'

export const getWorkouts  = ()       => api.get('/workouts')
export const logWorkout   = (data)   => api.post('/workouts', data)
export const deleteWorkout = (id)    => api.delete(`/workouts/${id}`)
export const updateWorkout = (id, data) => api.put(`/workouts/${id}`, data)
export const addSetToToday = (data) => api.post('/workouts/today/set', data)
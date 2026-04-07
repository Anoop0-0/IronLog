import api from './axios'

export const getWorkouts  = ()       => api.get('/workouts')
export const logWorkout   = (data)   => api.post('/workouts', data)
export const deleteWorkout = (id)    => api.delete(`/workouts/${id}`)
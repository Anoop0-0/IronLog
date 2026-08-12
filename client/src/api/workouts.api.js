import api from './axios'

export const getWorkouts  = ()       => api.get('/workouts')
export const getTodayWorkout = ()    => api.get('/workouts/today')
export const logWorkout = (data) => api.post('/workouts', data)
export const deleteWorkout = (id) => api.delete(`/workouts/${id}`)
export const updateWorkout = (id, data) => api.put(`/workouts/${id}`, data)
export const addSetToToday = (data) => api.post('/workouts/today/set', data)
export const updateSetInToday = (setId, data) =>api.put(`/workouts/today/set/${setId}`, data)
export const deleteSetFromToday = (setId, exerciseName) =>
  api.delete(`/workouts/today/set/${setId}`, { data: { exerciseName } })
export const updateExerciseNotes = (data) => api.put('/workouts/today/exercise/notes', data)
export const deleteExerciseFromToday = (exerciseName) =>
  api.delete('/workouts/today/exercise', { data: { exerciseName } })

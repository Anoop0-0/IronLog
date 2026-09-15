import api from './axios'

// Every set-level call takes an optional `date` — local noon on the day
// being logged, see utils/workoutDays.js. Omit it and the server falls
// back to its rolling "today" window, which is what the Log tab does
// when you haven't picked a past day.
//
// These hit the generic /workouts/set routes rather than the older
// /workouts/today/set ones. Both are live server-side, so a PWA still
// running a cached older bundle keeps working until it updates.

export const getWorkouts  = ()       => api.get('/workouts')
export const getTodayWorkout = ()    => api.get('/workouts/today')
export const getWorkoutForDay = (date) => api.get('/workouts/day', { params: { date } })
export const getExerciseHistory = (name) => api.get(`/workouts/exercise/${encodeURIComponent(name)}/history`)
export const logWorkout = (data) => api.post('/workouts', data)
export const deleteWorkout = (id) => api.delete(`/workouts/${id}`)
export const updateWorkout = (id, data) => api.put(`/workouts/${id}`, data)

export const addSetToToday = (data) => api.post('/workouts/set', data)

export const updateSetInToday = (setId, data) => api.put(`/workouts/set/${setId}`, data)

export const deleteSetFromToday = (setId, exerciseName, date) =>
  api.delete(`/workouts/set/${setId}`, { data: { exerciseName, date } })

export const updateExerciseNotes = (data) => api.put('/workouts/exercise/notes', data)

export const deleteExerciseFromToday = (exerciseName, date) =>
  api.delete('/workouts/exercise', { data: { exerciseName, date } })

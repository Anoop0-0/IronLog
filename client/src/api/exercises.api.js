import api from './axios'

export const getCustomExercises    = ()           => api.get('/exercises')
export const createCustomExercise  = (data)       => api.post('/exercises', data)
export const updateCustomExercise  = (id, data)   => api.put(`/exercises/${id}`, data)
export const deleteCustomExercise  = (id)         => api.delete(`/exercises/${id}`)

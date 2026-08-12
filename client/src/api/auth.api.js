import api from "./axios";

export  const loginUser=(data) => api.post('/auth/login', data);
export const registerUser=(data) => api.post('/auth/register', data);
export const googleAuth = (token) => api.post('/auth/google', { token })

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword  = (token, password) => api.post('/auth/reset-password', { token, password })
export const changePassword = (currentPassword, newPassword) =>
  api.put('/auth/change-password', { currentPassword, newPassword })
export const updateProfile  = (data) => api.put('/auth/profile', data)
export const deleteAccount  = () => api.delete('/auth/account')

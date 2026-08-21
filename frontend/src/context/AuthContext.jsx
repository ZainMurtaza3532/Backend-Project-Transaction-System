import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API } from '../services/api'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const checkAuth = useCallback(async () => {
    const token = API.getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const res = await API.getMe()
      setUser(res.user)
    } catch (err) {
      API.setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()

    const handleUnauthorized = () => {
      setUser(null)
      showToast('Session Expired', 'Please sign in again to continue.', 'info')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [checkAuth, showToast])

  const login = async (email, password) => {
    const res = await API.login(email, password)
    API.setToken(res.token)
    setUser(res.user)
    showToast('Welcome Back!', `Signed in as ${res.user.name}`, 'success')
    return res.user
  }

  const register = async (name, email, password) => {
    const res = await API.register(name, email, password)
    API.setToken(res.token)
    setUser(res.user)
    showToast('Account Created!', 'Your account and default wallet are active.', 'success')
    return res.user
  }

  const logout = async () => {
    try {
      await API.logout()
    } catch (e) {}
    API.setToken(null)
    setUser(null)
    showToast('Signed Out', 'You have been safely signed out.', 'info')
  }

  const updateProfile = async (payload) => {
    const res = await API.updateProfile(payload)
    setUser(res.user)
    showToast('Profile Updated', 'Your profile details have been saved.', 'success')
    return res.user
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

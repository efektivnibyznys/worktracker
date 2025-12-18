'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'

export function useAuth() {
  const supabase = createClient()
  const { user, setUser, setLoading, signOut: clearUser } = useAuthStore()

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      setUser(data.user)
      return { user: data.user, error: null }
    } catch (error: any) {
      return { user: null, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [supabase, setUser, setLoading])

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      return { user: data.user, error: null }
    } catch (error: any) {
      return { user: null, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading])

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      clearUser()
      return { error: null }
    } catch (error: any) {
      return { error: error.message }
    } finally {
      setLoading(false)
    }
  }, [supabase, clearUser, setLoading])

  return {
    user,
    signIn,
    signUp,
    signOut,
  }
}

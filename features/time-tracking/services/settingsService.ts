import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { Settings } from '../types/settings.types'

export class SettingsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get settings for current user
   */
  async get(userId: string): Promise<Settings | null> {
    const { data, error } = await this.supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If settings don't exist, create default ones
      if (error.code === 'PGRST116') {
        return this.create(userId)
      }
      throw error
    }

    return data
  }

  /**
   * Create default settings for user
   */
  async create(userId: string): Promise<Settings> {
    const { data, error } = await this.supabase
      .from('settings')
      .insert([{
        user_id: userId,
        default_hourly_rate: 850,
        currency: 'Kč',
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update user settings
   */
  async update(userId: string, updates: Partial<Settings>): Promise<Settings> {
    const { data, error } = await this.supabase
      .from('settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

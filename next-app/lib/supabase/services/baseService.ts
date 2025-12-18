import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Base service class for all Supabase services
 * Provides common CRUD operations for any table
 * @template T The type of the table row
 */
export abstract class BaseService<T> {
  protected abstract readonly tableName: keyof Database['public']['Tables']
  protected supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Get all records from the table
   */
  async getAll(): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as T[]
  }

  /**
   * Get a single record by ID
   */
  async getById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as T
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert([data as any])
      .select()
      .single()

    if (error) throw error
    return created as T
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data as any)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updated as T
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Base service class for all Supabase services
 * Provides common CRUD operations for any table with full type safety
 * @template TableName The name of the database table
 */
export abstract class BaseService<TableName extends keyof Database['public']['Tables']> {
  protected abstract readonly tableName: TableName
  protected supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Get all records from the table
   */
  async getAll(): Promise<Database['public']['Tables'][TableName]['Row'][]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    // Type assertion is safe here as Supabase returns the correct Row type
    return (data || []) as unknown as Database['public']['Tables'][TableName]['Row'][]
  }

  /**
   * Get a single record by ID
   */
  async getById(id: string): Promise<Database['public']['Tables'][TableName]['Row'] | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id' as any, id) // Safe: All tables have 'id' column, but TS can't verify with generic table name
      .single()

    if (error) throw error
    // Type assertion is safe here as Supabase returns the correct Row type
    return data as unknown as Database['public']['Tables'][TableName]['Row']
  }

  /**
   * Create a new record
   * @param data Insert data conforming to the table's Insert type
   */
  async create(data: Database['public']['Tables'][TableName]['Insert']): Promise<Database['public']['Tables'][TableName]['Row']> {
    const { data: created, error} = await this.supabase
      .from(this.tableName)
      .insert(data as unknown as never) // Safe: Insert type is correct but TS can't verify runtime table name
      .select()
      .single()

    if (error) throw error
    // Type assertion is safe here as we're selecting the same record we just inserted
    return created as unknown as Database['public']['Tables'][TableName]['Row']
  }

  /**
   * Update an existing record
   * @param id Record ID to update
   * @param data Update data conforming to the table's Update type
   */
  async update(id: string, data: Database['public']['Tables'][TableName]['Update']): Promise<Database['public']['Tables'][TableName]['Row']> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data as unknown as never) // Safe: Update type is correct but TS can't verify runtime table name
      .eq('id' as any, id) // Safe: All tables have 'id' column, but TS can't verify with generic table name
      .select()
      .single()

    if (error) throw error
    // Type assertion is safe here as we're selecting the same record we just updated
    return updated as unknown as Database['public']['Tables'][TableName]['Row']
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id' as any, id) // Safe: All tables have 'id' column, but TS can't verify with generic table name

    if (error) throw error
  }
}

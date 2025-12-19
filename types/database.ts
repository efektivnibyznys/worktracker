export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          hourly_rate: number | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          hourly_rate?: number | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          hourly_rate?: number | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      phases: {
        Row: {
          id: string
          user_id: string
          client_id: string
          name: string
          description: string | null
          hourly_rate: number | null
          status: 'active' | 'completed' | 'paused'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          name: string
          description?: string | null
          hourly_rate?: number | null
          status?: 'active' | 'completed' | 'paused'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          name?: string
          description?: string | null
          hourly_rate?: number | null
          status?: 'active' | 'completed' | 'paused'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phases_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phases_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      entries: {
        Row: {
          id: string
          user_id: string
          client_id: string
          phase_id: string | null
          date: string
          start_time: string
          end_time: string
          duration_minutes: number
          description: string
          hourly_rate: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          phase_id?: string | null
          date: string
          start_time: string
          end_time: string
          duration_minutes: number
          description: string
          hourly_rate: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          phase_id?: string | null
          date?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          description?: string
          hourly_rate?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_phase_id_fkey"
            columns: ["phase_id"]
            referencedRelation: "phases"
            referencedColumns: ["id"]
          }
        ]
      }
      settings: {
        Row: {
          user_id: string
          default_hourly_rate: number
          currency: string
          updated_at: string
        }
        Insert: {
          user_id: string
          default_hourly_rate?: number
          currency?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          default_hourly_rate?: number
          currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

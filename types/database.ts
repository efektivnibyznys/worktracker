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
          address: string | null
          ico: string | null
          hourly_rate: number | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address?: string | null
          ico?: string | null
          hourly_rate?: number | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string | null
          ico?: string | null
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
      projects: {
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
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
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
          project_id: string | null
          date: string
          start_time: string
          end_time: string
          duration_minutes: number
          description: string
          hourly_rate: number
          created_at: string
          billing_status: 'unbilled' | 'billed' | 'paid'
          invoice_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          phase_id?: string | null
          project_id?: string | null
          date: string
          start_time: string
          end_time: string
          duration_minutes: number
          description: string
          hourly_rate: number
          created_at?: string
          billing_status?: 'unbilled' | 'billed' | 'paid'
          invoice_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          phase_id?: string | null
          project_id?: string | null
          date?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          description?: string
          hourly_rate?: number
          created_at?: string
          billing_status?: 'unbilled' | 'billed' | 'paid'
          invoice_id?: string | null
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
          },
          {
            foreignKeyName: "entries_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
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
          company_name: string | null
          company_address: string | null
          company_ico: string | null
          company_dic: string | null
          bank_account: string | null
          default_due_days: number
          default_tax_rate: number
        }
        Insert: {
          user_id: string
          default_hourly_rate?: number
          currency?: string
          updated_at?: string
          company_name?: string | null
          company_address?: string | null
          company_ico?: string | null
          company_dic?: string | null
          bank_account?: string | null
          default_due_days?: number
          default_tax_rate?: number
        }
        Update: {
          user_id?: string
          default_hourly_rate?: number
          currency?: string
          updated_at?: string
          company_name?: string | null
          company_address?: string | null
          company_ico?: string | null
          company_dic?: string | null
          bank_account?: string | null
          default_due_days?: number
          default_tax_rate?: number
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
      invoices: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          client_name: string | null
          client_address: string | null
          client_ico: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          invoice_type: 'linked' | 'standalone'
          status: 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue'
          subtotal: number
          tax_rate: number
          tax_amount: number
          total_amount: number
          currency: string
          variable_symbol: string | null
          bank_account: string | null
          notes: string | null
          internal_notes: string | null
          created_at: string
          updated_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          client_name?: string | null
          client_address?: string | null
          client_ico?: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          invoice_type?: 'linked' | 'standalone'
          status?: 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          variable_symbol?: string | null
          bank_account?: string | null
          notes?: string | null
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          paid_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          client_name?: string | null
          client_address?: string | null
          client_ico?: string | null
          invoice_number?: string
          issue_date?: string
          due_date?: string
          invoice_type?: 'linked' | 'standalone'
          status?: 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          variable_symbol?: string | null
          bank_account?: string | null
          notes?: string | null
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          entry_id: string | null
          phase_id: string | null
          project_id: string | null
          description: string
          quantity: number
          unit: string
          unit_price: number
          total_price: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          entry_id?: string | null
          phase_id?: string | null
          project_id?: string | null
          description: string
          quantity?: number
          unit?: string
          unit_price: number
          total_price: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          entry_id?: string | null
          phase_id?: string | null
          project_id?: string | null
          description?: string
          quantity?: number
          unit?: string
          unit_price?: number
          total_price?: number
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_entry_id_fkey"
            columns: ["entry_id"]
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_phase_id_fkey"
            columns: ["phase_id"]
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
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

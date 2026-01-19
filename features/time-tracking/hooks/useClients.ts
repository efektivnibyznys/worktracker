'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { ClientService } from '../services/clientService'
import { ClientInsert, ClientUpdate } from '../types/client.types'

const CLIENTS_KEY = 'clients'

export function useClients() {
  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const clientService = useMemo(() => new ClientService(supabase), [supabase])
  const queryClient = useQueryClient()

  // Get all clients with stats
  const { data: clients, isLoading, error } = useQuery({
    queryKey: [CLIENTS_KEY],
    queryFn: () => clientService.getAllWithStats(),
  })

  // Create client mutation
  const createClient = useMutation({
    mutationFn: (data: ClientInsert) => clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] })
    },
  })

  // Update client mutation
  const updateClient = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientUpdate }) =>
      clientService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] })
    },
  })

  // Delete client mutation
  const deleteClient = useMutation({
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] })
    },
  })

  return {
    clients: clients || [],
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
  }
}

export function useClient(id: string) {
  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const clientService = useMemo(() => new ClientService(supabase), [supabase])

  const { data: client, isLoading, error } = useQuery({
    queryKey: [CLIENTS_KEY, id],
    queryFn: () => clientService.getWithStats(id),
    enabled: !!id,
  })

  return {
    client,
    isLoading,
    error,
  }
}

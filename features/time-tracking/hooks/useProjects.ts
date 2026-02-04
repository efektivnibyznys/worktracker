'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { ProjectService } from '../services/projectService'
import { ProjectInsert, ProjectUpdate } from '../types/project.types'

export const PROJECTS_KEY = 'projects'

export function useProjects(clientId?: string) {
  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const projectService = useMemo(() => new ProjectService(supabase), [supabase])
  const queryClient = useQueryClient()

  // Get projects for a specific client with stats
  const { data: projects, isLoading, error } = useQuery({
    queryKey: [PROJECTS_KEY, clientId],
    queryFn: () =>
      clientId
        ? projectService.getByClientWithStats(clientId)
        : Promise.resolve([]),
    enabled: !!clientId,
  })

  // Create project mutation
  const createProject = useMutation({
    mutationFn: (data: ProjectInsert) => projectService.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY, variables.client_id] })
    },
  })

  // Update project mutation
  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectUpdate }) =>
      projectService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] })
    },
  })

  // Delete project mutation
  const deleteProject = useMutation({
    mutationFn: (id: string) => projectService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] })
    },
  })

  return {
    projects: projects || [],
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
  }
}

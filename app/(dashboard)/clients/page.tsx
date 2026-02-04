'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useClients } from '@/features/time-tracking/hooks/useClients'
import { usePhases } from '@/features/time-tracking/hooks/usePhases'
import { useProjects } from '@/features/time-tracking/hooks/useProjects'
import { ClientForm, ClientFormData } from '@/features/time-tracking/components/ClientForm'
import { PhaseForm, PhaseFormData } from '@/features/time-tracking/components/PhaseForm'
import { ProjectForm, ProjectFormData } from '@/features/time-tracking/components/ProjectForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { formatTime } from '@/lib/utils/time'
import { Client } from '@/features/time-tracking/types/client.types'
import { Phase } from '@/features/time-tracking/types/phase.types'
import { Project } from '@/features/time-tracking/types/project.types'
import { useAuthStore } from '@/lib/stores/authStore'
import { usePageMetadata } from '@/lib/hooks/usePageMetadata'

export default function ClientsPage() {
  usePageMetadata({
    title: 'Klienti | Work Tracker',
    description: 'Správa klientů a projektů'
  })

  const { user } = useAuthStore()
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Phase management
  const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [deletingPhaseId, setDeletingPhaseId] = useState<string | null>(null)
  const { phases, createPhase, updatePhase, deletePhase } = usePhases(editingClient?.id || '')

  // Project management
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const { projects, createProject, updateProject, deleteProject } = useProjects(editingClient?.id || '')

  const handleCreate = useCallback(async (data: ClientFormData) => {
    try {
      await createClient.mutateAsync({
        ...data,
        user_id: user!.id,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      })
      setIsDialogOpen(false)
      toast.success('Klient byl úspěšně přidán')
    } catch (error) {
      toast.error('Nepodařilo se přidat klienta')
      logger.error('Failed to create client', error, {
        component: 'ClientsPage',
        action: 'handleCreate',
      })
    }
  }, [createClient, user])

  const handleUpdate = useCallback(async (data: ClientFormData) => {
    if (!editingClient) return
    try {
      await updateClient.mutateAsync({
        id: editingClient.id,
        data: {
          ...data,
          hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
        },
      })
      setEditingClient(null)
      setIsDialogOpen(false)
      toast.success('Klient byl úspěšně upraven')
    } catch (error) {
      toast.error('Nepodařilo se upravit klienta')
      logger.error('Failed to update client', error, {
        component: 'ClientsPage',
        action: 'handleUpdate',
        metadata: { clientId: editingClient?.id },
      })
    }
  }, [editingClient, updateClient])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Opravdu chcete smazat tohoto klienta? Budou smazány i všechny jeho fáze a záznamy.')) {
      return
    }
    setDeletingId(id)
    try {
      await deleteClient.mutateAsync(id)
      toast.success('Klient byl úspěšně smazán')
    } catch (error) {
      toast.error('Nepodařilo se smazat klienta')
      logger.error('Failed to delete client', error, {
        component: 'ClientsPage',
        action: 'handleDelete',
        metadata: { clientId: id },
      })
    } finally {
      setDeletingId(null)
    }
  }, [deleteClient])

  // Phase handlers
  const handleCreatePhase = useCallback(async (data: PhaseFormData) => {
    if (!editingClient) return
    try {
      await createPhase.mutateAsync({
        ...data,
        user_id: user!.id,
        client_id: editingClient.id,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      })
      setIsPhaseDialogOpen(false)
      toast.success('Fáze byla úspěšně přidána')
    } catch (error) {
      toast.error('Nepodařilo se přidat fázi')
      logger.error('Failed to create phase', error, {
        component: 'ClientsPage',
        action: 'handleCreatePhase',
      })
    }
  }, [createPhase, user, editingClient])

  const handleUpdatePhase = useCallback(async (data: PhaseFormData) => {
    if (!editingPhase) return
    try {
      await updatePhase.mutateAsync({
        id: editingPhase.id,
        data: {
          ...data,
          hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
        },
      })
      setEditingPhase(null)
      setIsPhaseDialogOpen(false)
      toast.success('Fáze byla úspěšně upravena')
    } catch (error) {
      toast.error('Nepodařilo se upravit fázi')
      logger.error('Failed to update phase', error, {
        component: 'ClientsPage',
        action: 'handleUpdatePhase',
      })
    }
  }, [editingPhase, updatePhase])

  const handleDeletePhase = useCallback(async (id: string) => {
    if (!confirm('Opravdu chcete smazat tuto fázi?')) {
      return
    }
    setDeletingPhaseId(id)
    try {
      await deletePhase.mutateAsync(id)
      toast.success('Fáze byla úspěšně smazána')
    } catch (error) {
      toast.error('Nepodařilo se smazat fázi')
      logger.error('Failed to delete phase', error, {
        component: 'ClientsPage',
        action: 'handleDeletePhase',
      })
    } finally {
      setDeletingPhaseId(null)
    }
  }, [deletePhase])

  // Project handlers
  const handleCreateProject = useCallback(async (data: ProjectFormData) => {
    if (!editingClient) return
    try {
      await createProject.mutateAsync({
        ...data,
        user_id: user!.id,
        client_id: editingClient.id,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      })
      setIsProjectDialogOpen(false)
      toast.success('Projekt byl úspěšně přidán')
    } catch (error) {
      toast.error('Nepodařilo se přidat projekt')
      logger.error('Failed to create project', error, {
        component: 'ClientsPage',
        action: 'handleCreateProject',
      })
    }
  }, [createProject, user, editingClient])

  const handleUpdateProject = useCallback(async (data: ProjectFormData) => {
    if (!editingProject) return
    try {
      await updateProject.mutateAsync({
        id: editingProject.id,
        data: {
          ...data,
          hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
        },
      })
      setEditingProject(null)
      setIsProjectDialogOpen(false)
      toast.success('Projekt byl úspěšně upraven')
    } catch (error) {
      toast.error('Nepodařilo se upravit projekt')
      logger.error('Failed to update project', error, {
        component: 'ClientsPage',
        action: 'handleUpdateProject',
      })
    }
  }, [editingProject, updateProject])

  const handleDeleteProject = useCallback(async (id: string) => {
    if (!confirm('Opravdu chcete smazat tento projekt?')) {
      return
    }
    setDeletingProjectId(id)
    try {
      await deleteProject.mutateAsync(id)
      toast.success('Projekt byl úspěšně smazán')
    } catch (error) {
      toast.error('Nepodařilo se smazat projekt')
      logger.error('Failed to delete project', error, {
        component: 'ClientsPage',
        action: 'handleDeleteProject',
      })
    } finally {
      setDeletingProjectId(null)
    }
  }, [deleteProject])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-700 text-lg">Načítám klienty...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Klienti</h2>
          <p className="text-lg text-gray-700">Správa klientů a projektů</p>
        </div>
        <Button onClick={() => {
          setEditingClient(null)
          setIsDialogOpen(true)
        }}>
          + Přidat klienta
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card className="bg-white p-8 shadow-md">
          <CardContent className="p-0 py-8 text-center">
            <p className="text-gray-700 text-lg mb-4">Zatím nemáte žádné klienty</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              Přidat prvního klienta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="p-0 mb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold mb-1">
                      {client.name}
                    </CardTitle>
                    {client.hourly_rate && (
                      <CardDescription className="text-gray-700">
                        Sazba: {formatCurrency(client.hourly_rate)}/h
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Odpracováno:</span>
                    <span className="font-semibold text-gray-900">
                      {formatTime(client.totalHours * 60)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Celkem:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(client.totalAmount)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary">
                      {client.phasesCount} fází
                    </Badge>
                    <Badge variant="secondary">
                      {client.entriesCount} záznamů
                    </Badge>
                  </div>
                  {client.note && (
                    <p className="text-gray-700 text-xs mt-3 line-clamp-2">
                      {client.note}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingClient(client)
                      setIsDialogOpen(true)
                    }}
                  >
                    Upravit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(client.id)}
                    disabled={deletingId === client.id}
                  >
                    {deletingId === client.id ? 'Mazání...' : 'Smazat'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Upravit klienta' : 'Přidat klienta'}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? 'Upravte údaje klienta a spravujte jeho fáze'
                : 'Vyplňte údaje nového klienta'}
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            client={editingClient || undefined}
            onSubmit={editingClient ? handleUpdate : handleCreate}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingClient(null)
            }}
            isLoading={createClient.isPending || updateClient.isPending}
          />

          {editingClient && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Fáze projektu</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPhase(null)
                    setIsPhaseDialogOpen(true)
                  }}
                >
                  + Přidat fázi
                </Button>
              </div>

              {phases.length === 0 ? (
                <p className="text-gray-700 text-sm text-center py-4">
                  Zatím nejsou žádné fáze
                </p>
              ) : (
                <div className="space-y-3">
                  {phases.map((phase) => (
                    <div
                      key={phase.id}
                      className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{phase.name}</div>
                        {phase.description && (
                          <div className="text-xs text-gray-600 truncate">{phase.description}</div>
                        )}
                        <div className="text-xs text-gray-600 mt-1">
                          {phase.hourly_rate && `${formatCurrency(phase.hourly_rate)}/h • `}
                          {phase.status === 'active' && '✅ Aktivní'}
                          {phase.status === 'completed' && '☑️ Dokončeno'}
                          {phase.status === 'paused' && '⏸️ Pozastaveno'}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPhase(phase)
                            setIsPhaseDialogOpen(true)
                          }}
                        >
                          Upravit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeletePhase(phase.id)}
                          disabled={deletingPhaseId === phase.id}
                        >
                          {deletingPhaseId === phase.id ? '...' : 'Smazat'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Projects Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Projekty</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingProject(null)
                      setIsProjectDialogOpen(true)
                    }}
                  >
                    + Přidat projekt
                  </Button>
                </div>

                {projects.length === 0 ? (
                  <p className="text-gray-700 text-sm text-center py-4">
                    Zatím nejsou žádné projekty
                  </p>
                ) : (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded border border-gray-200"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{project.name}</div>
                          {project.description && (
                            <div className="text-xs text-gray-600 truncate">{project.description}</div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            {project.hourly_rate && `${formatCurrency(project.hourly_rate)}/h • `}
                            {project.status === 'active' && '✅ Aktivní'}
                            {project.status === 'completed' && '☑️ Dokončeno'}
                            {project.status === 'paused' && '⏸️ Pozastaveno'}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingProject(project)
                              setIsProjectDialogOpen(true)
                            }}
                          >
                            Upravit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteProject(project.id)}
                            disabled={deletingProjectId === project.id}
                          >
                            {deletingProjectId === project.id ? '...' : 'Smazat'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Phase Dialog */}
      <Dialog open={isPhaseDialogOpen} onOpenChange={setIsPhaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPhase ? 'Upravit fázi' : 'Přidat fázi'}
            </DialogTitle>
            <DialogDescription>
              {editingPhase
                ? 'Upravte údaje fáze projektu'
                : 'Vyplňte údaje nové fáze projektu'}
            </DialogDescription>
          </DialogHeader>
          <PhaseForm
            phase={editingPhase || undefined}
            onSubmit={editingPhase ? handleUpdatePhase : handleCreatePhase}
            onCancel={() => {
              setIsPhaseDialogOpen(false)
              setEditingPhase(null)
            }}
            isLoading={createPhase.isPending || updatePhase.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Upravit projekt' : 'Přidat projekt'}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? 'Upravte údaje projektu'
                : 'Vyplňte údaje nového projektu'}
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            project={editingProject || undefined}
            onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
            onCancel={() => {
              setIsProjectDialogOpen(false)
              setEditingProject(null)
            }}
            isLoading={createProject.isPending || updateProject.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

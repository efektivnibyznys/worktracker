'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useClient } from '@/features/time-tracking/hooks/useClients'
import { usePhases } from '@/features/time-tracking/hooks/usePhases'
import { PhaseForm, PhaseFormData } from '@/features/time-tracking/components/PhaseForm'
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
import { Phase } from '@/features/time-tracking/types/phase.types'
import { useAuthStore } from '@/lib/stores/authStore'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const clientId = params.id as string

  const { client, isLoading: clientLoading } = useClient(clientId)
  const { phases, createPhase, updatePhase, deletePhase } = usePhases(clientId)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreatePhase = useCallback(async (data: PhaseFormData) => {
    try {
      await createPhase.mutateAsync({
        ...data,
        user_id: user!.id,
        client_id: clientId,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      })
      setIsDialogOpen(false)
      toast.success('Fáze byla úspěšně přidána')
    } catch (error) {
      toast.error('Nepodařilo se přidat fázi')
      logger.error('Failed to create phase', error, {
        component: 'ClientDetailPage',
        action: 'handleCreatePhase',
        metadata: { clientId },
      })
    }
  }, [createPhase, user, clientId])

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
      setIsDialogOpen(false)
      toast.success('Fáze byla úspěšně upravena')
    } catch (error) {
      toast.error('Nepodařilo se upravit fázi')
      logger.error('Failed to update phase', error, {
        component: 'ClientDetailPage',
        action: 'handleUpdatePhase',
        metadata: { phaseId: editingPhase?.id },
      })
    }
  }, [editingPhase, updatePhase])

  const handleDeletePhase = useCallback(async (id: string) => {
    if (!confirm('Opravdu chcete smazat tuto fázi? Záznamy zůstanou zachovány.')) {
      return
    }
    setDeletingId(id)
    try {
      await deletePhase.mutateAsync(id)
      toast.success('Fáze byla úspěšně smazána')
    } catch (error) {
      toast.error('Nepodařilo se smazat fázi')
      logger.error('Failed to delete phase', error, {
        component: 'ClientDetailPage',
        action: 'handleDeletePhase',
        metadata: { phaseId: id },
      })
    } finally {
      setDeletingId(null)
    }
  }, [deletePhase])

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Načítám klienta...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Klient nenalezen</p>
        <Button onClick={() => router.push('/clients')}>
          Zpět na seznam klientů
        </Button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">✅ Aktivní</Badge>
      case 'completed':
        return <Badge className="bg-blue-500">☑️ Dokončeno</Badge>
      case 'paused':
        return <Badge className="bg-yellow-500">⏸️ Pozastaveno</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Zpět na seznam klientů
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
        {client.note && (
          <p className="text-gray-600 mt-2">{client.note}</p>
        )}
      </div>

      {/* Client Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hodinová sazba</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {client.hourly_rate ? formatCurrency(client.hourly_rate) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Odpracováno</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatTime(client.totalHours * 60)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Celková částka</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(client.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fáze projektu</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.phasesCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Phases */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Fáze projektu</h3>
          <Button onClick={() => {
            setEditingPhase(null)
            setIsDialogOpen(true)
          }}>
            + Přidat fázi
          </Button>
        </div>

        {phases.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">Zatím nejsou žádné fáze</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Přidat první fázi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {phases.map((phase) => (
              <Card key={phase.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{phase.name}</CardTitle>
                      {phase.description && (
                        <CardDescription className="mt-1">
                          {phase.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(phase.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {phase.hourly_rate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sazba:</span>
                        <span className="font-medium">
                          {formatCurrency(phase.hourly_rate)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Odpracováno:</span>
                      <span className="font-medium">
                        {formatTime(phase.totalHours * 60)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Celkem:</span>
                      <span className="font-medium">
                        {formatCurrency(phase.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Záznamů:</span>
                      <span className="font-medium">{phase.entriesCount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setEditingPhase(phase)
                        setIsDialogOpen(true)
                      }}
                    >
                      Upravit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeletePhase(phase.id)}
                      disabled={deletingId === phase.id}
                    >
                      {deletingId === phase.id ? 'Mazání...' : 'Smazat'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Phase Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              setIsDialogOpen(false)
              setEditingPhase(null)
            }}
            isLoading={createPhase.isPending || updatePhase.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

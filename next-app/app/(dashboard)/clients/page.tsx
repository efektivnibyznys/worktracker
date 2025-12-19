'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useClients } from '@/features/time-tracking/hooks/useClients'
import { ClientForm } from '@/features/time-tracking/components/ClientForm'
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
import { useAuthStore } from '@/lib/stores/authStore'

export default function ClientsPage() {
  const { user } = useAuthStore()
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async (data: any) => {
    await createClient.mutateAsync({
      ...data,
      user_id: user!.id,
      hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
    })
    setIsDialogOpen(false)
  }

  const handleUpdate = async (data: any) => {
    if (!editingClient) return
    await updateClient.mutateAsync({
      id: editingClient.id,
      data: {
        ...data,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      },
    })
    setEditingClient(null)
    setIsDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tohoto klienta? Budou smazány i všechny jeho fáze a záznamy.')) {
      return
    }
    setDeletingId(id)
    await deleteClient.mutateAsync(id)
    setDeletingId(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Načítám klienty...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Klienti</h2>
          <p className="text-gray-600 mt-1">Správa klientů a projektů</p>
        </div>
        <Button onClick={() => {
          setEditingClient(null)
          setIsDialogOpen(true)
        }}>
          + Přidat klienta
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Zatím nemáte žádné klienty</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              Přidat prvního klienta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      <Link
                        href={`/clients/${client.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {client.name}
                      </Link>
                    </CardTitle>
                    {client.hourly_rate && (
                      <CardDescription className="mt-1">
                        Sazba: {formatCurrency(client.hourly_rate)}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Odpracováno:</span>
                    <span className="font-medium">
                      {formatTime(client.totalHours * 60)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Celkem:</span>
                    <span className="font-medium">
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
                    <p className="text-gray-600 text-xs mt-3 line-clamp-2">
                      {client.note}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Upravit klienta' : 'Přidat klienta'}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? 'Upravte údaje klienta'
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
        </DialogContent>
      </Dialog>
    </div>
  )
}

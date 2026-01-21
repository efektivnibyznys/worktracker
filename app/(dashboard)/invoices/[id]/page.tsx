'use client'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { useInvoice, useInvoices } from '@/features/billing/hooks/useInvoices'
import { InvoiceStatusBadge, InvoicePdf } from '@/features/billing/components'
import { useSettings } from '@/features/time-tracking/hooks/useSettings'
import { formatCurrency } from '@/lib/utils/currency'
import { generateSpaydString } from '@/lib/utils/payment'
import type { InvoiceStatus, INVOICE_STATUS_CONFIG } from '@/features/billing/types/invoice.types'

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Koncept' },
  { value: 'issued', label: 'Vystavena' },
  { value: 'sent', label: 'Odeslána' },
  { value: 'paid', label: 'Zaplacena' },
  { value: 'cancelled', label: 'Stornována' }
]

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const { settings, isLoading: isSettingsLoading } = useSettings(invoice?.user_id)
  const { updateStatus, deleteInvoice } = useInvoices()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const handleStatusChange = useCallback(async (newStatus: InvoiceStatus) => {
    try {
      await updateStatus.mutateAsync({ id: invoiceId, status: newStatus })
    } catch (error) {
      logger.error('Failed to update invoice status', error, {
        component: 'InvoiceDetailPage',
        action: 'handleStatusChange',
        metadata: { invoiceId }
      })
    }
  }, [updateStatus, invoiceId])

  const handleDelete = useCallback(async () => {
    if (!confirm('Opravdu chcete smazat tuto fakturu? Tato akce je nevratná.')) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteInvoice.mutateAsync(invoiceId)
      router.push('/invoices')
    } catch (error) {
      toast.error('Nepodařilo se smazat fakturu')
      logger.error('Failed to delete invoice', error, {
        component: 'InvoiceDetailPage',
        action: 'handleDelete',
        metadata: { invoiceId }
      })
    } finally {
      setIsDeleting(false)
    }
  }, [deleteInvoice, invoiceId, router])

  const handleDownloadPdf = useCallback(async () => {
    if (!invoice) return

    setIsGeneratingPdf(true)
    try {
      // Generate QR Code if possible
      let qrCodeUrl: string | null = null
      const bankAccount = invoice.bank_account || settings?.bank_account || '4482411352/6363'
      const variableSymbol = invoice.variable_symbol || invoice.invoice_number.replace(/-/g, '')

      try {
        const spayd = generateSpaydString({
          accountNumber: bankAccount,
          amount: invoice.total_amount,
          currency: invoice.currency || 'CZK',
          vs: variableSymbol,
          message: `Faktura ${invoice.invoice_number}`
        })

        if (spayd) {
          qrCodeUrl = await QRCode.toDataURL(spayd, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 256
          })
        }
      } catch (qrError) {
        console.warn('Failed to generate QR code:', qrError)
      }

      const blob = await pdf(
        <InvoicePdf
          invoice={invoice}
          settings={settings || null}
          qrCodeUrl={qrCodeUrl}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `faktura-${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Faktura byla stažena')
    } catch (error) {
      console.error(error)
      toast.error('Nepodařilo se vygenerovat PDF')
      logger.error('Failed to generate PDF', error, {
        component: 'InvoiceDetailPage',
        action: 'handleDownloadPdf',
        metadata: { invoiceId }
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [invoice, settings, invoiceId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-700 text-lg">Načítám fakturu...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-700 text-lg mb-4">Faktura nenalezena</p>
        <Button onClick={() => router.push('/invoices')}>
          Zpět na seznam faktur
        </Button>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('cs-CZ')
  }

  const isOverdue = invoice.status !== 'paid' &&
    invoice.status !== 'cancelled' &&
    new Date(invoice.due_date) < new Date()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/invoices" className="text-sm text-gray-700 hover:text-primary hover:underline mb-2 inline-block">
          &larr; Zpět na seznam faktur
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Faktura {invoice.invoice_number}
            </h2>
            {invoice.client && (
              <p className="text-lg text-gray-700">
                Klient: {invoice.client.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <InvoiceStatusBadge status={isOverdue ? 'overdue' : invoice.status as InvoiceStatus} />
          </div>
        </div>
      </div>

      {/* Client Info */}
      {(invoice.client_name || invoice.client_address || invoice.client_ico) && (
        <Card className="bg-white p-6 shadow-md">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold">Údaje o klientovi</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            {invoice.client_name && (
              <div className="flex gap-2">
                <span className="text-gray-600 min-w-24">Jméno:</span>
                <span className="font-semibold">{invoice.client_name}</span>
              </div>
            )}
            {invoice.client_address && (
              <div className="flex gap-2">
                <span className="text-gray-600 min-w-24">Adresa:</span>
                <span className="font-semibold whitespace-pre-line">{invoice.client_address}</span>
              </div>
            )}
            {invoice.client_ico && (
              <div className="flex gap-2">
                <span className="text-gray-600 min-w-24">IČO:</span>
                <span className="font-semibold">{invoice.client_ico}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid gap-8 md:grid-cols-4">
        <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-0 mb-2">
            <CardDescription className="text-sm text-gray-600 font-medium">
              Datum vystavení
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-2xl font-bold">{formatDate(invoice.issue_date)}</p>
          </CardContent>
        </Card>

        <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-0 mb-2">
            <CardDescription className="text-sm text-gray-600 font-medium">
              Datum splatnosti
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <p className={`text-2xl font-bold ${isOverdue ? 'text-red-600' : ''}`}>
              {formatDate(invoice.due_date)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-0 mb-2">
            <CardDescription className="text-sm text-gray-600 font-medium">
              Typ faktury
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-2xl font-bold">
              {invoice.invoice_type === 'linked' ? 'Ze záznamů' : 'Vlastní'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-0 mb-2">
            <CardDescription className="text-sm text-gray-600 font-medium">
              Celková částka
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(invoice.total_amount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="bg-white p-6 shadow-md">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl font-bold">Akce</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Změnit stav:</span>
              <Select
                value={invoice.status}
                onValueChange={(value) => handleStatusChange(value as InvoiceStatus)}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="default"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isSettingsLoading}
            >
              {isGeneratingPdf ? 'Generuji PDF...' : 'Stáhnout PDF'}
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Mazání...' : 'Smazat fakturu'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Items */}
      <Card className="bg-white shadow-md">
        <CardHeader className="p-6 border-b">
          <CardTitle className="text-xl font-bold">Položky faktury</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-600">Popis</th>
                  <th className="text-right p-4 font-semibold text-gray-600">Množství</th>
                  <th className="text-center p-4 font-semibold text-gray-600">Jednotka</th>
                  <th className="text-right p-4 font-semibold text-gray-600">Cena/jedn.</th>
                  <th className="text-right p-4 font-semibold text-gray-600">Celkem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="p-4">{item.description}</td>
                      <td className="p-4 text-right">{item.quantity}</td>
                      <td className="p-4 text-center">{item.unit}</td>
                      <td className="p-4 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="p-4 text-right font-semibold">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">
                      Žádné položky
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="bg-white p-6 shadow-md">
        <CardContent className="p-0">
          <div className="space-y-3 max-w-sm ml-auto">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Mezisoučet:</span>
              <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">DPH ({invoice.tax_rate}%):</span>
                <span className="font-semibold">{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-3 border-t">
              <span>Celkem:</span>
              <span className="text-primary">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      {(invoice.variable_symbol || invoice.bank_account) && (
        <Card className="bg-white p-6 shadow-md">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold">Platební údaje</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            {invoice.variable_symbol && (
              <div className="flex gap-2">
                <span className="text-gray-600">Variabilní symbol:</span>
                <span className="font-semibold">{invoice.variable_symbol}</span>
              </div>
            )}
            {invoice.bank_account && (
              <div className="flex gap-2">
                <span className="text-gray-600">Bankovní účet:</span>
                <span className="font-semibold">{invoice.bank_account}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card className="bg-white p-6 shadow-md">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold">Poznámky</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

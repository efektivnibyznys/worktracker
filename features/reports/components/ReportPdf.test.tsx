import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { Font, renderToBuffer } from '@react-pdf/renderer'
import { ReportPdf } from './ReportPdf'
import { REPORT_COLUMNS } from '../lib/reportExport'
import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'

Font.register({
  family: 'ReportTestRoboto',
  fonts: [
    {
      src: join(process.cwd(), 'node_modules/@fontsource/roboto/files/roboto-latin-ext-400-normal.woff'),
      fontWeight: 400,
    },
    {
      src: join(process.cwd(), 'node_modules/@fontsource/roboto/files/roboto-latin-ext-700-normal.woff'),
      fontWeight: 700,
    },
  ],
})

function createEntry(index: number): EntryWithRelations {
  return {
    id: `entry-${index}`,
    user_id: 'user-1',
    client_id: 'client-1',
    phase_id: 'phase-1',
    project_id: 'project-1',
    date: '2026-08-15',
    start_time: '08:00:00',
    end_time: '09:00:00',
    duration_minutes: 60,
    description: `Detailní popis práce ${index} `.repeat(12),
    hourly_rate: 1000,
    created_at: '2026-08-15T09:00:00.000Z',
    billing_status: 'unbilled',
    invoice_id: null,
    client: {
      id: 'client-1',
      name: 'Žluťoučký mezinárodní klient s velmi dlouhým obchodním názvem',
    },
    phase: {
      id: 'phase-1',
      name: 'Realizace komplexního uživatelského rozhraní a integrací',
    },
    project: {
      id: 'project-1',
      name: 'Komplexní webová aplikace pro mezinárodní zákaznický portál',
    },
  }
}

test('každá fyzická PDF stránka odpovídá explicitní stránce se záhlavím tabulky', async () => {
  const entries = Array.from({ length: 24 }, (_, index) => createEntry(index + 1))
  const buffer = await renderToBuffer(
    <ReportPdf
      entries={entries}
      columns={[...REPORT_COLUMNS]}
      stats={{ count: 24, totalMinutes: 1440, amount: 24000 }}
      clientLabel="Žluťoučký mezinárodní klient s velmi dlouhým obchodním názvem"
      dateFrom="2026-08-01"
      dateTo="2026-08-31"
      fontFamily="ReportTestRoboto"
    />,
  )

  const physicalPageCount = buffer.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0
  assert.equal(physicalPageCount, 4)
})

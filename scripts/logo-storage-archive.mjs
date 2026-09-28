import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const BUCKET = 'logos'
const PAGE_SIZE = 100

function storageBucket(client) {
  return (client.storage ?? client).from(BUCKET)
}

function validObjectPath(path) {
  return typeof path === 'string' && path.length > 0 &&
    path.split('/').every(part => part && part !== '.' && part !== '..' && !part.includes('\\'))
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function backupLogos(client, directory, sourceUrl, pageSize = PAGE_SIZE) {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Invalid page size')
  await mkdir(join(directory, 'blobs'), { recursive: true })
  const bucket = storageBucket(client)
  const objects = []
  const seen = new Set()

  async function walk(prefix) {
    for (let offset = 0; ; ) {
      const { data, error } = await bucket.list(prefix, {
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw error
      if (!Array.isArray(data)) throw new Error('Storage list returned no entries')
      for (const entry of data) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name
        if (!validObjectPath(path)) throw new Error('Invalid Storage object path')
        if (entry.id === null) {
          await walk(path)
          continue
        }
        if (seen.has(path)) throw new Error(`Duplicate Storage object: ${path}`)
        seen.add(path)
        const downloaded = await bucket.download(path)
        if (downloaded.error) throw downloaded.error
        if (!downloaded.data) throw new Error(`Missing Storage bytes: ${path}`)
        const bytes = Buffer.from(await downloaded.data.arrayBuffer())
        if (entry.metadata?.size != null && Number(entry.metadata.size) !== bytes.length) {
          throw new Error(`Incomplete Storage download: ${path}`)
        }
        const checksum = hash(bytes)
        const file = `blobs/${checksum}.bin`
        await writeFile(join(directory, file), bytes)
        objects.push({
          path,
          file,
          sha256: checksum,
          size: bytes.length,
          contentType: entry.metadata?.mimetype || downloaded.data.type || 'application/octet-stream',
        })
      }
      offset += data.length
      if (data.length < pageSize) break
    }
  }

  await walk('')
  objects.sort((a, b) => a.path.localeCompare(b.path))
  const manifest = {
    schemaVersion: 1,
    sourceUrl: new URL(sourceUrl).origin,
    bucket: BUCKET,
    objects,
  }
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}

export async function restoreLogos(client, directory) {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
  if (manifest.schemaVersion !== 1 || manifest.bucket !== BUCKET || !Array.isArray(manifest.objects)) {
    throw new Error('Invalid logo archive manifest')
  }
  const verified = []
  const seen = new Set()
  for (const object of manifest.objects) {
    if (!validObjectPath(object.path) || seen.has(object.path) ||
        !/^[a-f0-9]{64}$/.test(object.sha256) ||
        object.file !== `blobs/${object.sha256}.bin` ||
        !Number.isSafeInteger(object.size) || object.size < 0 ||
        typeof object.contentType !== 'string' || !object.contentType) {
      throw new Error('Invalid logo archive entry')
    }
    seen.add(object.path)
    const bytes = await readFile(join(directory, object.file))
    if (bytes.length !== object.size || hash(bytes) !== object.sha256) {
      throw new Error(`Logo checksum mismatch: ${object.path}`)
    }
    verified.push({ ...object, bytes })
  }

  const storage = client.storage ?? client
  const { data: original, error: bucketError } = await storage.getBucket(BUCKET)
  if (bucketError) throw bucketError
  if (!original || typeof original.public !== 'boolean') throw new Error('Cannot read logo bucket settings')
  const originalMimeTypes = original.allowed_mime_types ?? null
  const originalLimit = original.file_size_limit ?? null
  const requiredTypes = [...new Set(verified.map(object => object.contentType))]
  const expandedMimeTypes = originalMimeTypes === null
    ? null
    : [...new Set([...originalMimeTypes, ...requiredTypes])]
  const largestFile = verified.reduce((largest, object) => Math.max(largest, object.size), 0)
  const expandedLimit = originalLimit === null
    ? null
    : Math.max(Number(originalLimit), largestFile)
  const needsTemporarySettings =
    (originalMimeTypes !== null && expandedMimeTypes.length !== originalMimeTypes.length) ||
    (originalLimit !== null && expandedLimit !== Number(originalLimit))
  if (needsTemporarySettings) {
    const { error } = await storage.updateBucket(BUCKET, {
      public: original.public,
      allowedMimeTypes: expandedMimeTypes,
      fileSizeLimit: expandedLimit,
    })
    if (error) throw error
  }
  let uploadError
  try {
    const bucket = storageBucket(client)
    for (const object of verified) {
      const { error } = await bucket.upload(object.path, object.bytes, {
        upsert: true,
        contentType: object.contentType,
      })
      if (error) throw error
    }
  } catch (error) {
    uploadError = error
  } finally {
    if (needsTemporarySettings) {
      const { error } = await storage.updateBucket(BUCKET, {
        public: original.public,
        allowedMimeTypes: originalMimeTypes,
        fileSizeLimit: originalLimit,
      })
      if (error) {
        throw uploadError
          ? new AggregateError([uploadError, error], 'Logo restore and bucket restriction reset both failed')
          : error
      }
    }
  }
  if (uploadError) throw uploadError
  return manifest
}

export function rewriteLogoUrl(value, sourceUrl, targetUrl) {
  const sourcePrefix = `${new URL(sourceUrl).origin}/storage/v1/object/public/logos/`
  const targetPrefix = `${new URL(targetUrl).origin}/storage/v1/object/public/logos/`
  if (value.startsWith(targetPrefix)) return value
  if (!value.startsWith(sourcePrefix)) throw new Error('Logo URL is outside the archived project')
  return targetPrefix + value.slice(sourcePrefix.length)
}

async function rewriteStoredUrls(client, sourceUrl, targetUrl) {
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client.from('settings')
      .select('user_id, logo_url')
      .not('logo_url', 'is', null)
      .order('user_id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    if (!data) throw new Error('Could not read logo settings')
    for (const row of data) {
      const updated = rewriteLogoUrl(row.logo_url, sourceUrl, targetUrl)
      if (updated !== row.logo_url) {
        const saved = await client.from('settings')
          .update({ logo_url: updated })
          .eq('user_id', row.user_id)
        if (saved.error) throw saved.error
      }
    }
    if (data.length < PAGE_SIZE) break
  }
}

async function main() {
  const [mode, directory] = process.argv.slice(2)
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key || !directory || !['backup', 'restore'].includes(mode)) {
    throw new Error('Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/logo-storage-archive.mjs backup|restore DIRECTORY')
  }
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  if (mode === 'backup') {
    const manifest = await backupLogos(client, directory, url)
    process.stdout.write(`Archived ${manifest.objects.length} logo objects\n`)
  } else {
    const manifest = await restoreLogos(client, directory)
    await rewriteStoredUrls(client, manifest.sourceUrl, url)
    process.stdout.write(`Restored ${manifest.objects.length} logo objects\n`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}

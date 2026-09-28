import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backupLogos, restoreLogos, rewriteLogoUrl, verifyLogoArchive } from './logo-storage-archive.mjs'

function fakeStorage(objects, contentTypes = {}, initialBucket = {}) {
  const uploaded = new Map()
  const bucketSettings = {
    public: true,
    file_size_limit: initialBucket.file_size_limit ?? null,
    allowed_mime_types: initialBucket.allowed_mime_types ?? null,
  }
  return {
    uploaded,
    bucketSettings,
    async getBucket() {
      return { data: { ...bucketSettings }, error: null }
    },
    async updateBucket(_name, options) {
      bucketSettings.public = options.public
      bucketSettings.file_size_limit = options.fileSizeLimit
      bucketSettings.allowed_mime_types = options.allowedMimeTypes
      return { data: {}, error: null }
    },
    from(bucket) {
      assert.equal(bucket, 'logos')
      return {
        async list(prefix, { limit, offset }) {
          const entries = prefix === ''
            ? [{ name: 'account-a', id: null }, { name: 'account-b', id: null }]
            : Object.keys(objects).filter(path => path.startsWith(`${prefix}/`))
                .map(path => ({ name: path.slice(prefix.length + 1), id: path }))
          return { data: entries.slice(offset, offset + limit), error: null }
        },
        async download(path) {
          return { data: new Blob([objects[path]], { type: contentTypes[path] ?? 'image/png' }), error: null }
        },
        async upload(path, bytes, options) {
          if (path === initialBucket.failOnPath) return { data: null, error: new Error('Upload failed') }
          if (bucketSettings.allowed_mime_types && !bucketSettings.allowed_mime_types.includes(options.contentType)) {
            return { data: null, error: new Error('MIME type not allowed') }
          }
          if (bucketSettings.file_size_limit != null && bytes.length > bucketSettings.file_size_limit) {
            return { data: null, error: new Error('File too large') }
          }
          uploaded.set(path, { bytes: Buffer.from(bytes), options })
          return { data: { path }, error: null }
        },
      }
    },
  }
}

test('backup walks folders and pages, then restores verified bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'worktracker-logos-'))
  try {
    const original = {
      'account-a/logo.png': Buffer.from('first-logo'),
      'account-a/logo.webp': Buffer.from('second-logo'),
      'account-b/logo': Buffer.from('third-logo'),
    }
    const source = fakeStorage(original)
    const manifest = await backupLogos(source, directory, 'https://source.supabase.co', 1)
    assert.equal(manifest.objects.length, 3)
    assert.equal((await verifyLogoArchive(directory)).manifest.objects.length, 3)
    const destination = fakeStorage({})
    await restoreLogos(destination, directory)
    for (const [path, bytes] of Object.entries(original)) {
      assert.deepEqual(destination.uploaded.get(path).bytes, bytes)
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('restore recovers a historical GIF and returns bucket upload restrictions to their original state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'worktracker-logos-'))
  try {
    const path = 'account-a/old-logo.gif'
    const source = fakeStorage({ [path]: Buffer.from('legacy image') }, { [path]: 'image/gif' })
    await backupLogos(source, directory, 'https://source.supabase.co')
    const destination = fakeStorage({}, {}, {
      file_size_limit: 4,
      allowed_mime_types: ['image/png'],
    })
    await restoreLogos(destination, directory)
    assert.deepEqual(destination.uploaded.get(path).bytes, Buffer.from('legacy image'))
    assert.deepEqual(destination.bucketSettings, {
      public: true,
      file_size_limit: 4,
      allowed_mime_types: ['image/png'],
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('restore resets bucket restrictions when an upload fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'worktracker-logos-'))
  try {
    const path = 'account-a/old-logo.gif'
    await backupLogos(
      fakeStorage({ [path]: Buffer.from('legacy image') }, { [path]: 'image/gif' }),
      directory,
      'https://source.supabase.co',
    )
    const destination = fakeStorage({}, {}, {
      file_size_limit: 4,
      allowed_mime_types: ['image/png'],
      failOnPath: path,
    })
    await assert.rejects(restoreLogos(destination, directory), /Upload failed/)
    assert.deepEqual(destination.bucketSettings, {
      public: true,
      file_size_limit: 4,
      allowed_mime_types: ['image/png'],
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('restore refuses corrupted logo bytes before upload', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'worktracker-logos-'))
  try {
    const source = fakeStorage({ 'account-a/logo': Buffer.from('original') })
    const manifest = await backupLogos(source, directory, 'https://source.supabase.co', 1)
    await writeFile(join(directory, manifest.objects[0].file), 'tampered')
    const destination = fakeStorage({})
    await assert.rejects(restoreLogos(destination, directory), /checksum/)
    assert.equal(destination.uploaded.size, 0)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('project restore changes only the public logo URL prefix', () => {
  const old = 'https://source.supabase.co/storage/v1/object/public/logos/account-a/logo.png?t=123'
  assert.equal(
    rewriteLogoUrl(old, 'https://source.supabase.co', 'https://target.supabase.co'),
    'https://target.supabase.co/storage/v1/object/public/logos/account-a/logo.png?t=123',
  )
  assert.throws(
    () => rewriteLogoUrl('https://elsewhere.test/logo.png', 'https://source.supabase.co', 'https://target.supabase.co'),
    /outside/,
  )
})

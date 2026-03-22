'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface LogoUploadProps {
  userId: string
  currentLogoUrl: string | null
  onLogoChange: (url: string | null) => void
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']

export function LogoUpload({ userId, currentLogoUrl, onLogoChange }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Nepodporovaný formát. Použijte PNG, JPG, SVG nebo WebP.')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Soubor je příliš velký. Maximální velikost je 2 MB.')
      return
    }

    setIsUploading(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}/logo.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      // Add cache-busting param
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`
      setPreview(urlWithCacheBust)
      onLogoChange(publicUrl)
      toast.success('Logo bylo nahráno')
    } catch (error) {
      toast.error('Nepodařilo se nahrát logo')
      logger.error('Failed to upload logo', error, {
        component: 'LogoUpload',
        action: 'handleFileSelect',
        metadata: { userId },
      })
    } finally {
      setIsUploading(false)
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [userId, onLogoChange])

  const handleRemove = useCallback(async () => {
    setIsUploading(true)
    try {
      const supabase = createClient()

      // List files in user's folder and delete them
      const { data: files } = await supabase.storage
        .from('logos')
        .list(userId)

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${userId}/${f.name}`)
        await supabase.storage.from('logos').remove(filePaths)
      }

      setPreview(null)
      onLogoChange(null)
      toast.success('Logo bylo odstraněno')
    } catch (error) {
      toast.error('Nepodařilo se odstranit logo')
      logger.error('Failed to remove logo', error, {
        component: 'LogoUpload',
        action: 'handleRemove',
        metadata: { userId },
      })
    } finally {
      setIsUploading(false)
    }
  }, [userId, onLogoChange])

  return (
    <div className="space-y-3">
      <Label>Logo firmy</Label>
      <p className="text-sm text-gray-600">
        Logo se zobrazí na fakturách. Doporučený formát: PNG nebo SVG, max 2 MB.
      </p>

      {preview && (
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-gray-50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Logo firmy"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Nahrávám...' : preview ? 'Změnit logo' : 'Nahrát logo'}
        </Button>

        {preview && (
          <Button
            type="button"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleRemove}
            disabled={isUploading}
          >
            Odstranit
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

'use client'

import { useState, useRef, useCallback } from 'react'
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const BUCKET = 'product-images'
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface ImageUploaderProps {
  initialUrl?: string | null
  onChange: (url: string | null) => void
}

export function ImageUploader({ initialUrl, onChange }: ImageUploaderProps) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(async (file: File) => {
    if (!VALID_TYPES.includes(file.type)) {
      toast.error('Formato no válido. Usá JPG, PNG, WEBP o GIF.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('La imagen no puede superar 2MB.')
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/products/${Date.now()}.${ext}`

      // Simulated progress since Supabase JS v2 doesn't expose upload progress
      const interval = setInterval(() => setProgress((p) => Math.min(p + 12, 85)), 120)

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false })

      clearInterval(interval)

      if (error) throw error

      setProgress(100)

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path)

      setUrl(publicUrl)
      onChange(publicUrl)
      toast.success('Imagen subida')
    } catch (err) {
      console.error(err)
      toast.error('Error al subir la imagen. Intentá de nuevo.')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [onChange])

  const handleRemove = () => {
    setUrl(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void upload(file)
  }, [upload])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void upload(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      {url ? (
        <div
          className="relative group rounded-xl overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-bg)]"
          style={{ height: 180 }}
        >
          <img
            src={url}
            alt="Imagen del producto"
            className="w-full h-full object-cover"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/70 hover:bg-red-500/90 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={uploading}
          className={cn(
            'w-full rounded-xl border-2 border-dashed transition-all cursor-pointer',
            'flex flex-col items-center justify-center gap-2.5 py-10',
            dragging
              ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/5'
              : 'border-[var(--admin-border)] bg-[var(--admin-bg)] hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-accent)]/5',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          {uploading
            ? <Loader2 className="h-7 w-7 text-[var(--admin-accent)] animate-spin" />
            : <ImageIcon className="h-7 w-7 text-[var(--admin-text-muted)]/40" />
          }
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--admin-text-muted)]">
              {uploading ? 'Subiendo...' : 'Arrastrá o hacé click para subir'}
            </p>
            <p className="text-xs text-[var(--admin-text-muted)]/60 mt-0.5">
              JPG, PNG, WEBP — máx 2MB
            </p>
          </div>
        </button>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="h-1 rounded-full bg-[var(--admin-border)] overflow-hidden">
          <div
            className="h-full bg-[var(--admin-accent)] rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

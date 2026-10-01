import { zip, type AsyncZippable } from 'fflate'

export interface ZipItem {
  id: string
  path: string
  media_type: string
  size?: number
  thumbnail?: string
  created_at?: string | null
}

export const ZIP_PART_THRESHOLD_BYTES = 400 * 1024 * 1024
const FETCH_CONCURRENCY = 4

export function humanSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB'
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function partSize(items: ZipItem[]): number {
  return items.reduce((sum, item) => sum + (item.size ?? 0), 0)
}

export function splitIntoParts(items: ZipItem[], threshold = ZIP_PART_THRESHOLD_BYTES): ZipItem[][] {
  const parts: ZipItem[][] = []
  let current: ZipItem[] = []
  let currentSize = 0

  for (const item of items) {
    const size = item.size ?? 0
    if (current.length > 0 && currentSize + size > threshold) {
      parts.push(current)
      current = []
      currentSize = 0
    }
    current.push(item)
    currentSize += size
  }

  if (current.length > 0) parts.push(current)
  return parts
}

function fileNameFor(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || 'file'
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

/** Fill in missing item sizes using HEAD requests (older manifests may lack the size field). */
export async function ensureSizes(items: ZipItem[]): Promise<void> {
  const missing = items.filter((item) => !item.size)
  if (missing.length === 0) return

  const queue = [...missing]
  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break
      try {
        const response = await fetch('./' + item.path, { method: 'HEAD' })
        const length = response.headers.get('content-length')
        if (length) item.size = Number.parseInt(length, 10) || 0
      } catch {
        /* keep size unknown */
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, missing.length) }, worker))
}

export interface BuildZipResult {
  data: Uint8Array
  failed: number
}

/** Build a store-only (no extra compression, media is already compressed) zip of the given items. */
export async function buildZip(items: ZipItem[], onProgress?: (done: number, total: number) => void): Promise<BuildZipResult> {
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {}
  const queue = [...items]
  const total = items.length
  let done = 0
  let failed = 0

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break
      try {
        const bytes = await fetchBytes('./' + item.path)
        entries[fileNameFor(item.path)] = [bytes, { level: 0 }]
      } catch {
        failed += 1
      } finally {
        done += 1
        onProgress?.(done, total)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, items.length) }, worker))

  const data = await new Promise<Uint8Array>((resolve, reject) => {
    zip(entries as unknown as AsyncZippable, { level: 0 }, (err, out) => {
      if (err) reject(err)
      else resolve(out)
    })
  })

  return { data, failed }
}

/**
 * Extracts the original camera filename from a video file's binary metadata.
 *
 * Mobile browsers (Android Chrome, iOS Safari) often return content-URI-derived
 * names like "10000428827.mp4" instead of the real filename like "IMG_5528.MOV".
 * Phone cameras embed the original filename in the MOV/MP4 container metadata,
 * so we read the first/last 256KB and search for known patterns.
 */

// Full filename patterns (with extension)
const FULL_PATTERNS = [
  /IMG_\d{4,}\.(MOV|mov|MP4|mp4|m4v)/,       // iPhone
  /PXL_\d{8}_\d{6,}\.(mp4|MP4)/,              // Google Pixel
  /VID_\d{8}_\d{6,}\.(mp4|MP4|3gp)/,          // Samsung / generic Android
  /video_\d{8}_\d{6,}\.(mp4|MP4)/,            // Some Android cameras
]

// Base patterns (without extension) - we add the extension from file.type
const BASE_PATTERNS = [
  /IMG_\d{4,}/,
  /PXL_\d{8}_\d{6,}/,
  /VID_\d{8}_\d{6,}/,
]

// Quick check if a filename already looks like a real camera filename
const LOOKS_REAL = /^(IMG_\d{4,}|PXL_\d{8}_\d+|VID_\d{8}_\d+)\./i

function extForType(mimeType: string): string {
  if (mimeType === 'video/quicktime') return '.MOV'
  return '.mp4'
}

async function searchChunk(blob: Blob, fileMime: string): Promise<string | null> {
  const buffer = await blob.arrayBuffer()
  // latin1 maps each byte 1:1 to a char, safe for binary pattern search
  const text = new TextDecoder('latin1').decode(new Uint8Array(buffer))

  for (const p of FULL_PATTERNS) {
    const m = text.match(p)
    if (m) return m[0]
  }
  for (const p of BASE_PATTERNS) {
    const m = text.match(p)
    if (m) return m[0] + extForType(fileMime)
  }
  return null
}

export async function extractOriginalFilename(file: File): Promise<string> {
  // If the browser already gave us a real camera filename, keep it
  if (LOOKS_REAL.test(file.name)) return file.name

  try {
    // Search first 256KB (MOV files usually have moov atom at start)
    const startSize = Math.min(file.size, 256 * 1024)
    const result = await searchChunk(file.slice(0, startSize), file.type)
    if (result) return result

    // Search last 256KB (some MP4 files have moov atom at end)
    if (file.size > startSize) {
      const endStart = Math.max(0, file.size - 256 * 1024)
      const endResult = await searchChunk(file.slice(endStart), file.type)
      if (endResult) return endResult
    }
  } catch {
    // Fall through to default
  }

  return file.name
}

/**
 * Process an array of files, extracting original filenames and returning
 * new File objects with corrected names. Files whose names are already
 * correct are returned as-is.
 */
export async function correctFileNames(files: File[]): Promise<File[]> {
  const seen = new Set<string>()

  return Promise.all(
    files.map(async (file) => {
      let name = await extractOriginalFilename(file)

      // Deduplicate: if two files resolve to the same name, append a suffix
      if (seen.has(name)) {
        const dot = name.lastIndexOf('.')
        const base = dot > 0 ? name.slice(0, dot) : name
        const ext = dot > 0 ? name.slice(dot) : ''
        let i = 2
        while (seen.has(`${base}_${i}${ext}`)) i++
        name = `${base}_${i}${ext}`
      }
      seen.add(name)

      if (name !== file.name) {
        return new File([file], name, {
          type: file.type,
          lastModified: file.lastModified,
        })
      }
      return file
    })
  )
}

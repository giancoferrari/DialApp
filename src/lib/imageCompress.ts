// Downscale + re-encode an image in the browser before upload so we don't
// burn storage on full-resolution phone photos (often 3–8 MB → ~150–400 KB).
export async function compressImage(file: File, maxDim = 1440, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file // unsupported — upload original
  }

  let { width, height } = bitmap
  const longest = Math.max(width, height)
  if (longest > maxDim) {
    const scale = maxDim / longest
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close?.(); return file }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )
  if (!blob || blob.size >= file.size) return file // no gain — keep original

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}

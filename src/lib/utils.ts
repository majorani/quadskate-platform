export async function validateFileMagicBytes(
  file: File,
  type: 'image' | 'pdf'
): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (type === 'pdf') {
    // PDF magic bytes: %PDF = 25 50 44 46
    return bytes[0] === 0x25 && bytes[1] === 0x50 &&
           bytes[2] === 0x44 && bytes[3] === 0x46
  }

  if (type === 'image') {
    // JPEG: FF D8 FF
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
    // PNG: 89 50 4E 47
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 &&
                  bytes[2] === 0x4E && bytes[3] === 0x47
    // WebP: 52 49 46 46 ... 57 45 42 50
    const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 &&
                   bytes[2] === 0x46 && bytes[3] === 0x46 &&
                   bytes[6] === 0x57 && bytes[7] === 0x45
    // SVG: empieza con < (3C) o con BOM
    const isSvg = bytes[0] === 0x3C || 
                  (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF)
    return isJpeg || isPng || isWebp || isSvg
  }

  return false
}
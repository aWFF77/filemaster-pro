// File System Access API wrapper

export interface FileEntry {
  id: string
  path: string
  name: string
  ext: string
  size: number
  mtime: Date
  isDir: boolean
  handle?: FileSystemHandle
}

export interface ScanResult {
  files: FileEntry[]
  totalSize: number
  dirCount: number
}

/**
 * Scan a directory recursively and collect all file entries
 */
export async function scanDirectory(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string = ''
): Promise<ScanResult> {
  const files: FileEntry[] = []
  let totalSize = 0
  let dirCount = 0

  async function walk(handle: FileSystemDirectoryHandle, currentPath: string) {
    for await (const entry of handle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name

      if (entry.kind === 'directory') {
        dirCount++
        const subHandle = await handle.getDirectoryHandle(entry.name)
        await walk(subHandle, entryPath)
      } else {
        const fileHandle = await handle.getFileHandle(entry.name)
        const file = await fileHandle.getFile()
        const ext = entry.name.includes('.') ? '.' + entry.name.split('.').pop()?.toLowerCase() : ''

        files.push({
          id: entryPath,
          path: entryPath,
          name: entry.name,
          ext,
          size: file.size,
          mtime: new Date(file.lastModified),
          isDir: false,
          handle: entry,
        })
        totalSize += file.size
      }
    }
  }

  await walk(dirHandle, basePath)
  return { files, totalSize, dirCount }
}

/**
 * Pick a directory using native dialog
 */
export async function pickDirectory(): Promise<{
  handle: FileSystemDirectoryHandle
  result: ScanResult
} | null> {
  try {
    const handle = await window.showDirectoryPicker()
    const result = await scanDirectory(handle)
    return { handle, result }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null
    throw err
  }
}

/**
 * Pick files using native dialog
 */
export async function pickFiles(options?: {
  multiple?: boolean
  accept?: string
}): Promise<FileEntry[]> {
  try {
    const types = options?.accept
      ? [
          {
            description: 'Files',
            accept: { 'application/octet-stream': options.accept.split(',') },
          },
        ]
      : undefined

    const fileHandles = await window.showOpenFilePicker({
      multiple: options?.multiple ?? true,
      types,
    })

    const entries: FileEntry[] = []
    for (const handle of fileHandles) {
      const file = await handle.getFile()
      const ext = handle.name.includes('.')
        ? '.' + handle.name.split('.').pop()?.toLowerCase()
        : ''

      entries.push({
        id: handle.name,
        path: handle.name,
        name: handle.name,
        ext,
        size: file.size,
        mtime: new Date(file.lastModified),
        isDir: false,
        handle,
      })
    }
    return entries
  } catch (err) {
    if ((err as Error).name === 'AbortError') return []
    throw err
  }
}

/**
 * Read file content as text
 */
export async function readFileText(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile()
  return await file.text()
}

/**
 * Read file content as ArrayBuffer
 */
export async function readFileBuffer(handle: FileSystemFileHandle): Promise<ArrayBuffer> {
  const file = await handle.getFile()
  return await file.arrayBuffer()
}

/**
 * Write content to a file
 */
export async function writeFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string | Blob | ArrayBuffer
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Move/rename a file within the same directory tree
 */
export async function moveFile(
  srcHandle: FileSystemFileHandle,
  destDir: FileSystemDirectoryHandle,
  destName: string
): Promise<void> {
  const file = await srcHandle.getFile()
  await writeFile(destDir, destName, await file.arrayBuffer())
}

/**
 * Create a directory (and parents if needed)
 */
export async function ensureDir(
  rootHandle: FileSystemDirectoryHandle,
  dirPath: string
): Promise<FileSystemDirectoryHandle> {
  const parts = dirPath.split('/').filter(Boolean)
  let current = rootHandle
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true })
  }
  return current
}

/**
 * Format file size in human-readable format
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

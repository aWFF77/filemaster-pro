// File System Access API types
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
    showOpenFilePicker(options?: {
      multiple?: boolean
      types?: { description: string; accept: Record<string, string[]> }[]
    }): Promise<FileSystemFileHandle[]>
  }

  interface FileSystemDirectoryHandle {
    kind: 'directory'
    name: string
    values(): AsyncIterableIterator<FileSystemHandle>
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>
  }

  interface FileSystemFileHandle {
    kind: 'file'
    name: string
    getFile(): Promise<File>
    createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: FileSystemWriteChunkType): Promise<void>
    seek(position: number): Promise<void>
    truncate(size: number): Promise<void>
  }

  interface FileSystemHandle {
    kind: 'file' | 'directory'
    name: string
  }

  type FileSystemWriteChunkType = BufferSource | Blob | string
}

export {}

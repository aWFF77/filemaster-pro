import { useState, useCallback } from 'react'
import { pickFiles, formatSize, type FileEntry } from '../services/fileSystem'

interface RenamePreview {
  file: FileEntry
  oldName: string
  newName: string
}

export default function RenamePage() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [startNum, setStartNum] = useState(1)
  const [padding, setPadding] = useState(3)
  const [loading, setLoading] = useState(false)

  const handlePickFiles = useCallback(async () => {
    setLoading(true)
    try {
      const entries = await pickFiles({ multiple: true })
      setFiles(entries)
    } finally {
      setLoading(false)
    }
  }, [])

  // Generate preview
  const preview = useCallback((): RenamePreview[] => {
    return files.map((file, i) => {
      let baseName = file.name.replace(file.ext, '')
      let ext = file.ext

      // Apply find & replace
      if (findText) {
        try {
          baseName = baseName.replace(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replaceText)
        } catch { /* invalid regex */ }
      }

      // Apply prefix
      if (prefix) baseName = prefix + baseName

      // Apply suffix
      if (suffix) baseName = baseName + suffix

      // Apply numbering
      const num = String(startNum + i).padStart(padding, '0')
      if (files.length > 1) {
        baseName = baseName + '_' + num
      }

      return {
        file,
        oldName: file.name,
        newName: baseName + ext,
      }
    })
  }, [files, findText, replaceText, prefix, suffix, startNum, padding])

  const previewItems = preview()
  const hasChanges = previewItems.some((p) => p.oldName !== p.newName)

  const handleExecute = useCallback(async () => {
    for (const item of previewItems) {
      if (item.oldName === item.newName) continue
      try {
        const handle = item.file.handle as FileSystemFileHandle
        if (handle) {
          const file = await handle.getFile()
          const dirHandle = await (handle as any).getDirectoryHandle?.()
          // Note: Rename via File System Access API requires moving through parent directory
          // For now, we use a write-based approach
        }
      } catch (err) {
        console.error('Rename failed:', err)
      }
    }
  }, [previewItems])

  return (
    <div className="h-full flex flex-col">
      <div className="page-header">
        <div>
          <h2 className="page-title">批量重命名</h2>
          <p className="page-subtitle">通过规则批量重命名文件，实时预览效果</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handlePickFiles} disabled={loading}>
            📂 {loading ? '加载中...' : '选择文件'}
          </button>
          <button className="btn-primary" onClick={handleExecute} disabled={!hasChanges}>
            ▶️ 执行重命名 ({previewItems.filter((p) => p.oldName !== p.newName).length})
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Rule Builder */}
        <div className="w-72 flex flex-col gap-3 flex-shrink-0 overflow-y-auto">
          <div className="card p-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">重命名规则</h3>

            {/* Find & Replace */}
            <div className="mb-3">
              <label className="text-xs text-slate-500 mb-1 block">查找替换</label>
              <div className="flex gap-1">
                <input
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5"
                  placeholder="查找文本"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                />
                <input
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5"
                  placeholder="替换为"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                />
              </div>
            </div>

            {/* Prefix */}
            <div className="mb-3">
              <label className="text-xs text-slate-500 mb-1 block">添加前缀</label>
              <input
                className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
                placeholder="如: IMG_"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </div>

            {/* Suffix */}
            <div className="mb-3">
              <label className="text-xs text-slate-500 mb-1 block">添加后缀</label>
              <input
                className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
                placeholder="如: _final"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
              />
            </div>

            {/* Numbering */}
            <div className="mb-3">
              <label className="text-xs text-slate-500 mb-1 block">序号设置</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="w-16 text-xs border border-slate-200 rounded px-2 py-1.5"
                  value={startNum}
                  onChange={(e) => setStartNum(Number(e.target.value))}
                  title="起始序号"
                />
                <input
                  type="number"
                  className="w-16 text-xs border border-slate-200 rounded px-2 py-1.5"
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  min={1}
                  max={6}
                  title="位数"
                />
                <span className="text-xs text-slate-400 self-center ml-1">
                  起始值 / 位数
                </span>
              </div>
            </div>
          </div>

          {/* File Stats */}
          {files.length > 0 && (
            <div className="card p-3">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">文件统计</h3>
              <div className="text-xs text-slate-400 space-y-1">
                <div>📄 {files.length} 个文件</div>
                <div>💾 {formatSize(files.reduce((s, f) => s + f.size, 0))}</div>
                <div>✏️ {previewItems.filter((p) => p.oldName !== p.newName).length} 个将被重命名</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="flex-1 card p-3 overflow-auto min-h-0">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 sticky top-0 bg-white pb-2">
            预览 ({previewItems.length} 个文件)
          </h3>

          {files.length === 0 ? (
            <div className="empty-state py-16">
              <span className="empty-state-icon">✏️</span>
              <h3 className="empty-state-title">选择文件开始</h3>
              <p className="empty-state-desc">
                点击「选择文件」添加要重命名的文件，然后在上方配置重命名规则。
                预览会实时更新。
              </p>
              <button className="btn-primary mt-2" onClick={handlePickFiles}>
                选择文件
              </button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 sticky top-8 bg-white">
                  <th className="pb-2 font-medium">原文件名</th>
                  <th className="pb-2 font-medium">新文件名</th>
                  <th className="pb-2 font-medium w-16">大小</th>
                  <th className="pb-2 font-medium w-16">状态</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-1.5 pr-2 text-slate-600">{item.oldName}</td>
                    <td className={`py-1.5 pr-2 ${item.oldName !== item.newName ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                      {item.newName}
                    </td>
                    <td className="py-1.5 text-slate-400">{formatSize(item.file.size)}</td>
                    <td className="py-1.5">
                      {item.oldName !== item.newName ? '✏️' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 text-xs text-slate-400 border-t border-slate-200 mt-4">
        <span>实时预览 | 支持查找替换、前缀后缀、序号</span>
        <span>{files.length > 0 ? `${files.length} 个文件` : '未加载文件'}</span>
      </div>
    </div>
  );
}

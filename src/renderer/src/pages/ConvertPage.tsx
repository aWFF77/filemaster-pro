import { useState, useCallback } from 'react'
import { pickFiles, formatSize } from '../services/fileSystem'

export default function ConvertPage() {
  const [files, setFiles] = useState<any[]>([])
  const [targetFormat, setTargetFormat] = useState('jpg')
  const [quality, setQuality] = useState(85)

  const handlePickFiles = useCallback(async () => {
    const entries = await pickFiles({
      multiple: true,
      accept: '.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.avif,.pdf',
    })
    setFiles(entries)
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="page-header">
        <div>
          <h2 className="page-title">格式转换</h2>
          <p className="page-subtitle">批量转换图片和文档格式（当前版本支持图片格式）</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handlePickFiles}>📂 选择文件</button>
          <button className="btn-primary" disabled={files.length === 0}>▶️ 开始转换</button>
        </div>
      </div>

      <div className="flex-1 flex gap-4">
        <div className="w-72 card p-3 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">转换设置</h3>

          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">目标格式</label>
            <select
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
            >
              <option value="jpg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
              <option value="gif">GIF</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">
              质量: {quality}%
            </label>
            <input
              type="range"
              className="w-full"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              min={10}
              max={100}
            />
          </div>

          {files.length > 0 && (
            <div className="text-xs text-slate-400 space-y-1">
              <div>📄 {files.length} 个文件</div>
              <div>💾 {formatSize(files.reduce((s: number, f: any) => s + f.size, 0))}</div>
            </div>
          )}
        </div>

        <div className="flex-1 card p-3 overflow-auto">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">文件列表</h3>
          {files.length === 0 ? (
            <div className="empty-state py-16">
              <span className="empty-state-icon">🔄</span>
              <h3 className="empty-state-title">选择文件开始转换</h3>
              <p className="empty-state-desc">支持 JPG、PNG、WebP、GIF、BMP、TIFF、AVIF 等格式互转</p>
              <button className="btn-primary mt-2" onClick={handlePickFiles}>选择文件</button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">文件名</th>
                  <th className="pb-2 font-medium">当前格式</th>
                  <th className="pb-2 font-medium">目标格式</th>
                  <th className="pb-2 font-medium w-16">大小</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-1.5 text-slate-600">{f.name}</td>
                    <td className="py-1.5 text-slate-400">{f.ext}</td>
                    <td className="py-1.5 text-blue-600">.{targetFormat}</td>
                    <td className="py-1.5 text-slate-400">{formatSize(f.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { pickDirectory, formatSize, type ScanResult } from '../services/fileSystem'

export default function ReportPage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleScan = useCallback(async () => {
    setLoading(true)
    const result = await pickDirectory()
    if (result) setScanResult(result.result)
    setLoading(false)
  }, [])

  const byExt = scanResult
    ? (() => {
        const map = new Map<string, { count: number; size: number }>()
        for (const f of scanResult.files) {
          const key = f.ext || '(无扩展名)'
          const existing = map.get(key) || { count: 0, size: 0 }
          existing.count++
          existing.size += f.size
          map.set(key, existing)
        }
        return Array.from(map.entries())
          .map(([ext, data]) => ({ ext, ...data, percent: ((data.size / scanResult.totalSize) * 100).toFixed(1) }))
          .sort((a, b) => b.size - a.size)
      })()
    : []

  return (
    <div className="h-full flex flex-col">
      <div className="page-header">
        <div>
          <h2 className="page-title">归纳报告</h2>
          <p className="page-subtitle">扫描文件夹，生成文件统计和分布报告</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={handleScan} disabled={loading}>
            {loading ? '⏳ 扫描中...' : '📂 选择文件夹'}
          </button>
        </div>
      </div>

      {!scanResult ? (
        <div className="empty-state flex-1">
          <span className="empty-state-icon">📊</span>
          <h3 className="empty-state-title">选择文件夹生成报告</h3>
          <p className="empty-state-desc">系统会扫描所有文件并生成类型分布和统计信息</p>
          <button className="btn-primary mt-2" onClick={handleScan}>选择文件夹</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-auto">
          {/* Overview */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="文件总数" value={scanResult.files.length.toLocaleString()} />
            <StatCard label="总大小" value={formatSize(scanResult.totalSize)} />
            <StatCard label="子目录" value={scanResult.dirCount.toString()} />
            <StatCard label="平均大小" value={formatSize(Math.round(scanResult.totalSize / Math.max(1, scanResult.files.length)))} />
          </div>

          {/* Type Distribution */}
          <div className="card p-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">按类型分布</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">类型</th>
                  <th className="pb-2 font-medium">数量</th>
                  <th className="pb-2 font-medium">大小</th>
                  <th className="pb-2 font-medium">占比</th>
                  <th className="pb-2 font-medium">分布</th>
                </tr>
              </thead>
              <tbody>
                {byExt.slice(0, 20).map((row) => (
                  <tr key={row.ext} className="border-b border-slate-50">
                    <td className="py-1.5 font-medium text-slate-700">{row.ext}</td>
                    <td className="py-1.5 text-slate-600">{row.count}</td>
                    <td className="py-1.5 text-slate-600">{formatSize(row.size)}</td>
                    <td className="py-1.5 text-slate-600">{row.percent}%</td>
                    <td className="py-1.5">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-400 rounded-full" style={{ width: `${row.percent}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-xl font-bold text-slate-700">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}

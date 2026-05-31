import { useState, useCallback } from 'react'
import { pickFiles, readFileText, formatSize } from '../services/fileSystem'

const PATTERNS = [
  { id: 'email', name: '邮箱', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { id: 'phone-cn', name: '手机号', regex: /1[3-9]\d{9}/g },
  { id: 'url', name: '网址', regex: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g },
  { id: 'idcard', name: '身份证', regex: /[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g },
  { id: 'date', name: '日期', regex: /\d{4}[-/]\d{2}[-/]\d{2}/g },
  { id: 'amount', name: '金额', regex: /(?:¥|￥|CNY|USD|€|\$)\s*\d+[,，\d]*\.?\d{0,2}/g },
  { id: 'ip', name: 'IP地址', regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g },
]

interface ExtractResult {
  patternId: string
  patternName: string
  matches: string[]
  count: number
}

export default function ExtractPage() {
  const [files, setFiles] = useState<any[]>([])
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(['email', 'phone-cn', 'url'])
  const [results, setResults] = useState<ExtractResult[]>([])
  const [loading, setLoading] = useState(false)

  const handlePickFiles = useCallback(async () => {
    const entries = await pickFiles({ multiple: true })
    setFiles(entries)
    setResults([])
  }, [])

  const togglePattern = useCallback((id: string) => {
    setSelectedPatterns((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
    setResults([])
  }, [])

  const handleExtract = useCallback(async () => {
    setLoading(true)
    const allResults: ExtractResult[] = []
    const activePatterns = PATTERNS.filter((p) => selectedPatterns.includes(p.id))

    for (const pattern of activePatterns) {
      const matches = new Set<string>()
      for (const file of files) {
        try {
          const text = await readFileText(file.handle as FileSystemFileHandle)
          const found = text.match(pattern.regex)
          if (found) found.forEach((m) => matches.add(m.trim()))
        } catch { /* binary files will fail */ }
      }
      allResults.push({
        patternId: pattern.id,
        patternName: pattern.name,
        matches: Array.from(matches).sort(),
        count: matches.size,
      })
    }
    setResults(allResults)
    setLoading(false)
  }, [files, selectedPatterns])

  return (
    <div className="h-full flex flex-col">
      <div className="page-header">
        <div>
          <h2 className="page-title">信息提取</h2>
          <p className="page-subtitle">从文件中提取邮箱、手机号、网址等结构化信息</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handlePickFiles}>📂 选择文件</button>
          <button className="btn-primary" onClick={handleExtract} disabled={files.length === 0 || loading}>
            {loading ? '⏳ 提取中...' : '▶️ 开始提取'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4">
        <div className="w-72 card p-3 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">提取模式</h3>
          <div className="space-y-1">
            {PATTERNS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={selectedPatterns.includes(p.id)}
                  onChange={() => togglePattern(p.id)}
                  className="rounded"
                />
                {p.name}
              </label>
            ))}
          </div>
          {files.length > 0 && (
            <div className="mt-3 text-xs text-slate-400">
              已加载 {files.length} 个文件
            </div>
          )}
        </div>

        <div className="flex-1 card p-3 overflow-auto">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">提取结果</h3>
          {results.length === 0 ? (
            <div className="empty-state py-16">
              <span className="empty-state-icon">📋</span>
              <h3 className="empty-state-title">
                {files.length === 0 ? '选择文件开始' : '点击开始提取'}
              </h3>
              <p className="empty-state-desc">支持从 TXT、CSV、Markdown、HTML 等文本文件中提取信息</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.patternId}>
                  <h4 className="text-xs font-semibold text-slate-500 mb-1">
                    {r.patternName} ({r.count} 个结果)
                  </h4>
                  <div className="bg-slate-50 rounded p-2 max-h-32 overflow-y-auto font-mono text-xs">
                    {r.matches.slice(0, 50).map((m, i) => (
                      <div key={i} className="text-slate-600 py-0.5">{m}</div>
                    ))}
                    {r.matches.length > 50 && (
                      <div className="text-slate-400">... 还有 {r.matches.length - 50} 个</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

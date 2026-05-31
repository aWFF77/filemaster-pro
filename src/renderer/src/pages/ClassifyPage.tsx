import { useState, useCallback } from 'react'
import {
  pickDirectory,
  formatSize,
  type ScanResult,
} from '../services/fileSystem'
import {
  classifyFiles,
  computeStats,
  PRESET_RULES,
  type ClassificationRule,
  type ClassificationCondition,
  type ClassifyPlan,
  type ClassifyStats,
  type ConditionType,
  type Operator,
} from '../services/classifier'
import {
  isLicensed,
  addFileCount,
  isOverLimit,
  remainingSlots,
  FREE_LIMIT,
} from '../services/license'
import UpgradeModal from '../components/UpgradeModal'

// ─── Rule Editor Component ──────────────────────

function RuleEditor({
  rule,
  onSave,
  onDelete,
  onCancel,
}: {
  rule: ClassificationRule
  onSave: (rule: ClassificationRule) => void
  onDelete: (id: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(rule.name)
  const [conditions, setConditions] = useState<ClassificationCondition[]>(
    rule.conditions.length > 0 ? [...rule.conditions] : [{ type: 'name', operator: 'contains', value: '' }]
  )
  const [logic, setLogic] = useState<'AND' | 'OR'>(rule.logic)
  const [targetDir, setTargetDir] = useState(rule.targetDir)
  const [action, setAction] = useState(rule.action)
  const [priority, setPriority] = useState(rule.priority)

  const updateCondition = (i: number, field: keyof ClassificationCondition, val: unknown) => {
    setConditions((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: val }
      return next
    })
  }

  const addCondition = () => {
    setConditions((prev) => [...prev, { type: 'name', operator: 'contains', value: '' }])
  }

  const removeCondition = (i: number) => {
    setConditions((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = () => {
    onSave({
      ...rule,
      name: name || '未命名',
      conditions: conditions.filter((c) => c.value !== ''),
      logic,
      targetDir: targetDir || '待整理',
      action,
      priority,
    })
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[80vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          {rule.id.startsWith('custom-') ? '新建规则' : '编辑规则'}
        </h3>

        {/* Rule Name */}
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-500 mb-1 block">规则名称</label>
          <input
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如: 照片归档"
          />
        </div>

        {/* Conditions */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-500">匹配条件</label>
            <button className="text-xs text-primary-600 font-medium" onClick={addCondition}>
              + 添加条件
            </button>
          </div>
          <div className="space-y-2">
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2">
                {/* Condition type */}
                <select
                  className="text-xs border border-slate-200 rounded px-2 py-1.5 w-20"
                  value={cond.type}
                  onChange={(e) => updateCondition(i, 'type', e.target.value as ConditionType)}
                >
                  <option value="name">文件名</option>
                  <option value="extension">扩展名</option>
                  <option value="size">大小</option>
                  <option value="date">日期</option>
                </select>

                {/* Operator */}
                <select
                  className="text-xs border border-slate-200 rounded px-2 py-1.5 w-24"
                  value={cond.operator}
                  onChange={(e) => updateCondition(i, 'operator', e.target.value as Operator)}
                >
                  {cond.type === 'size' ? (
                    <>
                      <option value="gt">大于</option>
                      <option value="lt">小于</option>
                    </>
                  ) : cond.type === 'date' ? (
                    <>
                      <option value="gt">晚于</option>
                      <option value="lt">早于</option>
                    </>
                  ) : cond.type === 'extension' ? (
                    <>
                      <option value="in">属于</option>
                      <option value="notIn">不属于</option>
                      <option value="eq">等于</option>
                    </>
                  ) : (
                    <>
                      <option value="contains">包含</option>
                      <option value="matches">正则匹配</option>
                      <option value="eq">等于</option>
                      <option value="neq">不等于</option>
                    </>
                  )}
                </select>

                {/* Value */}
                <input
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5"
                  value={typeof cond.value === 'string' ? cond.value : Array.isArray(cond.value) ? cond.value.join(', ') : String(cond.value || '')}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (cond.type === 'extension') {
                      updateCondition(i, 'value', raw.split(/[,，\s]+/).filter(Boolean).map((v) => (v.startsWith('.') ? v.toLowerCase() : '.' + v.toLowerCase())))
                    } else if (cond.type === 'size') {
                      updateCondition(i, 'value', Number(raw) * 1024 * 1024) // MB to bytes
                    } else {
                      updateCondition(i, 'value', raw)
                    }
                  }}
                  placeholder={
                    cond.type === 'extension' ? '.jpg, .png, .pdf'
                    : cond.type === 'size' ? '10 (MB)'
                    : cond.type === 'name' && cond.operator === 'matches' ? '合同|协议|发票'
                    : cond.type === 'name' && cond.operator === 'contains' ? '合同'
                    : '输入匹配值'
                  }
                />

                {conditions.length > 1 && (
                  <button
                    className="text-xs text-red-400 hover:text-red-600 px-1"
                    onClick={() => removeCondition(i)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Logic toggle (only when multiple conditions) */}
          {conditions.length > 1 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-400">条件逻辑:</span>
              <button
                className={`text-xs px-3 py-1 rounded-full ${logic === 'AND' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}
                onClick={() => setLogic('AND')}
              >
                AND（全部满足）
              </button>
              <button
                className={`text-xs px-3 py-1 rounded-full ${logic === 'OR' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}
                onClick={() => setLogic('OR')}
              >
                OR（任一满足）
              </button>
            </div>
          )}
        </div>

        {/* Target Directory */}
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-500 mb-1 block">
            目标目录
            <span className="text-slate-300 ml-2">可用变量: {'{year} {month} {day} {ext} {name}'}</span>
          </label>
          <input
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-400"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            placeholder="例如: 照片/{year}/{month}"
          />
        </div>

        {/* Priority & Action */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">优先级（越小越优先）</label>
            <input
              type="number"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min={1}
              max={999}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">动作</label>
            <select
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              value={action}
              onChange={(e) => setAction(e.target.value as 'move' | 'copy')}
            >
              <option value="move">移动（移走原文件）</option>
              <option value="copy">复制（保留原文件）</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-slate-100">
          <button
            className="text-sm text-red-500 hover:text-red-700 font-medium"
            onClick={() => { onDelete(rule.id); onCancel() }}
          >
            🗑 删除规则
          </button>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={onCancel}>取消</button>
            <button className="btn-primary text-sm" onClick={handleSave}>💾 保存规则</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────

export default function ClassifyPage() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [rules, setRules] = useState<ClassificationRule[]>(PRESET_RULES)
  const [plan, setPlan] = useState<ClassifyPlan | null>(null)
  const [stats, setStats] = useState<ClassifyStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [executed, setExecuted] = useState(0)
  const [executedTotal, setExecutedTotal] = useState(0)
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  // Pick folder with limit check
  const handlePickFolder = useCallback(async () => {
    if (!isLicensed() && isOverLimit()) {
      setShowUpgrade(true)
      return
    }
    setLoading(true)
    try {
      const result = await pickDirectory()
      if (result) {
        setDirHandle(result.handle)
        setScanResult(result.result)
        setPlan(null)
        setStats(null)
        // Track file count for free tier
        if (!isLicensed()) {
          addFileCount(result.result.files.length)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Run classification preview
  const handlePreview = useCallback(() => {
    if (!scanResult) return
    const p = classifyFiles(scanResult.files, rules)
    const s = computeStats(p, rules)
    setPlan(p)
    setStats(s)
  }, [scanResult, rules])

  // Execute classification
  const handleExecute = useCallback(async () => {
    if (!plan || !dirHandle) return
    setExecuting(true)
    setExecuted(0)
    setExecutedTotal(plan.moves.length)
    let done = 0
    for (const item of plan.moves) {
      try {
        const targetDir = await ensureDir(dirHandle, item.targetDir)
        const srcHandle = item.file.handle as FileSystemFileHandle
        if (!srcHandle) { done++; setExecuted(done); continue }

        if (item.rule.action === 'move') {
          // 尝试原生 move() — 高效且原子操作（Chrome 125+）
          const nativeMove = (srcHandle as any).move as
            | ((dest: FileSystemDirectoryHandle, name: string) => Promise<void>)
            | undefined
          if (nativeMove) {
            try {
              await nativeMove(targetDir, item.targetName)
              done++
              setExecuted(done)
              continue
            } catch {
              // move() 失败，回退到 copy+delete
            }
          }
          // 回退：复制 + 删除源文件
          const file = await srcHandle.getFile()
          const destHandle = await targetDir.getFileHandle(item.targetName, { create: true })
          const writable = await destHandle.createWritable()
          await writable.write(await file.arrayBuffer())
          await writable.close()
          await deleteSourceFile(dirHandle, item.file.path)
        } else {
          // 复制模式：只复制，不删除源文件
          const file = await srcHandle.getFile()
          const destHandle = await targetDir.getFileHandle(item.targetName, { create: true })
          const writable = await destHandle.createWritable()
          await writable.write(await file.arrayBuffer())
          await writable.close()
        }
        done++
        setExecuted(done)
      } catch (err) {
        console.error(`Failed: ${item.file.name}`, err)
        done++
        setExecuted(done)
      }
    }
    setExecuting(false)
  }, [plan, dirHandle])

  // Toggle rule enabled/disabled
  const toggleRule = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
    setPlan(null)
    setStats(null)
  }, [])

  // Save edited rule
  const saveRule = useCallback((updatedRule: ClassificationRule) => {
    setRules((prev) => prev.map((r) => (r.id === updatedRule.id ? updatedRule : r)))
    setPlan(null)
    setStats(null)
  }, [])

  // Delete rule
  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
    setPlan(null)
    setStats(null)
  }, [])

  // Add new rule & open editor
  const addRule = useCallback(() => {
    const newRule: ClassificationRule = {
      id: 'custom-' + Date.now(),
      name: '新规则',
      priority: rules.length + 1,
      enabled: true,
      conditions: [{ type: 'name', operator: 'contains', value: '' }],
      logic: 'AND',
      targetDir: '待整理/{ext}',
      action: 'move',
      matchMode: 'first',
    }
    setEditingRule(newRule)
  }, [rules.length])

  // Open editor for existing rule
  const editRule = useCallback((rule: ClassificationRule) => {
    setEditingRule({ ...rule })
  }, [])

  const canPreview = scanResult && scanResult.files.length > 0
  const canExecute = plan && plan.moves.length > 0

  return (
    <div className="h-full flex flex-col">
      {/* Rule Editor Modal */}
      {editingRule && (
        <RuleEditor
          rule={editingRule}
          onSave={(updated) => {
            if (!rules.find((r) => r.id === updated.id)) {
              setRules((prev) => [...prev, updated])
            } else {
              saveRule(updated)
            }
          }}
          onDelete={deleteRule}
          onCancel={() => setEditingRule(null)}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onActivated={() => {
            setShowUpgrade(false)
            // Auto-pick folder after activation
            setTimeout(() => handlePickFolder(), 300)
          }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">智能分类</h2>
          <p className="page-subtitle">
            按规则自动将文件归类到对应文件夹 — 点击规则可编辑条件、目标目录、优先级
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handlePickFolder} disabled={loading}>
            📂 {loading ? '扫描中...' : '选择文件夹'}
          </button>
          <button className="btn-secondary" onClick={handlePreview} disabled={!canPreview}>
            👁️ 预览分类
          </button>
          <button className="btn-primary" onClick={handleExecute} disabled={!canExecute || executing}>
            {executing ? `⏳ 执行中 ${executed}/${executedTotal}` : '▶️ 执行分类'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Rules */}
        <div className="w-80 flex flex-col gap-3 flex-shrink-0 overflow-y-auto">
          <div className="card p-3 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sticky top-0 bg-white pb-2">
              <h3 className="text-sm font-semibold text-slate-700">分类规则 ({rules.length})</h3>
              <button className="text-xs text-primary-600 hover:text-primary-700 font-medium" onClick={addRule}>
                + 新建规则
              </button>
            </div>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`border rounded-lg p-2.5 mb-2 transition-all ${
                  rule.enabled
                    ? 'border-slate-200 hover:border-primary-300 hover:shadow-sm cursor-pointer'
                    : 'border-slate-100 bg-slate-50 opacity-60'
                }`}
                onClick={() => editRule(rule)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-300">#{rule.priority}</span>
                    <span className="text-xs font-semibold text-slate-700">{rule.name}</span>
                  </div>
                  <button
                    className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                      rule.enabled
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    onClick={(e) => toggleRule(rule.id, e)}
                    title="点击切换启用/停用"
                  >
                    {rule.enabled ? '●' : '○'}
                  </button>
                </div>
                <div className="text-xs text-slate-400 space-y-0.5">
                  <div>
                    {rule.conditions.map((c, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-slate-300"> {rule.logic} </span>}
                        <span className="text-slate-500">{c.type === 'name' ? '文件名' : c.type === 'extension' ? '扩展名' : c.type === 'size' ? '大小' : '日期'}</span>
                        {' '}{c.operator === 'contains' ? '包含' : c.operator === 'matches' ? '匹配' : c.operator === 'in' ? '属于' : c.operator === 'gt' ? '>' : c.operator === 'lt' ? '<' : c.operator === 'eq' ? '=' : c.operator}
                        {' '}<span className="text-slate-600 font-mono">"{String(c.value).substring(0, 25)}"</span>
                      </span>
                    ))}
                  </div>
                  <div>→ <span className="text-blue-600">{rule.targetDir}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* Presets */}
          <div className="card p-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">预设方案</h3>
            <div className="flex flex-wrap gap-1.5">
              {['重置为默认', '照片归档', '文档整理', '清空全部'].map((label) => (
                <button
                  key={label}
                  className="text-xs px-2 py-1 bg-slate-100 rounded-md text-slate-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                  onClick={() => {
                    if (label === '清空全部') setRules([])
                    else if (label === '照片归档') setRules(PRESET_RULES.filter((r) => r.targetDir.includes('照片') || r.targetDir.includes('截图')))
                    else if (label === '文档整理') setRules(PRESET_RULES.filter((r) => r.targetDir.includes('文档') || r.targetDir.includes('合同') || r.targetDir.includes('财务') || r.targetDir.includes('人事')))
                    else setRules(PRESET_RULES)
                    setPlan(null)
                    setStats(null)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview & Results */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {stats && (
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="文件总数" value={stats.totalFiles.toString()} />
              <StatCard label="已匹配" value={stats.matchedFiles.toString()} color="green" />
              <StatCard label="未匹配" value={stats.unmatchedFiles.toString()} color="orange" />
              <StatCard label="冲突" value={stats.conflicts.toString()} color="red" />
            </div>
          )}

          {scanResult && (
            <div className="text-xs text-slate-400 flex gap-4">
              <span>📁 {scanResult.files.length} 个文件</span>
              <span>💾 {formatSize(scanResult.totalSize)}</span>
              <span>📂 {scanResult.dirCount} 个子目录</span>
            </div>
          )}

          <div className="card p-3 flex-1 overflow-auto min-h-0">
            <h3 className="text-sm font-semibold text-slate-700 mb-2 sticky top-0 bg-white pb-2">
              {plan ? `分类预览 (${plan.moves.length} 个文件)${executing ? ' - 执行中...' : ''}` : '分类预览'}
            </h3>

            {!scanResult ? (
              <div className="empty-state py-12">
                <span className="empty-state-icon">🗂️</span>
                <h3 className="empty-state-title">选择文件夹开始</h3>
                <p className="empty-state-desc">点击「选择文件夹」扫描文件，然后点击「预览分类」查看结果</p>
              </div>
            ) : !plan ? (
              <div className="empty-state py-8">
                <span className="text-3xl">👆</span>
                <p className="text-sm text-slate-400">点击「预览分类」查看文件归类结果</p>
              </div>
            ) : plan.moves.length === 0 ? (
              <div className="empty-state py-8">
                <span className="text-3xl">🤷</span>
                <p className="text-sm text-slate-400">没有文件匹配当前规则</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100 sticky top-8 bg-white">
                    <th className="pb-2 font-medium">原文件</th>
                    <th className="pb-2 font-medium">目标目录</th>
                    <th className="pb-2 font-medium">匹配规则</th>
                    <th className="pb-2 font-medium w-16">大小</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.moves.slice(0, 200).map((item, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-1.5 pr-2 text-slate-600 truncate max-w-[200px]" title={item.file.path}>
                        {item.file.path}
                      </td>
                      <td className="py-1.5 pr-2 text-blue-600 truncate max-w-[150px]" title={item.targetDir}>
                        📁 {item.targetDir}/{item.targetName}
                      </td>
                      <td className="py-1.5 pr-2 text-slate-400">{item.rule.name}</td>
                      <td className="py-1.5 text-slate-400">{formatSize(item.file.size)}</td>
                    </tr>
                  ))}
                  {plan.moves.length > 200 && (
                    <tr>
                      <td colSpan={4} className="text-center text-slate-400 py-2">
                        ... 还有 {plan.moves.length - 200} 个文件 ...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Unmatched */}
          {plan && plan.unknowns.length > 0 && (
            <div className="card p-3 max-h-32 overflow-y-auto">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">⚠️ 未匹配文件 ({plan.unknowns.length})</h3>
              <div className="flex flex-wrap gap-1">
                {plan.unknowns.slice(0, 50).map((f) => (
                  <span key={f.id} className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded">
                    {f.name}
                  </span>
                ))}
                {plan.unknowns.length > 50 && (
                  <span className="text-xs text-slate-400">+{plan.unknowns.length - 50} 更多</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between pt-3 text-xs border-t border-slate-200 mt-4">
        <span className="text-slate-400">
          {executing
            ? `正在归类... ${executed}/${executedTotal}`
            : canExecute
            ? `就绪 — ${plan.moves.length} 个文件待处理`
            : scanResult
            ? '点击预览查看分类结果'
            : '选择文件夹开始'}
        </span>
        <div className="flex items-center gap-3">
          {!isLicensed() ? (
            <span className="text-orange-500 flex items-center gap-1">
              🔒 剩余 {remainingSlots()} / {FREE_LIMIT} 次
              <button
                className="text-primary-600 hover:text-primary-700 font-medium ml-1"
                onClick={() => setShowUpgrade(true)}
              >
                [升级]
              </button>
            </span>
          ) : (
            <span className="text-green-600 flex items-center gap-1">✅ 专业版</span>
          )}
          <span className="text-slate-400">{scanResult ? `${scanResult.files.length} 个文件` : '未扫描'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────

function StatCard({ label, value, color = 'default' }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-600', orange: 'text-orange-600', red: 'text-red-600', default: 'text-slate-700',
  }
  return (
    <div className="card p-3 text-center">
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}

async function ensureDir(rootHandle: FileSystemDirectoryHandle, dirPath: string): Promise<FileSystemDirectoryHandle> {
  const parts = dirPath.split('/').filter(Boolean)
  let current = rootHandle
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true })
  }
  return current
}

/** 删除源文件 — 从根目录沿路径追溯到父目录，然后 removeEntry */
async function deleteSourceFile(rootHandle: FileSystemDirectoryHandle, filePath: string): Promise<void> {
  const parts = filePath.split('/').filter(Boolean)
  if (parts.length === 0) return

  const fileName = parts[parts.length - 1] // 文件名
  const dirParts = parts.slice(0, -1)       // 父目录路径段

  // 追溯到父目录
  let current = rootHandle
  for (const part of dirParts) {
    try {
      current = await current.getDirectoryHandle(part)
    } catch {
      // 父目录不存在了，无法删除
      return
    }
  }

  // 删除源文件
  try {
    await current.removeEntry(fileName)
  } catch (err) {
    console.warn(`Failed to remove source: ${filePath}`, err)
  }
}

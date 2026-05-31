import type { FileEntry } from './fileSystem'

// ─── Types ────────────────────────────────────

export type ConditionType = 'extension' | 'name' | 'size' | 'date' | 'mime'
export type Operator = 'eq' | 'neq' | 'in' | 'notIn' | 'gt' | 'lt' | 'matches' | 'contains'
export type ActionType = 'move' | 'copy'
export type MatchMode = 'first' | 'all'

export interface ClassificationCondition {
  type: ConditionType
  operator: Operator
  value: string | string[] | number
}

export interface ClassificationRule {
  id: string
  name: string
  priority: number
  enabled: boolean
  conditions: ClassificationCondition[]
  logic: 'AND' | 'OR'
  targetDir: string // supports {year} {month} {day} {ext} {camera} {size_kb} {size_mb} {parent}
  action: ActionType
  matchMode: MatchMode
  renamePattern?: string // optional rename pattern
}

export interface ClassifyPlan {
  moves: { file: FileEntry; targetDir: string; targetName: string; rule: ClassificationRule }[]
  unknowns: FileEntry[]
  conflicts: string[]
}

// ─── Preset Rules ─────────────────────────────

export const PRESET_RULES: ClassificationRule[] = [
  {
    id: 'preset-photos',
    name: '照片自动归档',
    priority: 1,
    enabled: true,
    conditions: [{ type: 'extension', operator: 'in', value: ['.jpg', '.jpeg', '.png', '.heic', '.raw', '.dng', '.cr2', '.nef', '.arw'] }],
    logic: 'AND',
    targetDir: '照片/{year}/{month}',
    action: 'move',
    matchMode: 'first',
  },
  {
    id: 'preset-documents',
    name: '工作文档整理',
    priority: 2,
    enabled: true,
    conditions: [{ type: 'extension', operator: 'in', value: ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'] }],
    logic: 'AND',
    targetDir: '文档/{ext}',
    action: 'move',
    matchMode: 'first',
  },
  {
    id: 'preset-videos',
    name: '视频归类',
    priority: 3,
    enabled: true,
    conditions: [{ type: 'extension', operator: 'in', value: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'] }],
    logic: 'AND',
    targetDir: '视频/{year}',
    action: 'move',
    matchMode: 'first',
  },
  {
    id: 'preset-music',
    name: '音乐归类',
    priority: 4,
    enabled: true,
    conditions: [{ type: 'extension', operator: 'in', value: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'] }],
    logic: 'AND',
    targetDir: '音乐',
    action: 'move',
    matchMode: 'first',
  },
  {
    id: 'preset-screenshots',
    name: '截图归类',
    priority: 5,
    enabled: true,
    conditions: [
      { type: 'name', operator: 'matches', value: 'Screenshot|屏幕截图|截图|Snipaste' },
    ],
    logic: 'AND',
    targetDir: '截图/{year}',
    action: 'move',
    matchMode: 'first',
  },
  {
    id: 'preset-large-files',
    name: '大文件标记',
    priority: 6,
    enabled: true,
    conditions: [{ type: 'size', operator: 'gt', value: 100 * 1024 * 1024 }], // >100MB
    logic: 'AND',
    targetDir: '大文件',
    action: 'copy',
    matchMode: 'first',
  },
]

// ─── Rule Engine ──────────────────────────────

export function classifyFiles(
  files: FileEntry[],
  rules: ClassificationRule[]
): ClassifyPlan {
  const sortedRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority)

  const moves: ClassifyPlan['moves'] = []
  const unknowns: FileEntry[] = []
  const conflictSet = new Map<string, number>()

  for (const file of files) {
    let matched = false

    for (const rule of sortedRules) {
      if (matchRule(file, rule)) {
        const targetDir = resolveTargetDir(rule.targetDir, file)
        const targetName = rule.renamePattern
          ? resolveRename(rule.renamePattern, file, moves.length)
          : file.name

        // Conflict detection
        const destKey = `${targetDir}/${targetName}`
        const existing = conflictSet.get(destKey)
        if (existing !== undefined) {
          conflictSet.set(destKey, existing + 1)
        } else {
          conflictSet.set(destKey, 1)
        }

        moves.push({ file, targetDir, targetName, rule })
        matched = true

        if (rule.matchMode === 'first') break
      }
    }

    if (!matched) {
      unknowns.push(file)
    }
  }

  const conflicts = Array.from(conflictSet.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key)

  return { moves, unknowns, conflicts }
}

function matchRule(file: FileEntry, rule: ClassificationRule): boolean {
  const results = rule.conditions.map((c) => evaluateCondition(file, c))
  return rule.logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
}

function evaluateCondition(file: FileEntry, cond: ClassificationCondition): boolean {
  const actual = getActualValue(file, cond.type)
  if (actual === undefined) return false

  switch (cond.operator) {
    case 'eq':
      return String(actual).toLowerCase() === String(cond.value).toLowerCase()
    case 'neq':
      return String(actual).toLowerCase() !== String(cond.value).toLowerCase()
    case 'in':
      return (cond.value as string[]).map((v) => v.toLowerCase()).includes(String(actual).toLowerCase())
    case 'notIn':
      return !(cond.value as string[]).map((v) => v.toLowerCase()).includes(String(actual).toLowerCase())
    case 'gt':
      return Number(actual) > Number(cond.value)
    case 'lt':
      return Number(actual) < Number(cond.value)
    case 'matches':
      return new RegExp(String(cond.value), 'i').test(String(actual))
    case 'contains':
      return String(actual).toLowerCase().includes(String(cond.value).toLowerCase())
    default:
      return false
  }
}

function getActualValue(file: FileEntry, type: ConditionType): string | number | undefined {
  switch (type) {
    case 'extension':
      return file.ext
    case 'name':
      return file.name
    case 'size':
      return file.size
    case 'date':
      return file.mtime.toISOString()
    case 'mime':
      return file.ext // Simple extension-based mime
    default:
      return undefined
  }
}

// ─── Variable Resolution ──────────────────────

function resolveTargetDir(template: string, file: FileEntry): string {
  const vars: Record<string, string> = {
    '{year}': file.mtime.getFullYear().toString(),
    '{month}': String(file.mtime.getMonth() + 1).padStart(2, '0'),
    '{day}': String(file.mtime.getDate()).padStart(2, '0'),
    '{hour}': String(file.mtime.getHours()).padStart(2, '0'),
    '{ext}': file.ext.replace('.', ''),
    '{size_kb}': Math.round(file.size / 1024).toString(),
    '{size_mb}': (file.size / 1024 / 1024).toFixed(1),
    '{parent}': 'root',
  }

  return template.replace(/\{(\w+)\}/g, (match, key) => vars[match] ?? match)
}

function resolveRename(pattern: string, file: FileEntry, index: number): string {
  const baseName = file.name.replace(file.ext, '')
  return pattern
    .replace('{name}', baseName)
    .replace('{ext}', file.ext)
    .replace('{index}', String(index + 1).padStart(3, '0'))
    .replace('{date}', file.mtime.toISOString().split('T')[0])
}

// ─── Statistics ───────────────────────────────

export interface ClassifyStats {
  totalFiles: number
  matchedFiles: number
  unmatchedFiles: number
  byRule: { ruleName: string; count: number }[]
  byDir: { dir: string; count: number }[]
  conflicts: number
}

export function computeStats(plan: ClassifyPlan, rules: ClassificationRule[]): ClassifyStats {
  const byRule = new Map<string, number>()
  const byDir = new Map<string, number>()

  for (const m of plan.moves) {
    byRule.set(m.rule.name, (byRule.get(m.rule.name) || 0) + 1)
    byDir.set(m.targetDir, (byDir.get(m.targetDir) || 0) + 1)
  }

  return {
    totalFiles: plan.moves.length + plan.unknowns.length,
    matchedFiles: plan.moves.length,
    unmatchedFiles: plan.unknowns.length,
    byRule: Array.from(byRule.entries()).map(([ruleName, count]) => ({ ruleName, count })),
    byDir: Array.from(byDir.entries())
      .map(([dir, count]) => ({ dir, count }))
      .sort((a, b) => b.count - a.count),
    conflicts: plan.conflicts.length,
  }
}

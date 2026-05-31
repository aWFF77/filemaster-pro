// ─── File Entry ───────────────────────────────

export interface FileEntry {
  id: string;
  path: string;
  name: string;
  ext: string;
  size: number;
  mtime: Date;
  ctime: Date;
  isDir: boolean;
  mimeType?: string;
  children?: FileEntry[];
  metadata?: FileMetadata;
}

export interface FileMetadata {
  // Image EXIF
  camera?: string;
  lens?: string;
  focalLength?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  gps?: { lat: number; lng: number };
  dimensions?: { width: number; height: number };
  // Audio/Video
  duration?: number;
  bitrate?: number;
  codec?: string;
  // Document
  author?: string;
  title?: string;
  pageCount?: number;
  wordCount?: number;
}

// ─── Rename ───────────────────────────────────

export interface RenameRule {
  id: string;
  type: RenameRuleType;
  config: Record<string, unknown>;
  enabled: boolean;
}

export type RenameRuleType =
  | 'findReplace'
  | 'insert'
  | 'delete'
  | 'case'
  | 'serialize'
  | 'date'
  | 'metadata'
  | 'extension';

export interface RenamePreview {
  jobId: string;
  oldName: string;
  newName: string;
  originalPath: string;
  conflict: boolean;
  error?: string;
}

// ─── Classification ───────────────────────────

export interface ClassificationRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: ClassificationCondition[];
  logic: 'AND' | 'OR';
  actions: ClassificationAction[];
  matchMode: 'first' | 'all';
}

export interface ClassificationCondition {
  type: 'extension' | 'size' | 'date' | 'name' | 'mime';
  operator: 'eq' | 'neq' | 'in' | 'notIn' | 'gt' | 'lt' | 'matches' | 'contains';
  value: unknown;
}

export interface ClassificationAction {
  type: 'move' | 'copy' | 'symlink';
  targetDir: string;
  rename?: RenameRule[];
  createSubdirs?: boolean;
}

// ─── Convert ──────────────────────────────────

export interface ConvertJob {
  id: string;
  inputPath: string;
  outputPath: string;
  format: string;
  options: ConvertOptions;
}

export interface ConvertOptions {
  quality?: number;
  width?: number;
  height?: number;
  fit?: 'inside' | 'cover' | 'fill';
  colors?: number;
}

export interface ConvertResult {
  jobId: string;
  success: boolean;
  inputSize: number;
  outputSize?: number;
  ratio?: string;
  error?: string;
}

// ─── Extract ──────────────────────────────────

export interface ExtractionPattern {
  id: string;
  name: string;
  pattern: string;
  fileFilter?: string;
  group?: number;
  deduplicate: boolean;
  sortOutput: boolean;
}

export interface ExtractionReport {
  results: Record<string, {
    pattern: string;
    count: number;
    outputFile: string;
  }>;
}

// ─── Report ───────────────────────────────────

export interface FileReport {
  totalFiles: number;
  totalDirs: number;
  totalSize: number;
  avgSize: number;
  byType: { ext: string; count: number; size: number; percent: string }[];
  duplicates: {
    totalCount: number;
    wastedSpace: number;
    groups: { files: FileEntry[]; hash?: string }[];
  };
  anomalies: { type: string; path: string; reason: string }[];
  largest: FileEntry[];
}

// ─── Progress ─────────────────────────────────

export interface Progress {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}

// ─── Navigation ───────────────────────────────

export type ModuleId = 'rename' | 'convert' | 'classify' | 'extract' | 'report' | 'settings';

export interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  description: string;
}

// ─── License Service ──────────────────────────
// Free: 30 files, Pro: ¥49 lifetime
// Key format: FMP-SSSS-XXXX-CC (SSSS=serial, XXXX=random, CC=checksum)

const STORAGE_KEY = 'filemaster_license'
const COUNT_KEY = 'filemaster_file_count'
const USED_KEY = 'filemaster_used_keys' // locally-tracked used serials
const FREE_LIMIT = 30
const PRICE = 49

interface LicenseState {
  activated: boolean
  key: string
  serial: string
  activatedAt: string
}

// Key validation for NEW format: FMP-SSSS-XXXX-CC
export function validateLicenseKey(key: string): string | null {
  const cleaned = key.replace(/\s/g, '').toUpperCase()

  // Try new format: FMP-SSSS-XXXX-CC
  let match = cleaned.match(/^FMP-(\d{4})-([A-Z0-9]{4})-([A-Z0-9]{2})$/)
  if (match) {
    const [, serialStr, body, ck] = match
    const expected = computeChecksum(serialStr, body)
    return ck === expected ? serialStr : null
  }

  // Legacy format: FMP-XXXXXXXX-XXXX (checksum-only, no serial)
  match = cleaned.match(/^FMP-([A-Z0-9]{8})-([A-Z0-9]{4})$/)
  if (match) {
    const body = match[1] + match[2]
    let sum = 0
    for (let i = 0; i < body.length; i++) {
      sum += body.charCodeAt(i) * (i + 1)
    }
    return sum % 97 === 13 ? 'legacy' : null
  }

  return null
}

function computeChecksum(serialStr: string, body: string): string {
  const combined = serialStr.padStart(4, '0') + body
  let sum = 0
  for (let i = 0; i < combined.length; i++) {
    sum += combined.charCodeAt(i) * (i + 1)
  }
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return alphabet[sum % alphabet.length] + alphabet[(sum * 7) % alphabet.length]
}

// Get current license
export function getLicense(): LicenseState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as LicenseState
      if (parsed.activated) {
        // Revalidate key
        const serial = validateLicenseKey(parsed.key)
        if (serial) return parsed
      }
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* ignore */ }
  return { activated: false, key: '', serial: '', activatedAt: '' }
}

// Activate a license key (with online check for single-use)
export async function activateLicense(
  key: string
): Promise<{ success: boolean; message: string }> {
  const serial = validateLicenseKey(key)
  if (!serial) {
    return { success: false, message: '激活码无效，请检查后重试。格式: FMP-XXXX-XXXX-XX' }
  }

  // For legacy keys (no serial), just activate
  if (serial === 'legacy') {
    const license: LicenseState = {
      activated: true,
      key: key.toUpperCase(),
      serial: 'legacy',
      activatedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(license))
    return { success: true, message: '激活成功！已解锁专业版。' }
  }

  // Check if this serial has been used locally
  const used = getUsedSerials()
  if (used.includes(serial)) {
    return { success: false, message: '此激活码已被使用。每个激活码仅限激活一次。' }
  }

  // Try online validation for true single-use enforcement
  const onlineOk = await checkOnline(serial)
  if (!onlineOk) {
    // If online check fails (offline or already used), still allow local activation
    // but mark it for online sync later
  }

  // Activate
  const license: LicenseState = {
    activated: true,
    key: key.toUpperCase(),
    serial,
    activatedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(license))

  // Mark serial as used
  markSerialUsed(serial)

  return { success: true, message: '激活成功！已解锁专业版，终身有效。' }
}

// ─── Online Validation ──────────────────────

// Set this to your activation server URL when deployed
let ACTIVATION_SERVER = ''

// Auto-configure activation server based on deployment
if (typeof window !== 'undefined') {
  const host = window.location.host
  if (host.includes('vercel.app') || host.includes('filemaster')) {
    ACTIVATION_SERVER = window.location.origin + '/api'
  }
}

export function setActivationServer(url: string) {
  ACTIVATION_SERVER = url
}

async function checkOnline(serial: string): Promise<boolean> {
  if (!ACTIVATION_SERVER) return true // No server configured — allow
  try {
    const res = await fetch(`${ACTIVATION_SERVER}/check/${serial}`)
    const data = await res.json()
    return data.available === true
  } catch {
    return true // Offline — allow
  }
}

async function markOnlineUsed(serial: string): Promise<void> {
  if (!ACTIVATION_SERVER) return
  try {
    await fetch(`${ACTIVATION_SERVER}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial }),
    })
  } catch { /* ignore */ }
}

// ─── Local Used Key Tracking ────────────────

function getUsedSerials(): string[] {
  try {
    return JSON.parse(localStorage.getItem(USED_KEY) || '[]')
  } catch {
    return []
  }
}

function markSerialUsed(serial: string): void {
  const used = getUsedSerials()
  if (!used.includes(serial)) {
    used.push(serial)
    localStorage.setItem(USED_KEY, JSON.stringify(used))
  }
  // Also sync online
  markOnlineUsed(serial)
}

// ─── File Count ─────────────────────────────

export function isLicensed(): boolean {
  return getLicense().activated
}

export function getFileCount(): number {
  try { return parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) } catch { return 0 }
}

export function addFileCount(count: number): void {
  if (isLicensed()) return
  localStorage.setItem(COUNT_KEY, String(getFileCount() + count))
}

export function resetFileCount(): void {
  localStorage.setItem(COUNT_KEY, '0')
}

export function isOverLimit(): boolean {
  if (isLicensed()) return false
  return getFileCount() >= FREE_LIMIT
}

export function remainingSlots(): number {
  if (isLicensed()) return Infinity
  return Math.max(0, FREE_LIMIT - getFileCount())
}

export { FREE_LIMIT, PRICE }

// Vercel Serverless Function — Key Activation
// POST /api/activate  { key: "FMP-1001-XXXX-XX" }
// Stores used keys in Vercel KV or Environment Variable

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { key } = req.body || {}
  if (!key) return res.status(400).json({ error: 'Missing key' })

  // Validate key format & checksum
  const serial = validateKey(key)
  if (!serial) {
    return res.status(200).json({ success: false, message: '激活码无效，请检查格式。' })
  }

  // Check if already used
  const used = await getUsedKeys()
  if (used.includes(serial)) {
    return res.status(200).json({ success: false, message: '此激活码已被使用。每个激活码仅限激活一次。' })
  }

  // Mark as used
  await markUsed(serial)

  return res.status(200).json({ success: true, message: '激活成功！已解锁专业版。', serial })
}

// ─── Key Validation ─────────────────────

function validateKey(key) {
  const cleaned = key.replace(/\s/g, '').toUpperCase()

  // New format: FMP-SSSS-XXXX-CC
  const match = cleaned.match(/^FMP-(\d{4})-([A-Z0-9]{4})-([A-Z0-9]{2})$/)
  if (!match) return null

  const [, serial, body, ck] = match
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const combined = serial.padStart(4, '0') + body
  let sum = 0
  for (let i = 0; i < combined.length; i++) sum += combined.charCodeAt(i) * (i + 1)
  const expected = alphabet[sum % alphabet.length] + alphabet[(sum * 7) % alphabet.length]

  return ck === expected ? serial : null
}

// ─── Persistence (Env-var based for MVP) ──

async function getUsedKeys() {
  // Production: use Vercel KV or a database
  // MVP: store in environment variable (comma-separated serials)
  if (global._usedKeysCache) return global._usedKeysCache
  try {
    const raw = process.env.USED_KEYS || ''
    global._usedKeysCache = raw.split(',').filter(Boolean)
    return global._usedKeysCache
  } catch { return [] }
}

async function markUsed(serial) {
  global._usedKeysCache = [...(global._usedKeysCache || []), serial]
  // In production, update Vercel KV or database
  // For MVP, log to console (admin can track)
  console.log(`[ACTIVATED] Serial: ${serial} at ${new Date().toISOString()}`)
}

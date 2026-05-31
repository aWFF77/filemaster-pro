// 生成唯一激活码，每个码内嵌序列号 + 校验位
// 用法: node scripts/generate-keys.mjs [数量] [起始编号]

const COUNT = parseInt(process.argv[2] || '100')
const START = parseInt(process.argv[3] || '1001')

function checksum(serial, body) {
  let sum = 0
  const combined = String(serial).padStart(4, '0') + body
  for (let i = 0; i < combined.length; i++) {
    sum += combined.charCodeAt(i) * (i + 1)
  }
  // 用 2 位校验位（A-Z, 0-9）
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return alphabet[sum % alphabet.length] + alphabet[(sum * 7) % alphabet.length]
}

function generateKey(serial) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  // 中间随机段
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  // 校验位
  const ck = checksum(serial, part1)
  // 格式: FMP-序列号-随机段-校验位
  return `FMP-${String(serial).padStart(4, '0')}-${part1}-${ck}`
}

function validateKey(key) {
  const cleaned = key.replace(/\s/g, '').toUpperCase()
  const match = cleaned.match(/^FMP-(\d{4})-([A-Z0-9]{4})-([A-Z0-9]{2})$/)
  if (!match) return false
  const [, serialStr, body, ck] = match
  const expected = checksum(parseInt(serialStr, 10), body)
  return ck === expected
}

// ─── Generate ─────────────────────────────
const keys = []
for (let i = 0; i < COUNT; i++) {
  const serial = START + i
  const key = generateKey(serial)
  keys.push({ serial, key, valid: validateKey(key) })
}

// ─── Output ───────────────────────────────
console.log(`Serial,Key,Valid`)
for (const k of keys) {
  console.log(`${k.serial},${k.key},${k.valid}`)
}

// ─── Also save to file ────────────────────
import { writeFileSync } from 'fs'
const csv = 'Serial,Key\n' + keys.map(k => `${k.serial},${k.key}`).join('\n')
writeFileSync('activation-keys.csv', csv)
console.error(`\n✅ ${COUNT} keys generated → activation-keys.csv`)
console.error(`   Range: #${START} - #${START + COUNT - 1}`)
console.error(`   Sample: ${keys[0].key}`)

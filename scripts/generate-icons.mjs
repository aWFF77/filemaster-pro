import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../src/renderer/public')
mkdirSync(publicDir, { recursive: true })

async function generateIcon(size) {
  const borderRadius = Math.round(size / 5)
  const fontSize = Math.round(size * 0.42)

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-${size}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2563eb"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#bg-${size})"/>
    <text x="${size/2}" y="${size*0.62}" font-size="${fontSize}" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="bold">FM</text>
  </svg>`

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, `icon-${size}.png`))

  console.log(`  ✓ icon-${size}.png`)
}

console.log('Generating PWA icons...')
await generateIcon(192)
await generateIcon(512)
console.log('Done!')

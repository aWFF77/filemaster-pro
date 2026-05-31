// Full release build: PWA app + landing page + zip download
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { createWriteStream } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

console.log('🔨 Building FileMaster Pro release...\n')

// 1. Build Vite
console.log('📦 Step 1: Build app...')
execSync('npx vite build', { cwd: root, stdio: 'inherit' })

// 2. Generate icons
console.log('\n🎨 Step 2: Generate icons...')
execSync('node scripts/generate-icons.mjs', { cwd: root, stdio: 'inherit' })

// 3. Create zip for download
console.log('\n📥 Step 3: Create download package...')
const distDir = join(root, 'dist', 'renderer')
const zipPath = join(root, 'dist', 'filemaster-pro.zip')

// Use built-in approach to create zip (7zip if available, or just copy files)
try {
  execSync(`powershell Compress-Archive -Path "${distDir}\\*" -DestinationPath "${zipPath}" -Force`, { stdio: 'pipe' })
  const zipSize = statSync(zipPath).size
  console.log(`   ✅ filemaster-pro.zip (${(zipSize / 1024).toFixed(0)} KB)`)
} catch {
  console.log('   ⚠️  Could not create zip (7zip/powershell not available)')
}

// 4. Copy landing page to dist root
console.log('\n📄 Step 4: Setup landing page...')
const landingHtml = readFileSync(join(root, 'index.html'), 'utf-8')
// Update links in landing page
const updatedHtml = landingHtml
  .replace('href="./app/"', 'href="/app"')
  .replace('href="./filemaster-pro.zip"', 'href="/filemaster-pro.zip"')
writeFileSync(join(root, 'dist', 'index.html'), updatedHtml)

console.log('\n✅ Release build complete!')
console.log('   dist/')
console.log('   ├── index.html          (landing page)')
console.log('   ├── filemaster-pro.zip  (download)')
console.log('   ├── renderer/           (PWA app)')
console.log('   └── ...')

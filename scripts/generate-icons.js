import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const sizes = [192, 512]
const bgColor = '#1a1a2e'
const textColor = '#64b5f6'

async function generateIcon(size) {
  const fontSize = Math.round(size * 0.5)
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="system-ui, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="${textColor}"
      >T</text>
    </svg>
  `

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(publicDir, `icon-${size}.png`))

  console.log(`Generated icon-${size}.png`)
}

mkdirSync(publicDir, { recursive: true })

for (const size of sizes) {
  await generateIcon(size)
}

console.log('Icons generated successfully')

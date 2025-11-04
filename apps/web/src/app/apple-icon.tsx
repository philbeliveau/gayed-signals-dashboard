import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default async function AppleIcon() {
  // Read the logo file
  const logoPath = path.join(process.cwd(), 'public', 'logo.webp')
  const imageBuffer = fs.readFileSync(logoPath)
  const base64Image = imageBuffer.toString('base64')
  const dataUrl = `data:image/webp;base64,${base64Image}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
        }}
      >
        <img
          src={dataUrl}
          width={180}
          height={180}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}

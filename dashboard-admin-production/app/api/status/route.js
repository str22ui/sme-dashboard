import { list } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  try {
    const types = ['npl', 'kol2', 'realisasi']
    const status = {}
    
    for (const type of types) {
      // Try to fetch metadata
      try {
        const metadataUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN?.split('_')[1]}.public.blob.vercel-storage.com/${type}_metadata.json`
        const response = await fetch(metadataUrl)
        
        if (response.ok) {
          status[type] = await response.json()
        } else {
          status[type] = null
        }
      } catch (error) {
        status[type] = null
      }
    }
    
    return NextResponse.json(status)
    
  } catch (error) {
    console.error('Status fetch error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

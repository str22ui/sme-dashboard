import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request, { params }) {
  const { type, file } = params
  
  try {
    // Direct Blob URL (from Blob storage settings)
    const blobBaseUrl = 'https://pgrnuw5fcdcfjo0d.public.blob.vercel-storage.com'
    const blobUrl = `${blobBaseUrl}/${type}_${file}.json`
    
    console.log('Fetching from Blob:', blobUrl)
    
    const response = await fetch(blobUrl, {
      cache: 'no-store',
    })
    
    if (!response.ok) {
      console.error('Blob fetch failed:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Data not found: ${type}_${file}.json` },
        { status: 404 }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
    
  } catch (error) {
    console.error('Data fetch error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
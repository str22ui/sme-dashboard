import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request, { params }) {
  const { type, file } = params
  
  try {
    // In production, construct Blob URL from environment variable
    const blobUrl = process.env.BLOB_READ_WRITE_TOKEN 
      ? `https://${process.env.BLOB_READ_WRITE_TOKEN.split('_')[1]}.public.blob.vercel-storage.com`
      : process.env.NEXT_PUBLIC_BLOB_URL
    
    if (!blobUrl) {
      return NextResponse.json(
        { error: 'Blob storage not configured' },
        { status: 500 }
      )
    }
    
    const url = `${blobUrl}/${type}_${file}.json`
    
    const response = await fetch(url, {
      cache: 'no-store',
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Data not found' },
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
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

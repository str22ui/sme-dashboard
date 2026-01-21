import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    console.log('🔍 Testing Blob upload...')
    
    // Test 1: Check token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN not found' },
        { status: 500 }
      )
    }
    console.log('✅ Token exists')
    
    // Test 2: Try simple upload
    console.log('🔄 Attempting simple blob upload...')
    
    try {
      const testData = {
        test: 'hello',
        timestamp: new Date().toISOString()
      }
      
      const blob = await put(
        'test.json',
        JSON.stringify(testData),
        { 
          access: 'public',
          addRandomSuffix: false
        }
      )
      
      console.log('✅ Blob upload successful!')
      console.log('📍 Blob URL:', blob.url)
      
      return NextResponse.json({
        success: true,
        message: 'Test upload successful',
        blobUrl: blob.url,
        data: testData
      })
      
    } catch (blobError) {
      console.error('❌ Blob Error:', blobError)
      console.error('Error name:', blobError.name)
      console.error('Error message:', blobError.message)
      console.error('Error cause:', blobError.cause)
      
      // Return detailed error info
      return NextResponse.json({
        error: 'Blob upload failed',
        errorName: blobError.name,
        errorMessage: blobError.message,
        errorCause: blobError.cause?.toString(),
        fullError: blobError.toString()
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ General Error:', error)
    return NextResponse.json({
      error: 'Request failed',
      details: error.message
    }, { status: 500 })
  }
}

// Also add GET method to test if route is working
export async function GET() {
  return NextResponse.json({
    status: 'Route is working',
    hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
  })
}
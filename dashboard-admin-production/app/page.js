'use client'

import { useState } from 'react'

export default function UploadPage() {
  const [files, setFiles] = useState({
    npl: null,
    kol2: null,
    realisasi: null
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleFileChange = (type, e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }))
      setError(null)
    }
  }

  const handleUpload = async () => {
    setError(null)
    setSuccess(null)

    // Validate files
    if (!files.npl || !files.kol2 || !files.realisasi) {
      setError('Please select all 3 Excel files')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('npl', files.npl)
      formData.append('kol2', files.kol2)
      formData.append('realisasi', files.realisasi)

      console.log('📤 Uploading files...')
      console.log('Files:', {
        npl: files.npl.name,
        kol2: files.kol2.name,
        realisasi: files.realisasi.name
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      console.log('📥 Response status:', response.status)
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

      // Get response text first (to handle non-JSON responses)
      const responseText = await response.text()
      console.log('📥 Response text:', responseText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError)
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 200)}`)
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || `Upload failed with status ${response.status}`)
      }

      console.log('✅ Upload successful:', data)
      setSuccess(`Files uploaded successfully! Stats: NPL Cabang: ${data.stats?.nplCabang || 0}, KOL2 Cabang: ${data.stats?.kol2Cabang || 0}, Realisasi Days: ${data.stats?.realisasiDays || 0}`)
      
      // Reset files
      setFiles({ npl: null, kol2: null, realisasi: null })

    } catch (err) {
      console.error('❌ Upload error:', err)
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6">📁 Upload Excel Files</h2>

        {/* NPL File */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">1. NPL SME</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleFileChange('npl', e)}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2"
          />
          {files.npl && (
            <p className="text-sm text-green-600 mt-1">✅ {files.npl.name}</p>
          )}
        </div>

        {/* KOL2 File */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">2. Kol 2 SME</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleFileChange('kol2', e)}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2"
          />
          {files.kol2 && (
            <p className="text-sm text-green-600 mt-1">✅ {files.kol2.name}</p>
          )}
        </div>

        {/* Realisasi File */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">3. Realisasi Harian</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleFileChange('realisasi', e)}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2"
          />
          {files.realisasi && (
            <p className="text-sm text-green-600 mt-1">✅ {files.realisasi.name}</p>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !files.npl || !files.kol2 || !files.realisasi}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {uploading ? '⏳ Uploading...' : '📤 Upload All Files & Replace'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">❌ Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">✅ Success</p>
            <p className="text-green-700 text-sm mt-1">{success}</p>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs">
          <p className="font-medium mb-2">🔍 Debug Info:</p>
          <p>• API Endpoint: /api/upload</p>
          <p>• Files Ready: {Object.values(files).filter(Boolean).length}/3</p>
          <p>• Check browser console for detailed logs</p>
        </div>
      </div>
    </div>
  )
}
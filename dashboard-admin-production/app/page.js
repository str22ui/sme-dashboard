'use client'

import { useState, useEffect } from 'react'

export default function AdminPage() {
  const [nplFile, setNplFile] = useState(null)
  const [kol2File, setKol2File] = useState(null)
  const [realisasiFile, setRealisasiFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentData, setCurrentData] = useState({
    npl: null,
    kol2: null,
    realisasi: null
  })

  // Fetch current data status on mount
  useEffect(() => {
    fetchCurrentStatus()
  }, [])

  const fetchCurrentStatus = async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      setCurrentData(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    }
  }

  const handleUpload = async () => {
    if (!nplFile || !kol2File || !realisasiFile) {
      setError('Please select all 3 PDF files')
      return
    }

    setUploading(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.append('npl', nplFile)
      formData.append('kol2', kol2File)
      formData.append('realisasi', realisasiFile)

      console.log('Uploading files:', {
        npl: nplFile.name,
        kol2: kol2File.name,
        realisasi: realisasiFile.name
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Upload failed')
      }

      setMessage('Files uploaded successfully!')
      setNplFile(null)
      setKol2File(null)
      setRealisasiFile(null)
      
      // Refresh status
      setTimeout(() => {
        fetchCurrentStatus()
      }, 1000)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                SME Dashboard - Admin Upload Portal
              </h1>
              <p className="text-gray-600">Upload 3 PDF files to update both TV dashboards</p>
            </div>
          </div>
        </div>

        {/* Current Data Status */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📅 Current Data Status
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">NPL SME</h3>
              {currentData.npl ? (
                <>
                  <p className="text-sm text-gray-600">
                    📄 {currentData.npl.filename}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(currentData.npl.uploadDate).toLocaleString('id-ID')}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">🔵 No data</p>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Kol 2 SME</h3>
              {currentData.kol2 ? (
                <>
                  <p className="text-sm text-gray-600">
                    📄 {currentData.kol2.filename}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(currentData.kol2.uploadDate).toLocaleString('id-ID')}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">🔵 No data</p>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Realisasi Harian</h3>
              {currentData.realisasi ? (
                <>
                  <p className="text-sm text-gray-600">
                    📄 {currentData.realisasi.filename}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(currentData.realisasi.uploadDate).toLocaleString('id-ID')}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">🔵 No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            📁 Upload New Data (will replace old)
          </h2>

          {/* NPL File */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. NPL SME
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setNplFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {nplFile && (
              <p className="mt-2 text-sm text-green-600">✅ {nplFile.name}</p>
            )}
          </div>

          {/* KOL2 File */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Kol 2 SME
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setKol2File(e.target.files[0])}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {kol2File && (
              <p className="mt-2 text-sm text-green-600">✅ {kol2File.name}</p>
            )}
          </div>

          {/* Realisasi File */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3. Realisasi Harian
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setRealisasiFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {realisasiFile && (
              <p className="mt-2 text-sm text-green-600">✅ {realisasiFile.name}</p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-sm text-yellow-700">
              ⚠️ Warning: Uploading will DELETE old data and replace with new files!
            </p>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !nplFile || !kol2File || !realisasiFile}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
              uploading || !nplFile || !kol2File || !realisasiFile
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload All Files & Replace'}
          </button>

          {/* Success Message */}
          {message && (
            <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
              <p className="text-green-700">✅ {message}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-red-700">❌ Error: {error}</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Dashboard NPL: Port 3001 | Dashboard KOL: Port 3002</p>
          <p className="mt-2">Data will auto-refresh every 30 seconds</p>
        </div>
      </div>
    </div>
  )
}
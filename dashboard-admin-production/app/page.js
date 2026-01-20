'use client'

import { useState, useEffect } from 'react'

export default function AdminUploadPage() {
  const [files, setFiles] = useState({
    npl: null,
    kol2: null,
    realisasi: null,
  })
  
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [currentData, setCurrentData] = useState({
    npl: null,
    kol2: null,
    realisasi: null,
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

  const handleFileChange = (type, event) => {
    const file = event.target.files[0]
    if (file && file.type === 'application/pdf') {
      setFiles(prev => ({ ...prev, [type]: file }))
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleUpload = async () => {
    // Validate all files selected
    if (!files.npl || !files.kol2 || !files.realisasi) {
      alert('Please select all 3 PDF files before uploading')
      return
    }

    setUploading(true)
    setUploadStatus('Uploading files...')

    try {
      // Upload each file
      for (const [type, file] of Object.entries(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${type}`)
        }

        setUploadStatus(`Uploaded ${type.toUpperCase()}... Processing...`)
      }

      setUploadStatus('All files uploaded successfully! ✅')
      
      // Refresh status
      await fetchCurrentStatus()
      
      // Clear file inputs
      setFiles({ npl: null, kol2: null, realisasi: null })
      
      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus(null)
      }, 3000)
      
    } catch (error) {
      setUploadStatus(`Error: ${error.message} ❌`)
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No data'
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📊 SME Dashboard - Admin Upload Portal
          </h1>
          <p className="text-gray-600">
            Upload 3 PDF files to update both TV dashboards
          </p>
        </div>

        {/* Current Data Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📅 Current Data Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DataStatusCard 
              title="NPL SME" 
              data={currentData.npl}
              formatDate={formatDate}
            />
            <DataStatusCard 
              title="Kol 2 SME" 
              data={currentData.kol2}
              formatDate={formatDate}
            />
            <DataStatusCard 
              title="Realisasi Harian" 
              data={currentData.realisasi}
              formatDate={formatDate}
            />
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📁 Upload New Data (will replace old)
          </h2>
          
          <div className="space-y-4">
            <FileUploadInput
              label="1. NPL SME"
              type="npl"
              file={files.npl}
              onChange={handleFileChange}
            />
            
            <FileUploadInput
              label="2. Kol 2 SME"
              type="kol2"
              file={files.kol2}
              onChange={handleFileChange}
            />
            
            <FileUploadInput
              label="3. Realisasi Harian"
              type="realisasi"
              file={files.realisasi}
              onChange={handleFileChange}
            />
          </div>

          {/* Warning */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">
              ⚠️ Warning: Uploading will DELETE old data and replace with new files!
            </p>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !files.npl || !files.kol2 || !files.realisasi}
            className={`
              mt-6 w-full py-3 px-6 rounded-lg font-semibold text-white
              transition-all duration-200
              ${uploading || !files.npl || !files.kol2 || !files.realisasi
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }
            `}
          >
            {uploading ? 'Uploading...' : 'Upload All Files & Replace'}
          </button>

          {/* Upload Status */}
          {uploadStatus && (
            <div className={`
              mt-4 p-4 rounded-lg text-center font-medium
              ${uploadStatus.includes('Error') 
                ? 'bg-red-100 text-red-800' 
                : uploadStatus.includes('successfully')
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
              }
            `}>
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Dashboard Links */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📺 View Dashboards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="#"
              target="_blank"
              className="block p-4 border-2 border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <div className="text-orange-600 font-semibold mb-1">TV 1 - NPL Dashboard</div>
              <div className="text-sm text-gray-600">Orange Theme</div>
            </a>
            <a
              href="#"
              target="_blank"
              className="block p-4 border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="text-blue-600 font-semibold mb-1">TV 2 - KOL 2 Dashboard</div>
              <div className="text-sm text-gray-600">Blue Theme</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Components
function DataStatusCard({ title, data, formatDate }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-700 mb-2">{title}</h3>
      {data ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-sm text-gray-600">{formatDate(data.uploadDate)}</span>
          </div>
          <div className="text-xs text-gray-500">
            {data.filename}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">⚪</span>
          <span className="text-sm text-gray-400">No data</span>
        </div>
      )}
    </div>
  )
}

function FileUploadInput({ label, type, file, onChange }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <label className="block mb-2 font-medium text-gray-700">
        {label}
      </label>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => onChange(type, e)}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100
          cursor-pointer"
      />
      {file && (
        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
          <span>✅</span>
          <span>{file.name}</span>
        </div>
      )}
    </div>
  )
}

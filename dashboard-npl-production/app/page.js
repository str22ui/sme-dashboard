'use client'

import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useAutoSlide } from './hooks/useAutoSlide'
import { useDataFetch } from './hooks/useDataFetch'
import Dashboard from './components/Dashboard'
import KanwilDetail from './components/KanwilDetail'
import Realisasi from './components/Realisasi'
import ProgressIndicator from './components/ProgressIndicator'
import AutoSlideIndicator from './components/AutoSlideIndicator'

export default function NPLDashboardPage() {
  // Fetch data with auto-refresh every 30 seconds
  const { data: nplData, metadata: nplMetadata, loading: nplLoading } = useDataFetch('npl', 30000)
  const { data: realisasiData, loading: realisasiLoading } = useDataFetch('realisasi', 30000)
  
  // Navigation state
  const { currentPage, pageName } = useKeyboardNav()
  
  // Auto-slide with pause functionality
  const handleNext = () => {
    // Simulate arrow right key press
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
  }
  
  const { isPaused, countdown } = useAutoSlide({
    onNext: handleNext,
    interval: 30000, // 30 seconds
  })
  
  // Render appropriate component based on current page
  const renderPage = () => {
    if (currentPage === -1) {
      // Realisasi page
      if (realisasiLoading) {
        return <LoadingScreen text="Loading realisasi data..." />
      }
      if (!realisasiData) {
        return <NoDataScreen text="Belum ada data realisasi. Upload PDF di admin portal." />
      }
      return <Realisasi data={realisasiData} />
    }
    
    if (currentPage === 0) {
      // Dashboard overview
      if (nplLoading) {
        return <LoadingScreen text="Loading NPL data..." />
      }
      if (!nplData) {
        return <NoDataScreen text="Belum ada data NPL. Upload PDF di admin portal." />
      }
      return <Dashboard data={nplData} metadata={nplMetadata} />
    }
    
    // Kanwil detail pages (1-9)
    if (currentPage >= 1 && currentPage <= 9) {
      if (nplLoading) {
        return <LoadingScreen text="Loading kanwil data..." />
      }
      if (!nplData) {
        return <NoDataScreen text="Belum ada data NPL. Upload PDF di admin portal." />
      }
      return <KanwilDetail data={nplData} kanwilIndex={currentPage} />
    }
    
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Invalid page</div>
  }
  
  return (
    <main className="relative">
      {/* Page content */}
      <div className="transition-all duration-500">
        {renderPage()}
      </div>
      
      {/* Progress indicator */}
      <ProgressIndicator currentPage={currentPage} pageName={pageName()} />
      
      {/* Auto-slide indicator */}
      <AutoSlideIndicator isPaused={isPaused} countdown={countdown} />
      
      {/* Data refresh indicator */}
      <DataRefreshIndicator metadata={nplMetadata} />
    </main>
  )
}

// Loading screen component
function LoadingScreen({ text }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-orange-200 border-t-primary rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">📊</span>
        </div>
      </div>
      <div className="mt-6 text-2xl text-gray-700">{text}</div>
    </div>
  )
}

// No data screen component
function NoDataScreen({ text }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-8xl mb-6">📂</div>
      <div className="text-3xl text-gray-700 mb-4">{text}</div>
      <div className="text-gray-600 text-center max-w-md bg-white/60 p-6 rounded-lg">
        <p className="mb-4 font-semibold">Untuk menampilkan data:</p>
        <ol className="text-left list-decimal list-inside space-y-2">
          <li>Buka admin portal (port 3000)</li>
          <li>Upload 3 PDF files</li>
          <li>Tunggu proses selesai</li>
          <li>Dashboard akan auto-refresh</li>
        </ol>
      </div>
    </div>
  )
}

// Data refresh indicator
function DataRefreshIndicator({ metadata }) {
  if (!metadata) return null
  
  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('id-ID', { 
      timeZone: 'Asia/Jakarta',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  return (
    <div className="fixed bottom-8 left-8 z-40 bg-white/95 backdrop-blur-sm border border-gray-300 px-3 py-2 rounded-lg text-xs shadow-lg">
      <div className="flex items-center gap-2 text-gray-700">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span>Last update: {formatTime(metadata.uploadDate)}</span>
      </div>
    </div>
  )
}

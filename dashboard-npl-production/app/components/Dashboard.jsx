'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Image from 'next/image'

export default function Dashboard({ data, metadata }) {
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-2xl text-gray-700">Loading data...</div>
        </div>
      </div>
    )
  }
  
  const { totalNasional, kanwilData } = data
  
  // Format currency
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID').format(num)
  }
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }
  
  return (
    <div className="min-h-screen p-8 fade-in bg-white">
      {/* Header with Logos */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* BTN Logo */}
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/BTN_2024.svg/1280px-BTN_2024.svg.png" 
            alt="BTN Logo" 
            className="h-16 object-contain"
          />
          {/* Danantara Logo */}
          <img 
            src="https://putrawijayakusumasakti.co.id/images/logo/danantara.webp" 
            alt="Danantara Logo" 
            className="h-16 object-contain"
          />
        </div>
        
        <div className="text-right">
          <h1 className="text-4xl font-bold text-primary mb-1">
            NPL KREDIT UMKM DASHBOARD
          </h1>
          <div className="flex items-center justify-end gap-6 text-gray-600 text-sm">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>Data Per: {formatDate(metadata?.uploadDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🕐</span>
              <span>Updated: {new Date(metadata?.uploadDate).toLocaleTimeString('id-ID')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-600">Live</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Total Nasional */}
      {totalNasional && (
        <div className="bg-white border-2 border-primary rounded-xl p-6 mb-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-primary">
            🎯 TOTAL NASIONAL
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
              <div className="text-gray-600 text-sm mb-1 font-medium">Total NPL</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                Rp {formatCurrency(totalNasional.total)}
              </div>
              <div className="text-xl text-primary font-semibold">
                {totalNasional.totalPercent.toFixed(2)}%
              </div>
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
              <div className="text-gray-600 text-sm mb-1 font-medium">KUMK</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                Rp {formatCurrency(totalNasional.kumk)}
              </div>
              <div className="text-lg text-blue-600 font-semibold">
                {totalNasional.kumkPercent.toFixed(2)}%
              </div>
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
              <div className="text-gray-600 text-sm mb-1 font-medium">KUR</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                Rp {formatCurrency(totalNasional.kur)}
              </div>
              <div className="text-lg text-blue-600 font-semibold">
                {totalNasional.kurPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* NPL Per Kanwil Chart */}
      {kanwilData && kanwilData.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📊 NPL PER KANWIL
          </h2>
          
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={kanwilData}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                type="number" 
                stroke="#6B7280"
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#6B7280"
                width={90}
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #1976D2',
                  borderRadius: '8px',
                  color: '#1F2937',
                  padding: '12px'
                }}
                formatter={(value, name) => {
                  if (name === 'totalPercent') return `${value.toFixed(2)}%`
                  return `Rp ${formatCurrency(value)} Jt`
                }}
                labelStyle={{ color: '#1976D2', fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Bar 
                dataKey="totalPercent" 
                fill="#1976D2" 
                name="NPL %"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Navigation hint */}
          <div className="mt-6 text-center text-gray-500 text-sm border-t pt-4">
            <p>Tekan → untuk melihat detail kanwil | Tekan ← untuk lihat realisasi</p>
          </div>
        </div>
      )}
    </div>
  )
}

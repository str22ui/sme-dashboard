'use client'
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function KanwilDetail({ kanwilIndex, dataType = 'npl' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Fetch dari API route yang akan kita buat
        const res = await fetch(`/api/data?type=${dataType}`)
        
        if (!res.ok) {
          throw new Error('Failed to fetch data')
        }
        
        const json = await res.json()
        setData(json)
        setError(null)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [dataType])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  if (!data || !data.kanwilData || !data.cabangData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  const currentKanwil = kanwilNames[kanwilIndex - 1]
  
  // Safe access to kanwilData and cabangData
  const kanwilSummary = (data.kanwilData || []).find(k => k?.name === currentKanwil)
  const cabangList = (data.cabangData || []).filter(c => c?.kanwil === currentKanwil)
  
  if (!kanwilSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Kanwil "{currentKanwil}" not found</p>
          <p className="text-sm text-gray-400">Available kanwil: {(data.kanwilData || []).map(k => k?.name).join(', ')}</p>
        </div>
      </div>
    )
  }
  
  // Use data with both periods - with safe fallbacks
  const cabangWithData = cabangList.map(c => ({
    name: c?.name || 'Unknown',
    // Januari
    kumk: c?.kumk_jan ?? c?.kumk ?? 0,
    kumkPercent: c?.kumkPercent_jan ?? c?.kumkPercent ?? 0,
    kur: c?.kur_jan ?? c?.kur ?? 0,
    kurPercent: c?.kurPercent_jan ?? c?.kurPercent ?? 0,
    total: c?.total_jan ?? c?.total ?? 0,
    totalPercent: c?.totalPercent_jan ?? c?.totalPercent ?? 0,
    // Desember
    total_des: c?.total_des ?? c?.total ?? 0,
    kumk_des: c?.kumk_des ?? c?.kumk ?? 0,
    kur_des: c?.kur_des ?? c?.kur ?? 0,
  }))
  
  // Sort by total NPL descending
  const sortedCabang = [...cabangWithData].sort((a, b) => b.total - a.total)
  
  // Top 5 for chart
  const top5 = sortedCabang.slice(0, 5)
  
  // Prepare data for multi-line chart
  const chartData = top5.map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
    fullName: c.name,
    // Januari
    'Total NPL (Jan)': c.total,
    'KUMK (Jan)': c.kumk,
    'KUR (Jan)': c.kur,
    // Desember
    'Total NPL (Des)': c.total_des,
    'KUMK (Des)': c.kumk_des,
    'KUR (Des)': c.kur_des,
  }))
  
  const formatCurrency = (num) => new Intl.NumberFormat('id-ID').format(Math.round(num))
  
  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-blue-600">KANWIL {currentKanwil.toUpperCase()}</h1>
        <div className="text-sm text-gray-500">
          Data Type: <span className="font-semibold text-blue-600">{dataType.toUpperCase()}</span>
        </div>
      </div>
      
      {/* Summary Cards with Comparison */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Summary {currentKanwil}</h2>
        <div className="grid grid-cols-3 gap-4">
          {/* Total NPL */}
          <div className="border-l-4 border-blue-600 bg-white p-4 shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">Σ</span>
              </div>
              <div className="text-sm font-bold text-gray-700">Total NPL</div>
            </div>
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Jan 2026</div>
              <div className="text-2xl font-bold text-gray-900">
                Rp {formatCurrency(kanwilSummary?.total_jan ?? 0)}
              </div>
              <div className="text-lg text-blue-600 font-bold">
                {(kanwilSummary?.totalPercent_jan ?? 0).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Des 2025</div>
              <div className="text-xl font-bold text-gray-700">
                Rp {formatCurrency(kanwilSummary?.total_des ?? 0)}
              </div>
              <div className="text-sm text-gray-600 font-semibold">
                {(kanwilSummary?.totalPercent_des ?? 0).toFixed(2)}%
              </div>
            </div>
          </div>
          
          {/* KUMK */}
          <div className="border-l-4 border-green-500 bg-white p-4 shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-green-600">K</span>
              </div>
              <div className="text-sm font-bold text-gray-700">KUMK</div>
            </div>
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Jan 2026</div>
              <div className="text-2xl font-bold text-gray-900">
                Rp {formatCurrency(kanwilSummary?.kumk_jan ?? 0)}
              </div>
              <div className="text-lg text-green-600 font-bold">
                {(kanwilSummary?.kumkPercent_jan ?? 0).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Des 2025</div>
              <div className="text-xl font-bold text-gray-700">
                Rp {formatCurrency(kanwilSummary?.kumk_des ?? 0)}
              </div>
              <div className="text-sm text-gray-600 font-semibold">
                {(kanwilSummary?.kumkPercent_des ?? 0).toFixed(2)}%
              </div>
            </div>
          </div>
          
          {/* KUR */}
          <div className="border-l-4 border-orange-500 bg-white p-4 shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-orange-600">R</span>
              </div>
              <div className="text-sm font-bold text-gray-700">KUR</div>
            </div>
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Jan 2026</div>
              <div className="text-2xl font-bold text-gray-900">
                Rp {formatCurrency(kanwilSummary?.kur_jan ?? 0)}
              </div>
              <div className="text-lg text-orange-600 font-bold">
                {(kanwilSummary?.kurPercent_jan ?? 0).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Des 2025</div>
              <div className="text-xl font-bold text-gray-700">
                Rp {formatCurrency(kanwilSummary?.kur_des ?? 0)}
              </div>
              <div className="text-sm text-gray-600 font-semibold">
                {(kanwilSummary?.kurPercent_des ?? 0).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Table (30%) + Chart (70%) */}
      <div className="grid grid-cols-[30%_70%] gap-4">
        {/* Left: Table (30%) */}
        <div className="bg-white border shadow overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="text-sm font-semibold">Detail Per Cabang ({sortedCabang.length})</h2>
          </div>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-blue-600 text-white">
                <tr>
                  <th className="py-2 px-2 text-left">No</th>
                  <th className="py-2 px-2 text-left">Cabang</th>
                  <th className="py-2 px-2 text-right">NPL (Jt)</th>
                  <th className="py-2 px-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {sortedCabang.map((c, i) => (
                  <tr key={i} className="border-b hover:bg-blue-50">
                    <td className="py-2 px-2">{i+1}</td>
                    <td className="py-2 px-2 font-medium">{c.name}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(c.total)}</td>
                    <td className={`py-2 px-2 text-right font-semibold ${
                      c.totalPercent > 5 ? 'text-red-600' :
                      c.totalPercent > 3 ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>{c.totalPercent.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Right: Chart (70%) */}
        <div className="bg-white border shadow p-5">
          <h2 className="text-lg font-semibold mb-4">Top 5 Cabang NPL Tertinggi - Perbandingan Periode</h2>
          <ResponsiveContainer width="100%" height={450}>
            <LineChart
              data={chartData}
              margin={{ top: 30, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                stroke="#6B7280"
                angle={-45}
                textAnchor="end"
                height={100}
                style={{ fontSize: '11px' }}
              />
              <YAxis 
                stroke="#6B7280"
                tickFormatter={(value) => formatCurrency(value)}
                style={{ fontSize: '11px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #9CA3AF',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                formatter={(value, name) => [`Rp ${formatCurrency(value)} Jt`, name]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName
                  }
                  return label
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ paddingBottom: '20px' }}
              />
              
              {/* Januari - Solid Lines */}
              <Line 
                type="monotone"
                dataKey="Total NPL (Jan)" 
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5 }}
                activeDot={{ r: 7 }}
              />
              
              <Line 
                type="monotone"
                dataKey="KUMK (Jan)" 
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', r: 5 }}
                activeDot={{ r: 7 }}
              />
              
              <Line 
                type="monotone"
                dataKey="KUR (Jan)" 
                stroke="#F97316"
                strokeWidth={3}
                dot={{ fill: '#F97316', r: 5 }}
                activeDot={{ r: 7 }}
              />
              
              {/* Desember - Dashed Lines */}
              <Line 
                type="monotone"
                dataKey="Total NPL (Des)" 
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#3B82F6' }}
                activeDot={{ r: 6 }}
              />
              
              <Line 
                type="monotone"
                dataKey="KUMK (Des)" 
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#10B981' }}
                activeDot={{ r: 6 }}
              />
              
              <Line 
                type="monotone"
                dataKey="KUR (Des)" 
                stroke="#F97316"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#F97316' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Custom Legend */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-gray-600 mb-2">13 Jan 2026 (Solid)</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-blue-500 rounded"></div>
                    <span className="text-xs font-medium text-gray-700">Total NPL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-green-500 rounded"></div>
                    <span className="text-xs font-medium text-gray-700">KUMK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-orange-500 rounded"></div>
                    <span className="text-xs font-medium text-gray-700">KUR</span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-xs font-bold text-gray-600 mb-2">13 Des 2025 (Dashed)</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg width="32" height="4">
                      <line x1="0" y1="2" x2="32" y2="2" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4"/>
                    </svg>
                    <span className="text-xs font-medium text-gray-700">Total NPL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="32" height="4">
                      <line x1="0" y1="2" x2="32" y2="2" stroke="#10B981" strokeWidth="2" strokeDasharray="4 4"/>
                    </svg>
                    <span className="text-xs font-medium text-gray-700">KUMK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="32" height="4">
                      <line x1="0" y1="2" x2="32" y2="2" stroke="#F97316" strokeWidth="2" strokeDasharray="4 4"/>
                    </svg>
                    <span className="text-xs font-medium text-gray-700">KUR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
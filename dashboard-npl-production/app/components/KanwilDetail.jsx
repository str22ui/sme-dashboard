'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function KanwilDetail({ data, kanwilIndex }) {
  if (!data || !data.kanwilData || !data.cabangData) {
    return <div className="min-h-screen flex items-center justify-center text-gray-700 bg-white">Loading...</div>
  }
  
  const kanwilNames = [
    'Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus',
    'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2'
  ]
  
  const currentKanwil = kanwilNames[kanwilIndex - 1]
  const kanwilSummary = data.kanwilData.find(k => k.name === currentKanwil)
  const cabangList = data.cabangData.filter(c => c.kanwil === currentKanwil)
  
  // Sort by total NPL descending
  const sortedCabang = [...cabangList].sort((a, b) => b.total - a.total)
  
  // Top 5 for chart
  const top5 = sortedCabang.slice(0, 5)
  
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID').format(num)
  }
  
  return (
    <div className="min-h-screen p-8 fade-in bg-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">
              KANWIL {currentKanwil.toUpperCase()}
            </h1>
            <p className="text-gray-600">Detail NPL per cabang</p>
          </div>
          
          {/* Navigation arrows */}
          <div className="flex gap-4 text-gray-600">
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
              <span>◀</span>
              <span className="text-sm">
                {kanwilIndex === 1 ? 'Dashboard' : kanwilNames[kanwilIndex - 2]}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
              <span className="text-sm">
                {kanwilIndex === 9 ? 'Dashboard' : kanwilNames[kanwilIndex]}
              </span>
              <span>▶</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Kanwil Summary */}
      {kanwilSummary && (
        <div className="bg-blue-50 border-2 border-primary rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3 text-primary">Summary {currentKanwil}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="text-gray-600 text-xs mb-1 font-medium">Total NPL</div>
              <div className="text-2xl font-bold text-gray-900">
                Rp {formatCurrency(kanwilSummary.total)}
              </div>
              <div className="text-lg text-primary font-semibold">
                {kanwilSummary.totalPercent.toFixed(2)}%
              </div>
            </div>
            
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="text-gray-600 text-xs mb-1 font-medium">KUMK</div>
              <div className="text-xl font-bold text-gray-900">
                Rp {formatCurrency(kanwilSummary.kumk)}
              </div>
              <div className="text-sm text-blue-600 font-semibold">
                {kanwilSummary.kumkPercent.toFixed(2)}%
              </div>
            </div>
            
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="text-gray-600 text-xs mb-1 font-medium">KUR</div>
              <div className="text-xl font-bold text-gray-900">
                Rp {formatCurrency(kanwilSummary.kur)}
              </div>
              <div className="text-sm text-blue-600 font-semibold">
                {kanwilSummary.kurPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cabang Table & Chart */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Table */}
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b-2 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Detail Per Cabang ({sortedCabang.length} cabang)
            </h2>
          </div>
          
          <div className="overflow-auto max-h-[500px] custom-scrollbar">
            <table className="w-full">
              <thead className="sticky top-0 bg-primary text-white">
                <tr className="text-left text-sm">
                  <th className="py-3 px-4 font-semibold">No</th>
                  <th className="py-3 px-4 font-semibold">Cabang</th>
                  <th className="py-3 px-4 text-right font-semibold">NPL (Jt)</th>
                  <th className="py-3 px-4 text-right font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="text-sm bg-white">
                {sortedCabang.map((cabang, idx) => (
                  <tr 
                    key={idx}
                    className="border-b border-gray-200 hover:bg-blue-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-600">{idx + 1}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{cabang.name}</td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(cabang.total)}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      cabang.totalPercent > 5 ? 'text-red-600' :
                      cabang.totalPercent > 3 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {cabang.totalPercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Right: Chart */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Top 5 Cabang NPL Tertinggi
          </h2>
          
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={top5}
              layout="horizontal"
              margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                type="category" 
                dataKey="name" 
                stroke="#6B7280"
                angle={-45}
                textAnchor="end"
                height={100}
                style={{ fontSize: '11px' }}
              />
              <YAxis 
                type="number" 
                stroke="#6B7280"
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                style={{ fontSize: '11px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #1976D2',
                  borderRadius: '8px',
                  color: '#1F2937'
                }}
                formatter={(value, name) => {
                  if (name === 'totalPercent') return `${value.toFixed(2)}%`
                  return `Rp ${formatCurrency(value)} Jt`
                }}
              />
              <Bar 
                dataKey="totalPercent" 
                fill="#1976D2" 
                name="NPL %"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Navigation hint */}
      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>Tekan ← → untuk navigasi antar kanwil</p>
      </div>
    </div>
  )
}

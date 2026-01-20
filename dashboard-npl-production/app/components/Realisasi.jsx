'use client'

import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Realisasi({ data }) {
  const [activeView, setActiveView] = useState('total') // 'total', 'kur', 'kumk'
  
  if (!data || !data.dailyData) {
    return <div className="min-h-screen flex items-center justify-center text-gray-700 bg-white">Loading...</div>
  }
  
  const { dailyData, monthlyTotals } = data
  
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(num)
  }
  
  // Prepare comparison data
  const maxDay = Math.min(dailyData.length, 31)
  const comparisonData = []
  
  for (let day = 1; day <= maxDay; day++) {
    const janData = dailyData.find(d => d.date === day)
    comparisonData.push({
      date: day,
      janTotal: janData?.total || 0,
      janKur: janData?.kur || 0,
      janKumk: janData?.kumk || 0,
      decTotal: 0, // Mock - in production, get from Dec data
      decKur: 0,
      decKumk: 0,
    })
  }
  
  // Calculate growth
  const janTotal = dailyData.reduce((sum, day) => sum + day.total, 0)
  const decPartial = monthlyTotals?.dec ? (monthlyTotals.dec / 31) * maxDay : 0
  const growth = decPartial > 0 ? ((janTotal - decPartial) / decPartial * 100) : 0
  
  return (
    <div className="min-h-screen p-8 fade-in bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">
          REALISASI KREDIT SME HARIAN
        </h1>
        <p className="text-gray-600 text-lg">
          Perbandingan s.d. {maxDay} Desember 2025 vs {maxDay} Januari 2026
        </p>
      </div>
      
      {/* Monthly Summary */}
      {monthlyTotals && (
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-5">
            <div className="text-purple-700 text-sm mb-1 font-medium">Desember 2025</div>
            <div className="text-3xl font-bold text-purple-900">
              Rp {formatCurrency(monthlyTotals.dec)} Jt
            </div>
            <div className="text-xs text-purple-600 mt-1">Full Month</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-primary rounded-xl p-5">
            <div className="text-primary text-sm mb-1 font-medium">Januari 2026</div>
            <div className="text-3xl font-bold text-blue-900">
              Rp {formatCurrency(janTotal)} Jt
            </div>
            <div className="text-xs text-blue-600 mt-1">s.d. tanggal {maxDay}</div>
          </div>
          
          <div className={`bg-gradient-to-br rounded-xl p-5 border-2 ${
            growth >= 0 
              ? 'from-green-50 to-green-100 border-green-300' 
              : 'from-red-50 to-red-100 border-red-300'
          }`}>
            <div className={`text-sm mb-1 font-medium ${growth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              Pertumbuhan
            </div>
            <div className={`text-3xl font-bold ${growth >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">vs Desember MTD</div>
          </div>
        </div>
      )}
      
      {/* Tabbed Comparison Chart */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            📈 Perbandingan Desember vs Januari
          </h2>
          
          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveView('total')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'total'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Total Realisasi
            </button>
            <button
              onClick={() => setActiveView('kur')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'kur'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              KUR
            </button>
            <button
              onClick={() => setActiveView('kumk')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'kumk'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              KUMK
            </button>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={comparisonData}
            margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              stroke="#6B7280"
              label={{ value: 'Tanggal', position: 'insideBottom', offset: -5, fill: '#6B7280' }}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              tickFormatter={(value) => formatCurrency(value)}
              label={{ value: 'Realisasi (Jt)', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
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
              formatter={(value) => `Rp ${formatCurrency(value)} Jt`}
              labelFormatter={(label) => `Tanggal ${label}`}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            {/* Conditional rendering based on active tab */}
            {activeView === 'total' && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="janTotal" 
                  stroke="#1976D2" 
                  strokeWidth={3}
                  name="Januari 2026"
                  dot={{ fill: '#1976D2', r: 5 }}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="decTotal" 
                  stroke="#9333EA" 
                  strokeWidth={3}
                  name="Desember 2025"
                  dot={{ fill: '#9333EA', r: 5 }}
                  strokeDasharray="5 5"
                />
              </>
            )}
            
            {activeView === 'kur' && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="janKur" 
                  stroke="#1976D2" 
                  strokeWidth={3}
                  name="KUR Januari"
                  dot={{ fill: '#1976D2', r: 5 }}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="decKur" 
                  stroke="#9333EA" 
                  strokeWidth={3}
                  name="KUR Desember"
                  dot={{ fill: '#9333EA', r: 5 }}
                  strokeDasharray="5 5"
                />
              </>
            )}
            
            {activeView === 'kumk' && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="janKumk" 
                  stroke="#1976D2" 
                  strokeWidth={3}
                  name="KUMK Januari"
                  dot={{ fill: '#1976D2', r: 5 }}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="decKumk" 
                  stroke="#9333EA" 
                  strokeWidth={3}
                  name="KUMK Desember"
                  dot={{ fill: '#9333EA', r: 5 }}
                  strokeDasharray="5 5"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Daily Table */}
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b-2 border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            📅 Realisasi Per Hari - Januari 2026
          </h2>
        </div>
        
        <div className="overflow-auto max-h-[400px] custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-primary text-white">
              <tr className="text-left text-sm">
                <th className="py-3 px-4 font-semibold">Tanggal</th>
                <th className="py-3 px-4 text-right font-semibold">KUR</th>
                <th className="py-3 px-4 text-right font-semibold">KUMK</th>
                <th className="py-3 px-4 text-right font-semibold">SME Swadana</th>
                <th className="py-3 px-4 text-right font-semibold">Total</th>
                <th className="py-3 px-4 text-center font-semibold">Trend</th>
              </tr>
            </thead>
            <tbody className="text-sm bg-white">
              {dailyData.map((day, idx) => {
                const prevDay = idx > 0 ? dailyData[idx - 1] : null
                const diff = prevDay ? day.total - prevDay.total : 0
                const isUp = diff > 0
                
                return (
                  <tr 
                    key={idx}
                    className="border-b border-gray-200 hover:bg-blue-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-primary font-semibold">
                      {day.date} Jan
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(day.kur)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(day.kumk)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(day.smeSwadana)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 font-bold">
                      {formatCurrency(day.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {idx === 0 ? (
                        <span className="text-gray-400">-</span>
                      ) : isUp ? (
                        <span className="text-green-600 font-bold">↑ {formatCurrency(Math.abs(diff))}</span>
                      ) : diff < 0 ? (
                        <span className="text-red-600 font-bold">↓ {formatCurrency(Math.abs(diff))}</span>
                      ) : (
                        <span className="text-gray-500">→</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Navigation hint */}
      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>Tekan → untuk kembali ke Dashboard</p>
      </div>
    </div>
  )
}

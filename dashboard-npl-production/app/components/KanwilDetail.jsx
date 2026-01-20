'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function KanwilDetail({ data, kanwilIndex }) {
  if (!data || !data.kanwilData || !data.cabangData) {
    return <div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>
  }
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  const currentKanwil = kanwilNames[kanwilIndex - 1]
  const kanwilSummary = data.kanwilData.find(k => k.name === currentKanwil)
  const cabangList = data.cabangData.filter(c => c.kanwil === currentKanwil)
  
  // Use data with both periods
  const cabangWithData = cabangList.map(c => ({
    name: c.name,
    // Januari
    kumk: c.kumk_jan || c.kumk,
    kumkPercent: c.kumkPercent_jan || c.kumkPercent,
    kur: c.kur_jan || c.kur,
    kurPercent: c.kurPercent_jan || c.kurPercent,
    total: c.total_jan || c.total,
    totalPercent: c.totalPercent_jan || c.totalPercent,
    // Desember
    total_des: c.total_des || c.total,
    kumk_des: c.kumk_des || c.kumk,
    kur_des: c.kur_des || c.kur,
  }))
  
  // Sort by total NPL descending
  const sortedCabang = [...cabangWithData].sort((a, b) => b.total - a.total)
  
  // Top 5 for chart
  const top5 = sortedCabang.slice(0, 5)
  
  // Prepare data for multi-line chart (Total NPL, KUMK, KUR)
  const chartData = top5.map(c => ({
    name: c.name,
    // Januari
    total_jan: c.total,
    kumk_jan: c.kumk,
    kur_jan: c.kur,
    // Desember
    total_des: c.total_des,
    kumk_des: c.kumk_des,
    kur_des: c.kur_des,
  }))
  
  const formatCurrency = (num) => new Intl.NumberFormat('id-ID').format(num)
  
  const renderValueLabel = (fill, position = 'top') => 
    ({ x, y, value }) => {
      if (value === 0 || value == null) return null

      const offsetY = position === 'top' ? -22 : 10

      return (
        <g>
          <rect
            x={x - 24}
            y={y + offsetY}
            width={48}
            height={16}
            rx={4}
            fill={fill}
          />
          <text
            x={x}
            y={y + offsetY + 12}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            fontWeight={600}
          >
            {formatCurrency(value)}
          </text>
        </g>
      )
    }
  
  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">KANWIL {currentKanwil.toUpperCase()}</h1>
      
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
                Rp {formatCurrency(kanwilSummary.total_jan || kanwilSummary.total)}
              </div>
              <div className="text-lg text-blue-600 font-bold">
                {(kanwilSummary.totalPercent_jan || kanwilSummary.totalPercent).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Des 2025</div>
              <div className="text-xl font-bold text-gray-700">
                Rp {formatCurrency(kanwilSummary.total_des || kanwilSummary.total)}
              </div>
              <div className="text-sm text-gray-600 font-semibold">
                {(kanwilSummary.totalPercent_des || kanwilSummary.totalPercent).toFixed(2)}%
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
                Rp {formatCurrency(kanwilSummary.kumk_jan || kanwilSummary.kumk)}
              </div>
              <div className="text-lg text-green-600 font-bold">
                {(kanwilSummary.kumkPercent_jan || kanwilSummary.kumkPercent).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Des 2025</div>
              <div className="text-xl font-bold text-gray-700">
                Rp {formatCurrency(kanwilSummary.kumk_des || kanwilSummary.kumk)}
              </div>
              <div className="text-sm text-gray-600 font-semibold">
                {(kanwilSummary.kumkPercent_des || kanwilSummary.kumkPercent).toFixed(2)}%
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
                Rp {formatCurrency(kanwilSummary.kur_jan || kanwilSummary.kur)}
              </div>
              <div className="text-lg text-orange-600 font-bold">
                {(kanwilSummary.kurPercent_jan || kanwilSummary.kurPercent).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium">13 Des 2025</div>
              <div className="text-xl font-bold text-gray-700">
                Rp {formatCurrency(kanwilSummary.kur_des || kanwilSummary.kur)}
              </div>
              <div className="text-sm text-gray-600 font-semibold">
                {(kanwilSummary.kurPercent_des || kanwilSummary.kurPercent).toFixed(2)}%
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
                  <th className="py-2 px-2 text-right">NPL</th>
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
              margin={{ top: 30, right: 30, left: 10, bottom: 60 }}
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
                tickFormatter={(value) => formatCurrency(value)}
                style={{ fontSize: '11px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #9CA3AF',
                  borderRadius: '8px',
                  color: '#1F2937'
                }}
                formatter={(value, name) => {
                  const labels = {
                    total_jan: 'Total NPL (Jan)',
                    kumk_jan: 'KUMK (Jan)',
                    kur_jan: 'KUR (Jan)',
                    total_des: 'Total NPL (Des)',
                    kumk_des: 'KUMK (Des)',
                    kur_des: 'KUR (Des)',
                  }
                  return [`Rp ${formatCurrency(value)} Jt`, labels[name] || name]
                }}
              />
              
              {/* Total NPL - Januari (Blue Solid) */}
              <Line 
                type="monotone"
                dataKey="total_jan" 
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5 }}
                activeDot={{ r: 7 }}
                name="total_jan"
                label={renderValueLabel('#3B82F6', 'top')}
              />
              
              {/* Total NPL - Desember (Blue Dotted) */}
              <Line 
                type="monotone"
                dataKey="total_des" 
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="2 4"
                dot={{ fill: '#fff', r: 5, strokeWidth: 2, stroke: '#3B82F6' }}
                activeDot={{ r: 7 }}
                name="total_des"
                label={renderValueLabel('#60A5FA', 'bottom')}
              />
              
              {/* KUMK - Januari (Green Solid) */}
              <Line 
                type="monotone"
                dataKey="kumk_jan" 
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', r: 5 }}
                activeDot={{ r: 7 }}
                name="kumk_jan"
                label={renderValueLabel('#10B981', 'top')}
              />
              
              {/* KUMK - Desember (Green Dotted) */}
              <Line 
                type="monotone"
                dataKey="kumk_des" 
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="2 4"
                dot={{ fill: '#fff', r: 5, strokeWidth: 2, stroke: '#10B981' }}
                activeDot={{ r: 7 }}
                name="kumk_des"
              />
              
              {/* KUR - Januari (Orange Solid) */}
              <Line 
                type="monotone"
                dataKey="kur_jan" 
                stroke="#F97316"
                strokeWidth={3}
                dot={{ fill: '#F97316', r: 5 }}
                activeDot={{ r: 7 }}
                name="kur_jan"
                label={renderValueLabel('#F97316', 'top')}
              />
              
              {/* KUR - Desember (Orange Dotted) */}
              <Line 
                type="monotone"
                dataKey="kur_des" 
                stroke="#F97316"
                strokeWidth={2}
                strokeDasharray="2 4"
                dot={{ fill: '#fff', r: 5, strokeWidth: 2, stroke: '#F97316' }}
                activeDot={{ r: 7 }}
                name="kur_des"
              />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-gray-600 mb-2">13 Jan 2026 (Solid)</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-blue-500"></div>
                    <span className="text-xs font-medium text-gray-700">Total NPL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-green-500"></div>
                    <span className="text-xs font-medium text-gray-700">KUMK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-orange-500"></div>
                    <span className="text-xs font-medium text-gray-700">KUR</span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-xs font-bold text-gray-600 mb-2">13 Des 2025 (Dotted)</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2">
                      <line x1="0" y1="1" x2="32" y2="1" stroke="#3B82F6" strokeWidth="2" strokeDasharray="2 4"/>
                    </svg>
                    <span className="text-xs font-medium text-gray-700">Total NPL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2">
                      <line x1="0" y1="1" x2="32" y2="1" stroke="#10B981" strokeWidth="2" strokeDasharray="2 4"/>
                    </svg>
                    <span className="text-xs font-medium text-gray-700">KUMK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2">
                      <line x1="0" y1="1" x2="32" y2="1" stroke="#F97316" strokeWidth="2" strokeDasharray="2 4"/>
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
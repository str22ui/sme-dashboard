'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function KanwilDetail({ data, kanwilIndex }) {
  if (!data || !data.kanwilData || !data.cabangData) {
    return <div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>
  }
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  const currentKanwil = kanwilNames[kanwilIndex - 1]
  const kanwilSummary = data.kanwilData.find(k => k.name === currentKanwil)
  const cabangList = data.cabangData.filter(c => c.kanwil === currentKanwil)
  
  // Sort by total NPL descending
  const sortedCabang = [...cabangList].sort((a, b) => b.total - a.total)
  
  // Mock previous month (13 Des 2025) - same values for demo
  const prevMonth = {
    total: kanwilSummary.total * 1.05,
    kumk: kanwilSummary.kumk * 1.03,
    kur: kanwilSummary.kur * 1.07,
    totalPercent: kanwilSummary.totalPercent * 1.05,
    kumkPercent: kanwilSummary.kumkPercent * 1.03,
    kurPercent: kanwilSummary.kurPercent * 1.07
  }
  
  // Comparison data for line chart
  const comparisonData = [
    { month: 'Des', total: prevMonth.totalPercent, kumk: prevMonth.kumkPercent, kur: prevMonth.kurPercent },
    { month: 'Jan', total: kanwilSummary.totalPercent, kumk: kanwilSummary.kumkPercent, kur: kanwilSummary.kurPercent }
  ]
  
  const formatCurrency = (num) => new Intl.NumberFormat('id-ID').format(num)
  
  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">KANWIL {currentKanwil.toUpperCase()}</h1>
      
      {/* Summary Cards with Comparison */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Summary {currentKanwil}</h2>
        <div className="grid grid-cols-3 gap-4">
          {/* Total NPL */}
          <div className="border-l-4 border-blue-600 bg-white p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">Total NPL</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs text-gray-500">13 Jan 2026</span>
              <span className="text-2xl font-bold">Rp {formatCurrency(kanwilSummary.total)}</span>
              <span className="text-blue-600 font-semibold">{kanwilSummary.totalPercent.toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500">13 Des 2025</span>
              <span className="text-lg text-gray-600">Rp {formatCurrency(prevMonth.total)}</span>
              <span className="text-gray-500">{prevMonth.totalPercent.toFixed(2)}%</span>
            </div>
          </div>
          
          {/* KUMK */}
          <div className="border-l-4 border-green-500 bg-white p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">KUMK</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs text-gray-500">13 Jan 2026</span>
              <span className="text-2xl font-bold">Rp {formatCurrency(kanwilSummary.kumk)}</span>
              <span className="text-green-600 font-semibold">{kanwilSummary.kumkPercent.toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500">13 Des 2025</span>
              <span className="text-lg text-gray-600">Rp {formatCurrency(prevMonth.kumk)}</span>
              <span className="text-gray-500">{prevMonth.kumkPercent.toFixed(2)}%</span>
            </div>
          </div>
          
          {/* KUR */}
          <div className="border-l-4 border-orange-500 bg-white p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">KUR</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs text-gray-500">13 Jan 2026</span>
              <span className="text-2xl font-bold">Rp {formatCurrency(kanwilSummary.kur)}</span>
              <span className="text-orange-600 font-semibold">{kanwilSummary.kurPercent.toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500">13 Des 2025</span>
              <span className="text-lg text-gray-600">Rp {formatCurrency(prevMonth.kur)}</span>
              <span className="text-gray-500">{prevMonth.kurPercent.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Line Chart Comparison */}
      <div className="bg-white border shadow p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Top 5 Cabang NPL Tertinggi - Perbandingan Periode</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(val) => `${val.toFixed(2)}%`} />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#1976D2" strokeWidth={2} name="Total NPL" />
            <Line type="monotone" dataKey="kumk" stroke="#22C55E" strokeWidth={2} name="KUMK" />
            <Line type="monotone" dataKey="kur" stroke="#F97316" strokeWidth={2} name="KUR" />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 mt-2">13 Des 2025 (Dashed)</div>
      </div>
      
      {/* Table */}
      <div className="bg-white border shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Detail Per Cabang ({sortedCabang.length} cabang)</h2>
        </div>
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full">
            <thead className="sticky top-0 bg-blue-600 text-white">
              <tr className="text-sm">
                <th className="py-3 px-4 text-left">No</th>
                <th className="py-3 px-4 text-left">Cabang</th>
                <th className="py-3 px-4 text-right">NPL (Jt)</th>
                <th className="py-3 px-4 text-right">%</th>
                <th className="py-3 px-4 text-right">KUMK (Jt)</th>
                <th className="py-3 px-4 text-right">%</th>
                <th className="py-3 px-4 text-right">KUR (Jt)</th>
                <th className="py-3 px-4 text-right">%</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedCabang.map((c, i) => (
                <tr key={i} className="border-b hover:bg-blue-50">
                  <td className="py-3 px-4">{i+1}</td>
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(c.total)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-600">{c.totalPercent.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(c.kumk)}</td>
                  <td className="py-3 px-4 text-right text-green-600">{c.kumkPercent.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(c.kur)}</td>
                  <td className="py-3 px-4 text-right text-orange-600">{c.kurPercent.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
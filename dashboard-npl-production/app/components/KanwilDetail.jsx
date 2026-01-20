'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function KanwilDetail({ data, kanwilIndex, metadata }) {
  if (!data?.kanwilData || !data?.cabangData) {
    return <div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>
  }
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  const currentKanwil = kanwilNames[kanwilIndex - 1]
  const kanwilSummary = data.kanwilData.find(k => k.name === currentKanwil) || {}
  const cabangList = data.cabangData.filter(c => c.kanwil === currentKanwil)
  
  const sortedCabang = [...cabangList].sort((a, b) => (b.total_jan || 0) - (a.total_jan || 0))
  
  const comparisonData = [
    { month: 'Des', total: kanwilSummary.totalPercent_des || 0, kumk: kanwilSummary.kumkPercent_des || 0, kur: kanwilSummary.kurPercent_des || 0 },
    { month: 'Jan', total: kanwilSummary.totalPercent_jan || 0, kumk: kanwilSummary.kumkPercent_jan || 0, kur: kanwilSummary.kurPercent_jan || 0 }
  ]
  
  const f = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
  
  // Format tanggal dari metadata
  const uploadDate = metadata?.uploadDate ? new Date(metadata.uploadDate) : new Date()
  const janDate = uploadDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
  
  // Asumsi Des = bulan sebelumnya dengan tanggal sama
  const desDate = new Date(uploadDate)
  desDate.setMonth(desDate.getMonth() - 1)
  const desDateStr = desDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
  
  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">KANWIL {currentKanwil.toUpperCase()}</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Summary {currentKanwil}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="border-l-4 border-blue-600 bg-white p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">Total NPL</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs text-gray-500">{janDate}</span>
              <span className="text-2xl font-bold">Rp {f(kanwilSummary.total_jan)}</span>
              <span className="text-blue-600 font-semibold">{(kanwilSummary.totalPercent_jan || 0).toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500">{desDateStr}</span>
              <span className="text-lg text-gray-600">Rp {f(kanwilSummary.total_des)}</span>
              <span className="text-gray-500">{(kanwilSummary.totalPercent_des || 0).toFixed(2)}%</span>
            </div>
          </div>
          
          <div className="border-l-4 border-green-500 bg-white p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">KUMK</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs text-gray-500">{janDate}</span>
              <span className="text-2xl font-bold">Rp {f(kanwilSummary.kumk_jan)}</span>
              <span className="text-green-600 font-semibold">{(kanwilSummary.kumkPercent_jan || 0).toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500">{desDateStr}</span>
              <span className="text-lg text-gray-600">Rp {f(kanwilSummary.kumk_des)}</span>
              <span className="text-gray-500">{(kanwilSummary.kumkPercent_des || 0).toFixed(2)}%</span>
            </div>
          </div>
          
          <div className="border-l-4 border-orange-500 bg-white p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">KUR</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs text-gray-500">{janDate}</span>
              <span className="text-2xl font-bold">Rp {f(kanwilSummary.kur_jan)}</span>
              <span className="text-orange-600 font-semibold">{(kanwilSummary.kurPercent_jan || 0).toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500">{desDateStr}</span>
              <span className="text-lg text-gray-600">Rp {f(kanwilSummary.kur_des)}</span>
              <span className="text-gray-500">{(kanwilSummary.kurPercent_des || 0).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white border shadow p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Perbandingan {desDateStr} vs {janDate}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(v) => `${v.toFixed(2)}%`} />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#1976D2" strokeWidth={2} name="Total NPL" />
            <Line type="monotone" dataKey="kumk" stroke="#22C55E" strokeWidth={2} name="KUMK" />
            <Line type="monotone" dataKey="kur" stroke="#F97316" strokeWidth={2} name="KUR" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-white border shadow overflow-hidden">
        <div className="p-4 border-b"><h2 className="text-lg font-semibold">Detail Per Cabang ({sortedCabang.length})</h2></div>
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
                  <td className="py-3 px-4 text-right">{f(c.total_jan)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-600">{(c.totalPercent_jan || 0).toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right">{f(c.kumk_jan)}</td>
                  <td className="py-3 px-4 text-right text-green-600">{(c.kumkPercent_jan || 0).toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right">{f(c.kur_jan)}</td>
                  <td className="py-3 px-4 text-right text-orange-600">{(c.kurPercent_jan || 0).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
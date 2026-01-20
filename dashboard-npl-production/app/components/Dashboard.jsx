'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Image from 'next/image'

export default function Dashboard({ data, metadata }) {
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="text-2xl text-gray-700">Loading...</div></div>
  }
  
  const { totalNasional, kanwilData } = data
  
  const f = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
  
  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
  }
  
  return (
    <div className="min-h-screen p-8 fade-in bg-white">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/BTN_2024.svg/1280px-BTN_2024.svg.png" alt="BTN" className="h-16 object-contain" />
          <img src="https://putrawijayakusumasakti.co.id/images/logo/danantara.webp" alt="Danantara" className="h-16 object-contain" />
        </div>
        <div className="text-right">
          <h1 className="text-4xl font-bold text-blue-600 mb-1">NPL KREDIT UMKM DASHBOARD</h1>
          <div className="flex items-center justify-end gap-6 text-gray-600 text-sm">
            <div className="flex items-center gap-2"><span>📅</span><span>Data: {formatDate(metadata?.uploadDate)}</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span><span className="text-green-600">Live</span></div>
          </div>
        </div>
      </div>
      
      {totalNasional && (
        <div className="bg-white border-2 border-blue-600 rounded-xl p-6 mb-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">🎯 TOTAL NASIONAL</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
              <div className="text-gray-600 text-sm mb-1 font-medium">Total NPL</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">Rp {f(totalNasional.total_jan)}</div>
              <div className="text-xl text-blue-600 font-semibold">{(totalNasional.totalPercent_jan || 0).toFixed(2)}%</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
              <div className="text-gray-600 text-sm mb-1 font-medium">KUMK</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">Rp {f(totalNasional.kumk_jan)}</div>
              <div className="text-lg text-blue-600 font-semibold">{(totalNasional.kumkPercent_jan || 0).toFixed(2)}%</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
              <div className="text-gray-600 text-sm mb-1 font-medium">KUR</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">Rp {f(totalNasional.kur_jan)}</div>
              <div className="text-lg text-blue-600 font-semibold">{(totalNasional.kurPercent_jan || 0).toFixed(2)}%</div>
            </div>
          </div>
        </div>
      )}
      
      {kanwilData && kanwilData.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">📊 TREND NPL PER KANWIL</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={kanwilData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" angle={-45} textAnchor="end" height={100} style={{ fontSize: '11px' }} />
              <YAxis stroke="#6B7280" tickFormatter={(v) => `${v.toFixed(1)}%`} style={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '2px solid #1976D2', borderRadius: '8px' }} formatter={(v) => `${(v || 0).toFixed(2)}%`} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="totalPercent_jan" stroke="#1976D2" strokeWidth={3} name="NPL %" dot={{ fill: '#1976D2', r: 5 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-6 text-center text-gray-500 text-sm border-t pt-4"><p>Tekan → untuk detail | ← untuk realisasi</p></div>
        </div>
      )}
    </div>
  )
}
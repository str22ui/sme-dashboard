import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    
    const nplFile = formData.get('npl')
    const kol2File = formData.get('kol2')
    const realisasiFile = formData.get('realisasi')
    
    if (!nplFile || !kol2File || !realisasiFile) {
      return NextResponse.json(
        { error: 'All 3 PDF files are required' },
        { status: 400 }
      )
    }
    
    const uploadDate = new Date().toISOString()
    
    // For MVP: Use mock data (same structure as development)
    // TODO: Replace with real PDF parsing using pdf-parse library
    
    const mockNPLData = generateMockNPLData()
    const mockKOL2Data = generateMockKOL2Data()
    const mockRealisasiData = generateMockRealisasiData()
    
    // Upload to Vercel Blob
    await put('npl_metadata.json', JSON.stringify({
      filename: nplFile.name,
      uploadDate,
      fileSize: nplFile.size
    }), { access: 'public' })
    
    await put('npl_parsed.json', JSON.stringify(mockNPLData), { access: 'public' })
    
    await put('kol2_metadata.json', JSON.stringify({
      filename: kol2File.name,
      uploadDate,
      fileSize: kol2File.size
    }), { access: 'public' })
    
    await put('kol2_parsed.json', JSON.stringify(mockKOL2Data), { access: 'public' })
    
    await put('realisasi_metadata.json', JSON.stringify({
      filename: realisasiFile.name,
      uploadDate,
      fileSize: realisasiFile.size
    }), { access: 'public' })
    
    await put('realisasi_parsed.json', JSON.stringify(mockRealisasiData), { access: 'public' })
    
    return NextResponse.json({
      success: true,
      message: 'Files uploaded successfully',
      uploadDate
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Mock data generators (same as development)
function generateMockNPLData() {
  const kanwilList = [
    'Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus',
    'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2'
  ]
  
  const cabangByKanwil = {
    'Jakarta I': [
      { name: 'Kelapa Gading Square', total: 18512, totalPercent: 10.40 },
      { name: 'Bumi Serpong Damai', total: 14000, totalPercent: 23.46 },
      { name: 'Bintaro Jaya', total: 6502, totalPercent: 19.67 },
      { name: 'Jakarta Harmoni', total: 3008, totalPercent: 6.67 },
      { name: 'Jakarta Kebon Jeruk', total: 2407, totalPercent: 3.88 },
      { name: 'Jakarta Pluit', total: 1356, totalPercent: 2.55 },
      { name: 'Ciputat', total: 797, totalPercent: 2.36 },
      { name: 'Tangerang', total: 771, totalPercent: 0.78 }
    ],
    'Jakarta II': [
      { name: 'Bogor', total: 8234, totalPercent: 12.45 },
      { name: 'Sukabumi', total: 5678, totalPercent: 8.92 },
      { name: 'Melawai', total: 4321, totalPercent: 7.34 },
      { name: 'Depok', total: 3456, totalPercent: 5.67 },
      { name: 'Bekasi', total: 2890, totalPercent: 4.23 }
    ],
    'Jateng DIY': [
      { name: 'Yogyakarta', total: 7890, totalPercent: 11.23 },
      { name: 'Semarang', total: 6543, totalPercent: 9.87 },
      { name: 'Solo', total: 5432, totalPercent: 8.45 },
      { name: 'Purwokerto', total: 3456, totalPercent: 6.78 },
      { name: 'Magelang', total: 2345, totalPercent: 4.56 }
    ],
    'Jabanus': [
      { name: 'Surabaya', total: 9876, totalPercent: 13.45 },
      { name: 'Malang', total: 7654, totalPercent: 10.23 },
      { name: 'Denpasar', total: 6789, totalPercent: 9.12 },
      { name: 'Jember', total: 4567, totalPercent: 7.89 },
      { name: 'Sidoarjo', total: 3456, totalPercent: 5.67 }
    ],
    'Jawa Barat': [
      { name: 'Bandung', total: 8765, totalPercent: 12.34 },
      { name: 'Bandung Timur', total: 6543, totalPercent: 9.87 },
      { name: 'Cirebon', total: 5432, totalPercent: 8.45 },
      { name: 'Tasikmalaya', total: 4321, totalPercent: 7.23 },
      { name: 'Garut', total: 3210, totalPercent: 5.67 }
    ],
    'Kalimantan': [
      { name: 'Balikpapan', total: 7654, totalPercent: 10.45 },
      { name: 'Banjarmasin', total: 6543, totalPercent: 9.23 },
      { name: 'Samarinda', total: 5432, totalPercent: 8.12 },
      { name: 'Pontianak', total: 4321, totalPercent: 6.78 }
    ],
    'Sulampua': [
      { name: 'Makassar', total: 8765, totalPercent: 11.23 },
      { name: 'Manado', total: 6543, totalPercent: 9.45 },
      { name: 'Palu', total: 4321, totalPercent: 7.12 },
      { name: 'Jayapura', total: 3210, totalPercent: 5.67 }
    ],
    'Sumatera 1': [
      { name: 'Medan', total: 9876, totalPercent: 12.45 },
      { name: 'Pekanbaru', total: 7654, totalPercent: 10.23 },
      { name: 'Batam', total: 6543, totalPercent: 8.90 },
      { name: 'Padang', total: 5432, totalPercent: 7.56 }
    ],
    'Sumatera 2': [
      { name: 'Palembang', total: 8765, totalPercent: 11.34 },
      { name: 'Jambi', total: 6543, totalPercent: 9.23 },
      { name: 'Bengkulu', total: 4321, totalPercent: 7.12 },
      { name: 'Bandar Lampung', total: 3210, totalPercent: 5.45 }
    ]
  }
  
  const cabangData = []
  kanwilList.forEach(kanwil => {
    cabangByKanwil[kanwil].forEach(cabang => {
      cabangData.push({
        kanwil,
        name: cabang.name,
        total: cabang.total,
        kumk: cabang.total * 0.55,
        kur: cabang.total * 0.45,
        totalPercent: cabang.totalPercent,
        kumkPercent: cabang.totalPercent * 0.55,
        kurPercent: cabang.totalPercent * 0.45
      })
    })
  })
  
  const kanwilData = kanwilList.map(name => {
    const cabangInKanwil = cabangData.filter(c => c.kanwil === name)
    const total = cabangInKanwil.reduce((sum, c) => sum + c.total, 0)
    const kumk = cabangInKanwil.reduce((sum, c) => sum + c.kumk, 0)
    const kur = cabangInKanwil.reduce((sum, c) => sum + c.kur, 0)
    
    return {
      name,
      total,
      kumk,
      kur,
      totalPercent: total / cabangInKanwil.length,
      kumkPercent: kumk / cabangInKanwil.length,
      kurPercent: kur / cabangInKanwil.length
    }
  })
  
  const totalNasional = {
    total: cabangData.reduce((sum, c) => sum + c.total, 0),
    kumk: cabangData.reduce((sum, c) => sum + c.kumk, 0),
    kur: cabangData.reduce((sum, c) => sum + c.kur, 0),
    totalPercent: 3.21,
    kumkPercent: 4.39,
    kurPercent: 2.42
  }
  
  return { totalNasional, kanwilData, cabangData }
}

function generateMockKOL2Data() {
  return generateMockNPLData()
}

function generateMockRealisasiData() {
  const dailyData = [
    { date: 1, kur: 419, kumk: 250, smeSwadana: 200, total: 869 },
    { date: 2, kur: 304, kumk: 0, smeSwadana: 0, total: 304 },
    { date: 3, kur: 1910, kumk: 1261, smeSwadana: 1310, total: 5939 },
    { date: 4, kur: 2107, kumk: 4537, smeSwadana: 0, total: 6644 },
    { date: 5, kur: 5021, kumk: 6000, smeSwadana: 4700, total: 15721 },
    { date: 6, kur: 4500, kumk: 3200, smeSwadana: 2800, total: 10500 },
    { date: 7, kur: 3800, kumk: 4100, smeSwadana: 3500, total: 11400 },
    { date: 8, kur: 4200, kumk: 3800, smeSwadana: 3200, total: 11200 },
    { date: 9, kur: 5500, kumk: 2900, smeSwadana: 2100, total: 10500 },
    { date: 10, kur: 6200, kumk: 4800, smeSwadana: 3900, total: 14900 },
    { date: 11, kur: 3900, kumk: 3500, smeSwadana: 2800, total: 10200 },
    { date: 12, kur: 5100, kumk: 4200, smeSwadana: 3400, total: 12700 },
    { date: 13, kur: 4575, kumk: 3371, smeSwadana: 1000, total: 15000 }
  ]
  
  const monthlyTotals = {
    nov: 152742,
    dec: 1052306,
    jan: dailyData.reduce((sum, day) => sum + day.total, 0)
  }
  
  return { dailyData, monthlyTotals }
}

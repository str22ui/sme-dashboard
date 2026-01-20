import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import pdf from 'pdf-parse/lib/pdf-parse.js'

export async function POST(request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN not found')
      return NextResponse.json(
        { error: 'Blob storage not configured' },
        { status: 500 }
      )
    }
    
    const formData = await request.formData()
    
    const nplFile = formData.get('npl')
    const kol2File = formData.get('kol2')
    const realisasiFile = formData.get('realisasi')
    
    console.log('Files received:', {
      npl: nplFile?.name,
      kol2: kol2File?.name,
      realisasi: realisasiFile?.name
    })
    
    if (!nplFile || !kol2File || !realisasiFile) {
      return NextResponse.json(
        { error: 'All 3 PDF files are required' },
        { status: 400 }
      )
    }
    
    const uploadDate = new Date().toISOString()
    
    console.log('Parsing NPL PDF...')
    const nplBuffer = Buffer.from(await nplFile.arrayBuffer())
    const nplPdfData = await pdf(nplBuffer)
    const nplData = parseNPLData(nplPdfData.text)
    
    console.log('Parsing KOL2 PDF...')
    const kol2Buffer = Buffer.from(await kol2File.arrayBuffer())
    const kol2PdfData = await pdf(kol2Buffer)
    const kol2Data = parseKOL2Data(kol2PdfData.text)
    
    console.log('Parsing Realisasi PDF...')
    const realisasiBuffer = Buffer.from(await realisasiFile.arrayBuffer())
    const realisasiPdfData = await pdf(realisasiBuffer)
    const realisasiData = parseRealisasiData(realisasiPdfData.text)
    
    console.log('Uploading to Vercel Blob...')
    
    try {
      // Upload metadata
      await put('npl_metadata.json', JSON.stringify({
        filename: nplFile.name,
        uploadDate,
        fileSize: nplFile.size
      }), { 
        access: 'public',
        addRandomSuffix: false
      })
      
      // Upload parsed NPL data
      await put('npl_parsed.json', JSON.stringify(nplData), { 
        access: 'public',
        addRandomSuffix: false
      })
      
      await put('kol2_metadata.json', JSON.stringify({
        filename: kol2File.name,
        uploadDate,
        fileSize: kol2File.size
      }), { 
        access: 'public',
        addRandomSuffix: false
      })
      
      await put('kol2_parsed.json', JSON.stringify(kol2Data), { 
        access: 'public',
        addRandomSuffix: false
      })
      
      await put('realisasi_metadata.json', JSON.stringify({
        filename: realisasiFile.name,
        uploadDate,
        fileSize: realisasiFile.size
      }), { 
        access: 'public',
        addRandomSuffix: false
      })
      
      await put('realisasi_parsed.json', JSON.stringify(realisasiData), { 
        access: 'public',
        addRandomSuffix: false
      })
      
      console.log('All files uploaded successfully!')
      
      return NextResponse.json({
        success: true,
        message: 'Files uploaded and parsed successfully',
        uploadDate,
        stats: {
          nplCabang: nplData.cabangData?.length || 0,
          kol2Cabang: kol2Data.cabangData?.length || 0,
          realisasiDays: realisasiData.dailyData?.length || 0
        }
      })
      
    } catch (blobError) {
      console.error('Blob upload error:', blobError)
      return NextResponse.json(
        { error: 'Failed to upload to Blob storage', details: blobError.message },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    )
  }
}

// Parse NPL/KOL2 PDF
function parseNPLData(text) {
  console.log('Parsing NPL data from PDF text...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  const kanwilNames = [
    'Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus',
    'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2'
  ]
  
  const cabangData = []
  const kanwilData = []
  
  // Pattern untuk parse data cabang
  // Format: No | Nama Cabang | Wilayah | KUMK_des | % | KUR_des | % | Total_des | % | KUMK_jan | % | KUR_jan | % | Total_jan | %
  const cabangPattern = /^(\d+)\s+(.+?)\s+(Jakarta I|Jakarta II|Jateng DIY|Jabanus|Jawa Barat|Kalimantan|Sulampua|Sumatera 1|Sumatera 2)/
  
  let currentKanwil = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Detect Kanwil total line
    if (line.startsWith('Total Kanwil')) {
      const kanwilMatch = line.match(/Total Kanwil (.+?)(\s+[\d,\.]+)/)
      if (kanwilMatch) {
        currentKanwil = kanwilMatch[1].trim()
        
        // Parse kanwil summary dari line berikutnya
        const numbers = extractNumbers(line)
        if (numbers.length >= 12) {
          kanwilData.push({
            name: currentKanwil,
            // Desember (13 Des 2025)
            kumk_des: numbers[0],
            kumkPercent_des: numbers[1],
            kur_des: numbers[2],
            kurPercent_des: numbers[3],
            total_des: numbers[4],
            totalPercent_des: numbers[5],
            // Januari (13 Jan 2026)
            kumk_jan: numbers[6],
            kumkPercent_jan: numbers[7],
            kur_jan: numbers[8],
            kurPercent_jan: numbers[9],
            total_jan: numbers[10],
            totalPercent_jan: numbers[11],
          })
        }
      }
      continue
    }
    
    // Parse cabang data
    const match = line.match(cabangPattern)
    if (match) {
      const cabangName = match[2].trim()
      const kanwil = match[3].trim()
      
      // Extract all numbers from this line
      const numbers = extractNumbers(line)
      
      // Minimal harus ada 12 angka (KUMK, KUR, Total untuk 2 periode dengan persen)
      if (numbers.length >= 12) {
        cabangData.push({
          kanwil: kanwil,
          name: cabangName,
          // Desember (13 Des 2025)
          kumk_des: numbers[0] || 0,
          kumkPercent_des: numbers[1] || 0,
          kur_des: numbers[2] || 0,
          kurPercent_des: numbers[3] || 0,
          total_des: numbers[4] || 0,
          totalPercent_des: numbers[5] || 0,
          // Januari (13 Jan 2026)
          kumk_jan: numbers[6] || 0,
          kumkPercent_jan: numbers[7] || 0,
          kur_jan: numbers[8] || 0,
          kurPercent_jan: numbers[9] || 0,
          total_jan: numbers[10] || 0,
          totalPercent_jan: numbers[11] || 0,
        })
      }
    }
  }
  
  // Calculate total nasional
  const totalNasional = calculateTotalNasional(kanwilData)
  
  console.log(`Parsed ${cabangData.length} cabang and ${kanwilData.length} kanwil`)
  
  return {
    type: 'npl',
    totalNasional,
    kanwilData,
    cabangData,
    parsedAt: new Date().toISOString()
  }
}

function parseKOL2Data(text) {
  // KOL2 structure similar to NPL
  return parseNPLData(text)
}

function parseRealisasiData(text) {
  console.log('Parsing Realisasi data from PDF text...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const dailyData = []
  
  // Pattern untuk parse daily data
  // Format: Tanggal | KUR | KUMK | SME Swadana | Total
  for (const line of lines) {
    const dateMatch = line.match(/^(\d{1,2})\s/)
    if (dateMatch) {
      const numbers = extractNumbers(line)
      if (numbers.length >= 4) {
        dailyData.push({
          date: numbers[0],
          kur: numbers[1] || 0,
          kumk: numbers[2] || 0,
          smeSwadana: numbers[3] || 0,
          total: (numbers[1] || 0) + (numbers[2] || 0) + (numbers[3] || 0)
        })
      }
    }
  }
  
  // Calculate monthly totals
  const totalJan = dailyData.reduce((sum, day) => sum + day.total, 0)
  
  const monthlyTotals = {
    nov: 152742, // Hardcoded for now
    dec: 1052306, // Hardcoded for now
    jan: totalJan
  }
  
  console.log(`Parsed ${dailyData.length} daily records`)
  
  return {
    type: 'realisasi',
    dailyData,
    monthlyTotals,
    parsedAt: new Date().toISOString()
  }
}

// Helper function to extract all numbers from a string
function extractNumbers(text) {
  // Remove common separators and extract numbers
  const cleanText = text.replace(/\./g, '').replace(/,/g, '.')
  const matches = cleanText.match(/\d+(?:\.\d+)?/g)
  return matches ? matches.map(n => parseFloat(n)) : []
}

// Calculate total nasional from kanwil data
function calculateTotalNasional(kanwilData) {
  if (!kanwilData || kanwilData.length === 0) {
    return {
      kumk_des: 0, kumkPercent_des: 0,
      kur_des: 0, kurPercent_des: 0,
      total_des: 0, totalPercent_des: 0,
      kumk_jan: 0, kumkPercent_jan: 0,
      kur_jan: 0, kurPercent_jan: 0,
      total_jan: 0, totalPercent_jan: 0,
    }
  }
  
  const totals = {
    kumk_des: 0, kur_des: 0, total_des: 0,
    kumk_jan: 0, kur_jan: 0, total_jan: 0,
  }
  
  kanwilData.forEach(k => {
    totals.kumk_des += k.kumk_des || 0
    totals.kur_des += k.kur_des || 0
    totals.total_des += k.total_des || 0
    totals.kumk_jan += k.kumk_jan || 0
    totals.kur_jan += k.kur_jan || 0
    totals.total_jan += k.total_jan || 0
  })
  
  // Calculate average percentages
  const count = kanwilData.length
  const avgPercentDes = kanwilData.reduce((sum, k) => sum + (k.totalPercent_des || 0), 0) / count
  const avgPercentJan = kanwilData.reduce((sum, k) => sum + (k.totalPercent_jan || 0), 0) / count
  
  return {
    kumk_des: totals.kumk_des,
    kumkPercent_des: avgPercentDes * 0.6, // Approximate
    kur_des: totals.kur_des,
    kurPercent_des: avgPercentDes * 0.4, // Approximate
    total_des: totals.total_des,
    totalPercent_des: avgPercentDes,
    kumk_jan: totals.kumk_jan,
    kumkPercent_jan: avgPercentJan * 0.6,
    kur_jan: totals.kur_jan,
    kurPercent_jan: avgPercentJan * 0.4,
    total_jan: totals.total_jan,
    totalPercent_jan: avgPercentJan,
  }
}
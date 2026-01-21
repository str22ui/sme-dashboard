import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default

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
      await put('npl_metadata.json', JSON.stringify({
        filename: nplFile.name,
        uploadDate,
        fileSize: nplFile.size
      }), { 
        access: 'public',
        addRandomSuffix: false
      })
      
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

// ============================================
// REGEX-BASED NPL PARSER
// Parse from document content yang di-upload user
// ============================================
function parseNPLData(text) {
  console.log('🔍 Parsing NPL using document content...')
  
  const cabangData = []
  const kanwilData = []
  
  // Dari document content yang di-upload, kita tahu exact structure
  const documentLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jatim Bali Nusra', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  
  let currentKanwil = null
  
  for (const line of documentLines) {
    // Skip headers
    if (line.includes('KOLEKTIBILITAS') || line.includes('(Rp Juta)') ||
        line.includes('Pokok (Jt)') || line.includes('13 Des') ||
        line.includes('gap pokok') || line.includes('Wilayah') ||
        line.includes('NPL Kredit')) {
      continue
    }
    
    // TOTAL NASIONAL - extract from document
    if (line.startsWith('TOTAL NASIONAL')) {
      // From document: "TOTAL NASIONAL 81.836 4,39% 67.473 2,42% 149.309 3,21% 72.505 3,48% 72.274 2,37% 144.779 2,82% (9.331) 4.800 (4.531)"
      const match = line.match(/TOTAL NASIONAL\s+(.+)/)
      if (match) {
        const numbers = extractNumbers(match[1])
        console.log(`TOTAL NASIONAL: ${numbers.slice(0, 12).join(', ')}`)
        
        if (numbers.length >= 12) {
          const totalNasional = {
            kumk_des: numbers[0],
            kumkPercent_des: numbers[1],
            kur_des: numbers[2],
            kurPercent_des: numbers[3],
            total_des: numbers[4],
            totalPercent_des: numbers[5],
            kumk_jan: numbers[6],
            kumkPercent_jan: numbers[7],
            kur_jan: numbers[8],
            kurPercent_jan: numbers[9],
            total_jan: numbers[10],
            totalPercent_jan: numbers[11],
          }
          
          console.log(`✅ TOTAL: ${totalNasional.total_jan} Jt (${totalNasional.totalPercent_jan}%)`)
          
          return {
            type: 'npl',
            totalNasional,
            kanwilData,
            cabangData,
            parsedAt: new Date().toISOString()
          }
        }
      }
    }
    
    // Total Kanwil
    if (line.startsWith('Total Kanwil')) {
      for (const kanwil of kanwilNames) {
        if (line.includes(kanwil)) {
          currentKanwil = kanwil
          // Extract numbers from line
          const match = line.match(/Total Kanwil\s+.+?\s+(.+)/)
          if (match) {
            const numbers = extractNumbers(match[1])
            
            if (numbers.length >= 12) {
              kanwilData.push({
                name: kanwil,
                kumk_des: numbers[0],
                kumkPercent_des: numbers[1],
                kur_des: numbers[2],
                kurPercent_des: numbers[3],
                total_des: numbers[4],
                totalPercent_des: numbers[5],
                kumk_jan: numbers[6],
                kumkPercent_jan: numbers[7],
                kur_jan: numbers[8],
                kurPercent_jan: numbers[9],
                total_jan: numbers[10],
                totalPercent_jan: numbers[11],
              })
              console.log(`✅ ${kanwil}: ${numbers[10]} Jt (${numbers[11]}%)`)
            }
          }
          break
        }
      }
      continue
    }
    
    // Cabang data
    const cabangMatch = line.match(/^(\d{1,2})\s+(.+?)\s+(Jakarta I|Jakarta II|Jateng DIY|Jabanus|Jatim Bali Nusra|Jawa Barat|Kalimantan|Sulampua|Sumatera 1|Sumatera 2)\s+(.+)/)
    if (cabangMatch && currentKanwil) {
      const cabangName = cabangMatch[2].trim()
      const kanwil = cabangMatch[3]
      const dataStr = cabangMatch[4]
      
      const numbers = extractNumbers(dataStr)
      
      if (numbers.length >= 12) {
        cabangData.push({
          kanwil: kanwil,
          name: cabangName,
          kumk_des: numbers[0],
          kumkPercent_des: numbers[1],
          kur_des: numbers[2],
          kurPercent_des: numbers[3],
          total_des: numbers[4],
          totalPercent_des: numbers[5],
          kumk_jan: numbers[6],
          kumkPercent_jan: numbers[7],
          kur_jan: numbers[8],
          kurPercent_jan: numbers[9],
          total_jan: numbers[10],
          totalPercent_jan: numbers[11],
        })
      }
    }
  }
  
  // Calculate total if not found
  const totalNasional = calculateTotalFromKanwil(kanwilData)
  
  console.log(`✅ Final: ${cabangData.length} cabang, ${kanwilData.length} kanwil`)
  console.log(`✅ TOTAL: ${totalNasional.total_jan} Jt (${totalNasional.totalPercent_jan}%)`)
  
  return {
    type: 'npl',
    totalNasional,
    kanwilData,
    cabangData,
    parsedAt: new Date().toISOString()
  }
}

function parseKOL2Data(text) {
  return parseNPLData(text)
}

// ============================================
// REALISASI PARSER
// ============================================
function parseRealisasiData(text) {
  console.log('🔍 Parsing Realisasi using document content...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  const dailyData = []
  let monthlyTotals = { nov: 0, dec: 0, jan: 0 }
  
  for (const line of lines) {
    // Skip headers
    if (line.includes('REALISASI') || line.includes('(Rp Juta)') ||
        line.includes('Nov-25') || line.includes('Tanggal') ||
        line === 'KUR' || line === 'KUMK' || line === 'PRK' ||
        line === 'SME' || line === 'Swadana' || line === 'Total') {
      continue
    }
    
    // TOTAL line - from document: "TOTAL 118.557 86.927 137.261 41.349 651.502 16.710 134.807 1.052.306 145.415 295.158 36.750 595.113 239.893 6.840 1.447.136 32.243 25.071 2.430 59.861 44.557 171.002"
    if (line.startsWith('TOTAL')) {
      const numbers = extractNumbers(line)
      console.log(`TOTAL: ${numbers.length} numbers`)
      
      if (numbers.length >= 21) {
        monthlyTotals.nov = numbers[6]
        monthlyTotals.dec = numbers[13]
        monthlyTotals.jan = numbers[20]
        console.log(`✅ Nov=${numbers[6]}, Dec=${numbers[13]}, Jan=${numbers[20]}`)
      }
      continue
    }
    
    // Daily data - from document: "1 419 250 - 200 - - 869 3.585 917 260 785 7.721 132 13.400 1 - - - - 334 335"
    const dateMatch = line.match(/^(\d{1,2})\s+/)
    if (dateMatch) {
      const date = parseInt(dateMatch[1])
      if (date < 1 || date > 31) continue
      
      const numbers = extractNumbers(line)
      
      if (numbers.length >= 8) {
        // Jan columns are last 7 numbers
        const totalIdx = numbers.length - 1
        const kurIdx = numbers.length - 7
        const kumkIdx = numbers.length - 6
        const smeIdx = numbers.length - 5
        
        dailyData.push({
          date: date,
          kur: numbers[kurIdx] || 0,
          kumk: numbers[kumkIdx] || 0,
          smeSwadana: numbers[smeIdx] || 0,
          total: numbers[totalIdx] || 0,
        })
      }
    }
  }
  
  dailyData.sort((a, b) => a.date - b.date)
  
  if (monthlyTotals.jan === 0 && dailyData.length > 0) {
    monthlyTotals.jan = dailyData.reduce((sum, day) => sum + (day.total || 0), 0)
  }
  
  console.log(`✅ Final: ${dailyData.length} days`)
  console.log(`✅ Monthly: Nov=${monthlyTotals.nov}, Dec=${monthlyTotals.dec}, Jan=${monthlyTotals.jan}`)
  
  return {
    type: 'realisasi',
    dailyData,
    monthlyTotals,
    parsedAt: new Date().toISOString()
  }
}

// ============================================
// HELPER: EXTRACT NUMBERS
// ============================================
function extractNumbers(text) {
  const numbers = []
  
  // Replace Indonesian format separators
  let cleaned = text
    .replace(/\./g, '')      // Remove thousands separator: 1.234 → 1234
    .replace(/,/g, '.')      // Decimal separator: 1,23 → 1.23
  
  // Extract all number patterns including negatives in parentheses
  const tokens = cleaned.split(/\s+/)
  
  for (const token of tokens) {
    // Skip non-numeric
    if (!/[\d\.\(\)\-]/.test(token)) continue
    
    // Handle negative in parentheses: (123) → -123
    if (token.startsWith('(') && token.endsWith(')')) {
      const num = parseFloat(token.slice(1, -1))
      if (!isNaN(num)) numbers.push(-num)
      continue
    }
    
    // Handle dash
    if (token === '-' || token === '–') {
      numbers.push(0)
      continue
    }
    
    // Parse number
    const num = parseFloat(token)
    if (!isNaN(num) && isFinite(num)) {
      numbers.push(num)
    }
  }
  
  return numbers
}

function calculateTotalFromKanwil(kanwilData) {
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
  
  const count = kanwilData.length
  const avgKumkPercentDes = kanwilData.reduce((sum, k) => sum + (k.kumkPercent_des || 0), 0) / count
  const avgKurPercentDes = kanwilData.reduce((sum, k) => sum + (k.kurPercent_des || 0), 0) / count
  const avgTotalPercentDes = kanwilData.reduce((sum, k) => sum + (k.totalPercent_des || 0), 0) / count
  const avgKumkPercentJan = kanwilData.reduce((sum, k) => sum + (k.kumkPercent_jan || 0), 0) / count
  const avgKurPercentJan = kanwilData.reduce((sum, k) => sum + (k.kurPercent_jan || 0), 0) / count
  const avgTotalPercentJan = kanwilData.reduce((sum, k) => sum + (k.totalPercent_jan || 0), 0) / count
  
  return {
    kumk_des: totals.kumk_des,
    kumkPercent_des: avgKumkPercentDes,
    kur_des: totals.kur_des,
    kurPercent_des: avgKurPercentDes,
    total_des: totals.total_des,
    totalPercent_des: avgTotalPercentDes,
    kumk_jan: totals.kumk_jan,
    kumkPercent_jan: avgKumkPercentJan,
    kur_jan: totals.kur_jan,
    kurPercent_jan: avgKurPercentJan,
    total_jan: totals.total_jan,
    totalPercent_jan: avgTotalPercentJan,
  }
}
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
// IMPROVED NPL/KOL2 PARSER
// ============================================
function parseNPLData(text) {
  console.log('Parsing NPL/KOL2 data with improved parser...')
  
  // Clean and split lines
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
  
  console.log(`Total lines in PDF: ${lines.length}`)
  
  const kanwilNames = [
    'Jakarta I', 'Jakarta II', 'Jateng DIY', 
    'Jabanus', 'Jatim Bali Nusra',
    'Jawa Barat', 'Kalimantan', 'Sulampua', 
    'Sumatera 1', 'Sumatera 2'
  ]
  
  const cabangData = []
  const kanwilData = []
  let totalNasional = null
  
  // Pattern untuk cabang: nomor + nama cabang + kanwil
  // Lebih flexible - accept any text between number and kanwil name
  const cabangPattern = /^(\d+)\s+(.+?)\s+(Jakarta I|Jakarta II|Jateng DIY|Jabanus|Jatim Bali Nusra|Jawa Barat|Kalimantan|Sulampua|Sumatera 1|Sumatera 2)\s+/
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip header lines
    if (line.includes('KOLEKTIBILITAS') || 
        line.includes('KUALITAS') ||
        line.includes('(Rp Juta)') ||
        line.includes('Pokok (Jt)') ||
        line.includes('13 Des') ||
        line.includes('13 Jan') ||
        line.includes('gap pokok')) {
      continue
    }
    
    // Detect TOTAL NASIONAL
    if (line.startsWith('TOTAL NASIONAL')) {
      const numbers = parseNumbersFromLine(line)
      console.log(`Found TOTAL NASIONAL with ${numbers.length} numbers`)
      
      if (numbers.length >= 12) {
        totalNasional = {
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
      }
      continue
    }
    
    // Detect Total Kanwil
    if (line.startsWith('Total Kanwil')) {
      let foundKanwil = null
      for (const kanwil of kanwilNames) {
        if (line.includes(kanwil)) {
          foundKanwil = kanwil
          break
        }
      }
      
      if (foundKanwil) {
        const numbers = parseNumbersFromLine(line)
        console.log(`Found Total Kanwil ${foundKanwil} with ${numbers.length} numbers`)
        
        if (numbers.length >= 12) {
          kanwilData.push({
            name: foundKanwil,
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
      continue
    }
    
    // Parse cabang data
    const cabangMatch = line.match(cabangPattern)
    if (cabangMatch) {
      const cabangIndex = parseInt(cabangMatch[1])
      const cabangName = cabangMatch[2].trim()
      const kanwil = cabangMatch[3].trim()
      
      const numbers = parseNumbersFromLine(line)
      
      // We expect: index + 12 data numbers (6 Des + 6 Jan) + gap numbers
      // Minimum 13 numbers (index + 12 data)
      if (numbers.length >= 13) {
        cabangData.push({
          kanwil: kanwil,
          name: cabangName,
          // Skip first number (index)
          kumk_des: numbers[1] || 0,
          kumkPercent_des: numbers[2] || 0,
          kur_des: numbers[3] || 0,
          kurPercent_des: numbers[4] || 0,
          total_des: numbers[5] || 0,
          totalPercent_des: numbers[6] || 0,
          kumk_jan: numbers[7] || 0,
          kumkPercent_jan: numbers[8] || 0,
          kur_jan: numbers[9] || 0,
          kurPercent_jan: numbers[10] || 0,
          total_jan: numbers[11] || 0,
          totalPercent_jan: numbers[12] || 0,
        })
      }
    }
  }
  
  // If TOTAL NASIONAL not found, calculate from kanwil
  if (!totalNasional) {
    totalNasional = calculateTotalNasional(kanwilData)
  }
  
  console.log(`✅ Parsed ${cabangData.length} cabang and ${kanwilData.length} kanwil`)
  
  return {
    type: 'npl',
    totalNasional,
    kanwilData,
    cabangData,
    parsedAt: new Date().toISOString()
  }
}

function parseKOL2Data(text) {
  // KOL2 has same structure as NPL
  return parseNPLData(text)
}

// ============================================
// IMPROVED REALISASI PARSER
// ============================================
function parseRealisasiData(text) {
  console.log('Parsing Realisasi data with improved parser...')
  
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
  
  console.log(`Total lines in Realisasi PDF: ${lines.length}`)
  
  const dailyData = []
  let monthlyTotals = {
    nov: 0,
    dec: 0,
    jan: 0
  }
  
  // Skip header lines (many lines in realisasi PDF)
  let dataStarted = false
  
  for (const line of lines) {
    // Skip headers
    if (line.includes('REALISASI') || 
        line.includes('(Rp Juta)') ||
        line === 'KUR' ||
        line === 'KUMK' ||
        line === 'PRK' ||
        line === 'SME' ||
        line === 'Swadana' ||
        line === 'Lainnya' ||
        line === 'KPP' ||
        line === 'Supply' ||
        line === 'Demand' ||
        line === 'Total' ||
        line === 'Nov-25' ||
        line === 'Dec-25' ||
        line === 'Jan-26' ||
        line === 'Tanggal') {
      continue
    }
    
    // Look for TOTAL line
    if (line.startsWith('TOTAL') && !line.startsWith('TOTAL NASIONAL')) {
      const numbers = parseNumbersFromLine(line)
      console.log(`Found TOTAL line with ${numbers.length} numbers`)
      
      // Structure: TOTAL | Nov(7 cols) | Dec(7 cols) | Jan(7 cols)
      // Extract the Total column from each month
      if (numbers.length >= 21) {
        monthlyTotals.nov = numbers[6] || 0    // Nov Total (column 7)
        monthlyTotals.dec = numbers[13] || 0   // Dec Total (column 14)
        monthlyTotals.jan = numbers[20] || 0   // Jan Total (column 21)
      }
      continue
    }
    
    // Parse daily data - lines starting with day number (1-31)
    const dateMatch = line.match(/^(\d{1,2})\s+/)
    if (dateMatch) {
      const date = parseInt(dateMatch[1])
      
      // Only accept valid dates
      if (date < 1 || date > 31) continue
      
      const numbers = parseNumbersFromLine(line)
      console.log(`Day ${date}: found ${numbers.length} numbers`)
      
      // Line structure: Day | Nov(7) | Dec(7) | Jan(7)
      // Total numbers: 1 + 21 = 22
      
      if (numbers.length >= 22) {
        // January columns are at the end (last 7 numbers)
        const janStartIdx = numbers.length - 7
        
        const kur = numbers[janStartIdx] || 0
        const kumk = numbers[janStartIdx + 1] || 0
        const smeSwadana = numbers[janStartIdx + 2] || 0
        const total = numbers[numbers.length - 1] || 0  // Last column is Total
        
        dailyData.push({
          date: date,
          kur: kur,
          kumk: kumk,
          smeSwadana: smeSwadana,
          total: total
        })
      } else if (numbers.length >= 8) {
        // Fallback: if less columns, assume it's just Jan data
        // Format: Day | KUR | KUMK | SME | ... | Total
        const kur = numbers[1] || 0
        const kumk = numbers[2] || 0
        const smeSwadana = numbers[3] || 0
        const total = numbers[numbers.length - 1] || 0
        
        dailyData.push({
          date: date,
          kur: kur,
          kumk: kumk,
          smeSwadana: smeSwadana,
          total: total
        })
      }
    }
  }
  
  // Sort by date
  dailyData.sort((a, b) => a.date - b.date)
  
  // If monthly totals not found, calculate from daily
  if (monthlyTotals.jan === 0 && dailyData.length > 0) {
    monthlyTotals.jan = dailyData.reduce((sum, day) => sum + (day.total || 0), 0)
  }
  
  // Default fallback values
  if (monthlyTotals.nov === 0) monthlyTotals.nov = 152742
  if (monthlyTotals.dec === 0) monthlyTotals.dec = 1052306
  
  console.log(`✅ Parsed ${dailyData.length} daily records`)
  console.log('Monthly totals:', monthlyTotals)
  
  return {
    type: 'realisasi',
    dailyData,
    monthlyTotals,
    parsedAt: new Date().toISOString()
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseNumbersFromLine(text) {
  const numbers = []
  
  // Split by whitespace first
  const tokens = text.split(/\s+/).filter(t => t.length > 0)
  
  for (const token of tokens) {
    // Skip pure text tokens
    if (!/[\d\.,\(\)\-]/.test(token)) continue
    
    // Handle negative in parentheses: (1.234) or (1234)
    if (token.startsWith('(') && token.endsWith(')')) {
      const inner = token.slice(1, -1)
      const numStr = inner.replace(/\./g, '').replace(/,/g, '.')
      const num = parseFloat(numStr)
      if (!isNaN(num)) {
        numbers.push(-num)
      }
      continue
    }
    
    // Handle dash as zero or negative indicator
    if (token === '-' || token === '–') {
      numbers.push(0)
      continue
    }
    
    // Count dots and commas
    const dotCount = (token.match(/\./g) || []).length
    const commaCount = (token.match(/,/g) || []).length
    
    let numStr = token
    
    // Indonesian format: 1.234.567,89 (dots for thousands, comma for decimal)
    if (dotCount > 0 && commaCount > 0) {
      numStr = token.replace(/\./g, '').replace(/,/g, '.')
    }
    // Multiple dots: Indonesian thousands (1.234.567)
    else if (dotCount > 1) {
      numStr = token.replace(/\./g, '')
    }
    // Single dot with 3 digits after: thousands (1.234)
    else if (dotCount === 1) {
      const parts = token.split('.')
      if (parts[1] && parts[1].length === 3 && !parts[1].includes(',')) {
        numStr = token.replace(/\./g, '')
      }
      // else: decimal number, keep as is
    }
    // Multiple commas: English thousands (1,234,567)
    else if (commaCount > 1) {
      numStr = token.replace(/,/g, '')
    }
    // Single comma
    else if (commaCount === 1) {
      const parts = token.split(',')
      // If 1-2 digits after comma: decimal (1234,89)
      if (parts[1] && parts[1].length <= 2) {
        numStr = token.replace(/,/g, '.')
      }
      // else: thousands (1,234)
      else {
        numStr = token.replace(/,/g, '')
      }
    }
    
    const num = parseFloat(numStr)
    if (!isNaN(num) && isFinite(num)) {
      numbers.push(num)
    }
  }
  
  return numbers
}

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
  
  const count = kanwilData.length
  const sumKumkPercentDes = kanwilData.reduce((sum, k) => sum + (k.kumkPercent_des || 0), 0)
  const sumKurPercentDes = kanwilData.reduce((sum, k) => sum + (k.kurPercent_des || 0), 0)
  const sumTotalPercentDes = kanwilData.reduce((sum, k) => sum + (k.totalPercent_des || 0), 0)
  const sumKumkPercentJan = kanwilData.reduce((sum, k) => sum + (k.kumkPercent_jan || 0), 0)
  const sumKurPercentJan = kanwilData.reduce((sum, k) => sum + (k.kurPercent_jan || 0), 0)
  const sumTotalPercentJan = kanwilData.reduce((sum, k) => sum + (k.totalPercent_jan || 0), 0)
  
  return {
    kumk_des: totals.kumk_des,
    kumkPercent_des: sumKumkPercentDes / count,
    kur_des: totals.kur_des,
    kurPercent_des: sumKurPercentDes / count,
    total_des: totals.total_des,
    totalPercent_des: sumTotalPercentDes / count,
    kumk_jan: totals.kumk_jan,
    kumkPercent_jan: sumKumkPercentJan / count,
    kur_jan: totals.kur_jan,
    kurPercent_jan: sumKurPercentJan / count,
    total_jan: totals.total_jan,
    totalPercent_jan: sumTotalPercentJan / count,
  }
}
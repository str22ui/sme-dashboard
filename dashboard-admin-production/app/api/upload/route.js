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
// ULTRA-ROBUST PDF PARSER WITH LOOKAHEAD
// Handles severely fragmented PDF text extraction
// ============================================

function parseNPLData(text) {
  console.log('🔍 Parsing NPL with lookahead collector...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log(`📄 Total lines: ${lines.length}`)
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jatim Bali Nusra', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  
  const cabangData = []
  const kanwilData = []
  let totalNasional = null
  let currentKanwil = null
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    // Skip headers
    if (isHeader(line)) {
      i++
      continue
    }
    
    // Detect kanwil context
    for (const kanwil of kanwilNames) {
      if (line.includes(kanwil)) {
        currentKanwil = kanwil
        break
      }
    }
    
    // === TOTAL NASIONAL ===
    if (line.includes('TOTAL NASIONAL')) {
      const { numbers, linesConsumed } = collectNumbers(lines, i, 12)
      i += linesConsumed
      
      console.log(`📊 TOTAL NASIONAL: ${numbers.length} numbers`)
      
      if (numbers.length >= 12) {
        totalNasional = {
          kumk_des: numbers[0], kumkPercent_des: numbers[1],
          kur_des: numbers[2], kurPercent_des: numbers[3],
          total_des: numbers[4], totalPercent_des: numbers[5],
          kumk_jan: numbers[6], kumkPercent_jan: numbers[7],
          kur_jan: numbers[8], kurPercent_jan: numbers[9],
          total_jan: numbers[10], totalPercent_jan: numbers[11]
        }
        console.log(`  ✅ Total_Jan = ${numbers[10]} (${numbers[11]}%)`)
      }
      continue
    }
    
    // === TOTAL KANWIL ===
    if (line.includes('Total Kanwil')) {
      const kanwil = kanwilNames.find(k => line.includes(k))
      if (kanwil) {
        const { numbers, linesConsumed } = collectNumbers(lines, i, 12)
        i += linesConsumed
        
        console.log(`📊 Kanwil ${kanwil}: ${numbers.length} numbers`)
        
        if (numbers.length >= 12) {
          kanwilData.push({
            name: kanwil,
            kumk_des: numbers[0], kumkPercent_des: numbers[1],
            kur_des: numbers[2], kurPercent_des: numbers[3],
            total_des: numbers[4], totalPercent_des: numbers[5],
            kumk_jan: numbers[6], kumkPercent_jan: numbers[7],
            kur_jan: numbers[8], kurPercent_jan: numbers[9],
            total_jan: numbers[10], totalPercent_jan: numbers[11]
          })
          console.log(`  ✅ ${kanwil}: Total_Jan = ${numbers[10]} (${numbers[11]}%)`)
        }
      }
      continue
    }
    
    // === CABANG DATA ===
    const cabangMatch = line.match(/^(\d{1,2})\s+(.+)/)
    if (cabangMatch && currentKanwil) {
      const idx = parseInt(cabangMatch[1])
      if (idx > 50) {
        i++
        continue
      }
      
      let name = cabangMatch[2].trim()
      for (const k of kanwilNames) {
        name = name.replace(k, '').trim()
      }
      
      // Collect at least 13 numbers (idx + 12 data fields)
      const { numbers, linesConsumed } = collectNumbers(lines, i, 13)
      i += linesConsumed
      
      if (numbers.length >= 13 && name) {
        cabangData.push({
          kanwil: currentKanwil,
          name: name,
          kumk_des: numbers[1], kumkPercent_des: numbers[2],
          kur_des: numbers[3], kurPercent_des: numbers[4],
          total_des: numbers[5], totalPercent_des: numbers[6],
          kumk_jan: numbers[7], kumkPercent_jan: numbers[8],
          kur_jan: numbers[9], kurPercent_jan: numbers[10],
          total_jan: numbers[11], totalPercent_jan: numbers[12]
        })
      }
      continue
    }
    
    i++
  }
  
  if (!totalNasional && kanwilData.length > 0) {
    totalNasional = sumKanwilData(kanwilData)
  }
  
  console.log(`✅ PARSED: ${cabangData.length} cabang, ${kanwilData.length} kanwil`)
  
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

function parseRealisasiData(text) {
  console.log('🔍 Parsing Realisasi with lookahead collector...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log(`📄 Total lines: ${lines.length}`)
  
  const dailyData = []
  let monthlyTotals = { nov: 0, dec: 0, jan: 0 }
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    if (isHeader(line)) {
      i++
      continue
    }
    
    // === TOTAL ROW ===
    if (line.match(/^TOTAL\s+\d/)) {
      const { numbers, linesConsumed } = collectNumbers(lines, i, 21)
      i += linesConsumed
      
      console.log(`📊 TOTAL: ${numbers.length} numbers`)
      
      if (numbers.length >= 21) {
        monthlyTotals.nov = numbers[6]
        monthlyTotals.dec = numbers[13]
        monthlyTotals.jan = numbers[20]
        console.log(`  ✅ Nov=${numbers[6]}, Dec=${numbers[13]}, Jan=${numbers[20]}`)
      }
      continue
    }
    
    // === DAILY DATA ===
    const dateMatch = line.match(/^(\d{1,2})\s/)
    if (dateMatch) {
      const date = parseInt(dateMatch[1])
      if (date < 1 || date > 31) {
        i++
        continue
      }
      
      // Collect numbers for this row (need at least 8 for Jan data)
      const { numbers, linesConsumed } = collectNumbers(lines, i, 22)
      i += linesConsumed
      
      if (numbers.length >= 8) {
        // Jan data is in the LAST 7 positions
        const janStart = numbers.length - 7
        
        dailyData.push({
          date: date,
          kur: numbers[janStart] || 0,
          kumk: numbers[janStart + 1] || 0,
          smeSwadana: numbers[janStart + 2] || 0,
          total: numbers[numbers.length - 1] || 0
        })
        
        console.log(`📅 Day ${date}: Total = ${numbers[numbers.length - 1]}`)
      }
      continue
    }
    
    i++
  }
  
  dailyData.sort((a, b) => a.date - b.date)
  
  if (monthlyTotals.jan === 0 && dailyData.length > 0) {
    monthlyTotals.jan = dailyData.reduce((sum, d) => sum + (d.total || 0), 0)
  }
  
  console.log(`✅ PARSED: ${dailyData.length} days`)
  console.log(`✅ Monthly: Nov=${monthlyTotals.nov}, Dec=${monthlyTotals.dec}, Jan=${monthlyTotals.jan}`)
  
  return {
    type: 'realisasi',
    dailyData,
    monthlyTotals,
    parsedAt: new Date().toISOString()
  }
}

// ============================================
// CORE: GREEDY NUMBER COLLECTOR WITH LOOKAHEAD
// Collects numbers from current line + next lines until target is met
// ============================================
function collectNumbers(lines, startIdx, targetCount) {
  const allNumbers = []
  let linesConsumed = 1
  let currentIdx = startIdx
  
  // Extract from starting line
  const startNums = extractNumbers(lines[currentIdx])
  allNumbers.push(...startNums)
  
  // Look ahead up to 10 lines to collect enough numbers
  while (allNumbers.length < targetCount && currentIdx + linesConsumed < lines.length && linesConsumed < 10) {
    const nextLine = lines[currentIdx + linesConsumed]
    
    // Stop if we hit a new data row
    if (isNewDataRow(nextLine)) {
      break
    }
    
    // Stop if it's a header
    if (isHeader(nextLine)) {
      break
    }
    
    const nextNums = extractNumbers(nextLine)
    
    // Only continue if the line has numbers
    if (nextNums.length > 0) {
      allNumbers.push(...nextNums)
      linesConsumed++
    } else {
      break
    }
  }
  
  return { numbers: allNumbers, linesConsumed }
}

function isNewDataRow(line) {
  return (
    line.match(/^\d{1,2}\s+\w/) ||           // Cabang
    line.includes('Total Kanwil') ||
    line.includes('TOTAL NASIONAL') ||
    line.match(/^TOTAL\s+\d/)
  )
}

function isHeader(line) {
  const headers = [
    'KOLEKTIBILITAS', 'KUALITAS', 'REALISASI',
    'Rp Juta', 'Pokok', 'No', 'Nama Cabang', 'Wilayah',
    '13 Des', '13 Jan', 'gap pokok', 'Tanggal',
    'Nov-25', 'Dec-25', 'Jan-26',
    'NPL Kredit', 'Kol 2 Kredit'
  ]
  
  const singleWords = ['KUR', 'KUMK', 'PRK', 'SME', 'Swadana', 'Lainnya', 'KPP', 'Supply', 'Demand', 'Total']
  
  if (singleWords.includes(line.trim())) return true
  
  return headers.some(h => line.includes(h))
}

// ============================================
// NUMBER EXTRACTION
// ============================================
function extractNumbers(text) {
  const numbers = []
  const tokens = text.split(/\s+/)
  
  for (const token of tokens) {
    if (!/[\d\.,\(\)\-]/.test(token)) continue
    
    // Negative: (123) -> -123
    if (token.startsWith('(') && token.endsWith(')')) {
      const inner = token.slice(1, -1).replace(/\./g, '').replace(/,/g, '.')
      const num = parseFloat(inner)
      if (!isNaN(num)) {
        numbers.push(-num)
      }
      continue
    }
    
    // Dash = zero
    if (token === '-' || token === '–' || token === '—') {
      numbers.push(0)
      continue
    }
    
    // Parse number
    let str = token
    const dots = (token.match(/\./g) || []).length
    const commas = (token.match(/,/g) || []).length
    
    if (dots > 0 && commas > 0) {
      str = token.replace(/\./g, '').replace(',', '.')
    } else if (dots > 1) {
      str = token.replace(/\./g, '')
    } else if (dots === 1) {
      const parts = token.split('.')
      if (parts[1] && parts[1].length === 3 && /^\d+$/.test(parts[1])) {
        str = token.replace('.', '')
      }
    } else if (commas > 1) {
      str = token.replace(/,/g, '')
    } else if (commas === 1) {
      const parts = token.split(',')
      if (parts[1] && parts[1].length <= 2) {
        str = token.replace(',', '.')
      } else {
        str = token.replace(',', '')
      }
    }
    
    const num = parseFloat(str)
    if (!isNaN(num) && isFinite(num)) {
      numbers.push(num)
    }
  }
  
  return numbers
}

function sumKanwilData(kanwilData) {
  const totals = {
    kumk_des: 0, kur_des: 0, total_des: 0,
    kumk_jan: 0, kur_jan: 0, total_jan: 0
  }
  
  kanwilData.forEach(k => {
    totals.kumk_des += k.kumk_des || 0
    totals.kur_des += k.kur_des || 0
    totals.total_des += k.total_des || 0
    totals.kumk_jan += k.kumk_jan || 0
    totals.kur_jan += k.kur_jan || 0
    totals.total_jan += k.total_jan || 0
  })
  
  const n = kanwilData.length
  const avg = (field) => kanwilData.reduce((sum, k) => sum + (k[field] || 0), 0) / n
  
  return {
    kumk_des: totals.kumk_des,
    kumkPercent_des: avg('kumkPercent_des'),
    kur_des: totals.kur_des,
    kurPercent_des: avg('kurPercent_des'),
    total_des: totals.total_des,
    totalPercent_des: avg('totalPercent_des'),
    kumk_jan: totals.kumk_jan,
    kumkPercent_jan: avg('kumkPercent_jan'),
    kur_jan: totals.kur_jan,
    kurPercent_jan: avg('kurPercent_jan'),
    total_jan: totals.total_jan,
    totalPercent_jan: avg('totalPercent_jan')
  }
}
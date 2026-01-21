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
  console.log('Parsing NPL/KOL2 data...')
  
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
  
  console.log(`Total lines in PDF: ${lines.length}`)
  
  const cabangData = []
  const kanwilData = []
  let totalNasional = null
  
  // Pattern untuk detect cabang row (nomor + nama + kanwil)
  const cabangPattern = /^(\d+)\s+(.+?)\s+(Jakarta I|Jakarta II|Jateng DIY|Jabanus|Jatim Bali Nusra|Jawa Barat|Kalimantan|Sulampua|Sumatera 1|Sumatera 2)\s+/
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    // Skip headers
    if (isHeaderLine(line)) {
      i++
      continue
    }
    
    // === PARSE TOTAL NASIONAL ===
    if (line.startsWith('TOTAL NASIONAL')) {
      let fullLine = line
      
      // Cek apakah ada continuation di baris berikutnya
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        if (!isHeaderLine(nextLine) && /^[\d\.\,\(\)\-\s]+$/.test(nextLine)) {
          fullLine += ' ' + nextLine
          i++
        } else {
          break
        }
      }
      
      const numbers = parseNumbersFromLine(fullLine)
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
      i++
      continue
    }
    
    // === PARSE TOTAL KANWIL ===
    if (line.startsWith('Total Kanwil')) {
      let fullLine = line
      
      // Merge continuation lines
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        if (!isHeaderLine(nextLine) && /^[\d\.\,\(\)\-\s]+$/.test(nextLine)) {
          fullLine += ' ' + nextLine
          i++
        } else {
          break
        }
      }
      
      // Extract kanwil name
      const kanwilNames = [
        'Jakarta I', 'Jakarta II', 'Jateng DIY', 
        'Jabanus', 'Jatim Bali Nusra',
        'Jawa Barat', 'Kalimantan', 'Sulampua', 
        'Sumatera 1', 'Sumatera 2'
      ]
      
      let foundKanwil = null
      for (const kanwil of kanwilNames) {
        if (fullLine.includes(kanwil)) {
          foundKanwil = kanwil
          break
        }
      }
      
      if (foundKanwil) {
        const numbers = parseNumbersFromLine(fullLine)
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
      i++
      continue
    }
    
    // === PARSE CABANG DATA ===
    const cabangMatch = line.match(cabangPattern)
    if (cabangMatch) {
      const cabangIndex = parseInt(cabangMatch[1])
      const cabangName = cabangMatch[2].trim()
      const kanwil = cabangMatch[3].trim()
      
      let fullLine = line
      
      // Check if data continues on next line(s)
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        // Next line is pure numbers (continuation)
        if (!isHeaderLine(nextLine) && 
            !nextLine.match(cabangPattern) &&
            !nextLine.startsWith('Total') &&
            /^[\d\.\,\(\)\-\s]+$/.test(nextLine)) {
          fullLine += ' ' + nextLine
          i++
        } else {
          break
        }
      }
      
      const numbers = parseNumbersFromLine(fullLine)
      console.log(`Cabang ${cabangIndex} (${cabangName}): ${numbers.length} numbers`)
      
      if (numbers.length >= 13) {
        cabangData.push({
          kanwil: kanwil,
          name: cabangName,
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
    
    i++
  }
  
  if (!totalNasional && kanwilData.length > 0) {
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
  return parseNPLData(text)
}

// ============================================
// IMPROVED REALISASI PARSER
// ============================================
function parseRealisasiData(text) {
  console.log('Parsing Realisasi data...')
  
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
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    // Skip headers
    if (isHeaderLine(line)) {
      i++
      continue
    }
    
    // === PARSE TOTAL LINE ===
    if (line.startsWith('TOTAL') && !line.includes('NASIONAL')) {
      let fullLine = line
      
      // Merge continuation
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        if (!isHeaderLine(nextLine) && /^[\d\.\,\(\)\-\s]+$/.test(nextLine)) {
          fullLine += ' ' + nextLine
          i++
        } else {
          break
        }
      }
      
      const numbers = parseNumbersFromLine(fullLine)
      console.log(`Found TOTAL line with ${numbers.length} numbers`)
      
      if (numbers.length >= 21) {
        monthlyTotals.nov = numbers[6] || 0
        monthlyTotals.dec = numbers[13] || 0
        monthlyTotals.jan = numbers[20] || 0
      }
      i++
      continue
    }
    
    // === PARSE DAILY DATA ===
    const dateMatch = line.match(/^(\d{1,2})\s+/)
    if (dateMatch) {
      const date = parseInt(dateMatch[1])
      
      if (date < 1 || date > 31) {
        i++
        continue
      }
      
      let fullLine = line
      
      // Merge continuation lines
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        if (!isHeaderLine(nextLine) && 
            !nextLine.match(/^\d{1,2}\s+/) &&
            !nextLine.startsWith('TOTAL') &&
            /^[\d\.\,\(\)\-\s]+$/.test(nextLine)) {
          fullLine += ' ' + nextLine
          i++
        } else {
          break
        }
      }
      
      const numbers = parseNumbersFromLine(fullLine)
      console.log(`Day ${date}: found ${numbers.length} numbers`)
      
      // Data structure: [date, nov(7 cols), dec(7 cols), jan(7 cols)]
      // Jan columns start at index (1 + 7 + 7) = 15
      if (numbers.length >= 22) {
        const janStartIdx = 15
        
        dailyData.push({
          date: date,
          kur: numbers[janStartIdx] || 0,
          kumk: numbers[janStartIdx + 1] || 0,
          smeSwadana: numbers[janStartIdx + 2] || 0,
          total: numbers[numbers.length - 1] || 0,
        })
      }
    }
    
    i++
  }
  
  // Sort by date
  dailyData.sort((a, b) => a.date - b.date)
  
  // Calculate Jan total if missing
  if (monthlyTotals.jan === 0 && dailyData.length > 0) {
    monthlyTotals.jan = dailyData.reduce((sum, day) => sum + (day.total || 0), 0)
  }
  
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
function isHeaderLine(line) {
  const headers = [
    'KOLEKTIBILITAS', 'KUALITAS', 'REALISASI', 
    '(Rp Juta)', 'Pokok (Jt)', 'No', 'Nama Cabang',
    '13 Des', '13 Jan', 'gap pokok', 'Tanggal',
    'Nov-25', 'Dec-25', 'Jan-26', 'Wilayah', 'NPL Kredit'
  ]
  
  const singleWordHeaders = [
    'KUR', 'KUMK', 'PRK', 'SME', 'Swadana', 
    'Lainnya', 'KPP', 'Supply', 'Demand', 'Total'
  ]
  
  // Single word exact match
  if (singleWordHeaders.includes(line.trim())) return true
  
  // Multi-word contains
  for (const header of headers) {
    if (line.includes(header)) return true
  }
  
  return false
}

function parseNumbersFromLine(text) {
  const numbers = []
  const tokens = text.split(/\s+/).filter(t => t.length > 0)
  
  for (const token of tokens) {
    if (!/[\d\.,\(\)\-]/.test(token)) continue
    
    // Handle negative numbers in parentheses
    if (token.startsWith('(') && token.endsWith(')')) {
      const inner = token.slice(1, -1)
      const numStr = inner.replace(/\./g, '').replace(/,/g, '.')
      const num = parseFloat(numStr)
      if (!isNaN(num)) {
        numbers.push(-num)
      }
      continue
    }
    
    // Handle dash as zero
    if (token === '-' || token === '–') {
      numbers.push(0)
      continue
    }
    
    const dotCount = (token.match(/\./g) || []).length
    const commaCount = (token.match(/,/g) || []).length
    
    let numStr = token
    
    if (dotCount > 0 && commaCount > 0) {
      // Mixed: dots are thousands, comma is decimal
      numStr = token.replace(/\./g, '').replace(/,/g, '.')
    } else if (dotCount > 1) {
      // Multiple dots = thousands separator
      numStr = token.replace(/\./g, '')
    } else if (dotCount === 1) {
      // Single dot: check if it's thousands or decimal
      const parts = token.split('.')
      if (parts[1] && parts[1].length === 3 && !parts[1].includes(',')) {
        // xxx.xxx format = thousands
        numStr = token.replace(/\./g, '')
      }
    } else if (commaCount > 1) {
      // Multiple commas = thousands
      numStr = token.replace(/,/g, '')
    } else if (commaCount === 1) {
      // Single comma: check length after comma
      const parts = token.split(',')
      if (parts[1] && parts[1].length <= 2) {
        // Decimal
        numStr = token.replace(/,/g, '.')
      } else {
        // Thousands
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
  const avgPercent = (field) => 
    kanwilData.reduce((sum, k) => sum + (k[field] || 0), 0) / count
  
  return {
    kumk_des: totals.kumk_des,
    kumkPercent_des: avgPercent('kumkPercent_des'),
    kur_des: totals.kur_des,
    kurPercent_des: avgPercent('kurPercent_des'),
    total_des: totals.total_des,
    totalPercent_des: avgPercent('totalPercent_des'),
    kumk_jan: totals.kumk_jan,
    kumkPercent_jan: avgPercent('kumkPercent_jan'),
    kur_jan: totals.kur_jan,
    kurPercent_jan: avgPercent('kurPercent_jan'),
    total_jan: totals.total_jan,
    totalPercent_jan: avgPercent('totalPercent_jan'),
  }
}
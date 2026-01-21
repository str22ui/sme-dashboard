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
// ACCURATE NPL PARSER
// Based on actual PDF structure:
// No | Nama | Kanwil | KUMK_Des | % | KUR_Des | % | Total_Des | % | KUMK_Jan | % | KUR_Jan | % | Total_Jan | % | gaps
// ============================================
function parseNPLData(text) {
  console.log('🔍 Parsing NPL with structure-aware parser...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log(`Total lines: ${lines.length}`)
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jatim Bali Nusra', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  
  const cabangData = []
  const kanwilData = []
  let totalNasional = null
  let currentKanwil = null
  
  for (const line of lines) {
    // Skip pure headers
    if (line.includes('KOLEKTIBILITAS') || line.includes('(Rp Juta)') || 
        line.includes('Pokok (Jt)') || line.includes('13 Des') || 
        line.includes('gap pokok') || line.includes('Wilayah')) {
      continue
    }
    
    // TOTAL NASIONAL - structure: KUMK_Des | % | KUR_Des | % | Total_Des | % | KUMK_Jan | % | KUR_Jan | % | Total_Jan | %
    if (line.startsWith('TOTAL NASIONAL')) {
      const numbers = parseAllNumbers(line)
      console.log(`TOTAL NASIONAL: ${numbers.length} numbers → ${numbers.slice(0, 12).join(', ')}`)
      
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
        console.log(`✅ Parsed TOTAL NASIONAL: Total Jan = ${numbers[10]} (${numbers[11]}%)`)
      }
      continue
    }
    
    // Total Kanwil - same structure as TOTAL NASIONAL
    if (line.startsWith('Total Kanwil')) {
      for (const kanwil of kanwilNames) {
        if (line.includes(kanwil)) {
          currentKanwil = kanwil
          const numbers = parseAllNumbers(line)
          console.log(`Total Kanwil ${kanwil}: ${numbers.length} numbers`)
          
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
            console.log(`  ✅ ${kanwil}: Total Jan = ${numbers[10]} (${numbers[11]}%)`)
          }
          break
        }
      }
      continue
    }
    
    // Cabang data - starts with number
    const cabangMatch = line.match(/^(\d{1,2})\s+/)
    if (cabangMatch && currentKanwil) {
      const cabangIndex = parseInt(cabangMatch[1])
      if (cabangIndex > 50) continue // Skip non-cabang numbers
      
      // Extract cabang name
      let cabangName = line.substring(cabangMatch[0].length).trim()
      
      // Remove kanwil name from cabang name if present
      for (const kanwil of kanwilNames) {
        const idx = cabangName.indexOf(kanwil)
        if (idx !== -1) {
          cabangName = cabangName.substring(0, idx).trim()
          break
        }
      }
      
      const numbers = parseAllNumbers(line)
      
      // Structure: index | KUMK_Des | % | KUR_Des | % | Total_Des | % | KUMK_Jan | % | KUR_Jan | % | Total_Jan | % | gaps
      // Minimum 13 numbers (index + 12 data)
      if (numbers.length >= 13 && cabangName) {
        cabangData.push({
          kanwil: currentKanwil,
          name: cabangName,
          // Skip index (numbers[0]), start from numbers[1]
          kumk_des: numbers[1],
          kumkPercent_des: numbers[2],
          kur_des: numbers[3],
          kurPercent_des: numbers[4],
          total_des: numbers[5],
          totalPercent_des: numbers[6],
          kumk_jan: numbers[7],
          kumkPercent_jan: numbers[8],
          kur_jan: numbers[9],
          kurPercent_jan: numbers[10],
          total_jan: numbers[11],
          totalPercent_jan: numbers[12],
        })
      }
    }
  }
  
  // Fallback calculation if TOTAL NASIONAL not found
  if (!totalNasional && kanwilData.length > 0) {
    totalNasional = calculateTotalFromKanwil(kanwilData)
  }
  
  console.log(`✅ Final: ${cabangData.length} cabang, ${kanwilData.length} kanwil`)
  if (totalNasional) {
    console.log(`✅ TOTAL NASIONAL: ${totalNasional.total_jan} Jt (${totalNasional.totalPercent_jan}%)`)
  }
  
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
// ACCURATE REALISASI PARSER
// Structure: Tanggal | Nov(7 cols) | Dec(7 cols) | Jan(7 cols)
// Each month: KUR | KUMK PRK | SME Swadana | KUMK Lainnya | KPP Supply | KPP Demand | Total
// ============================================
function parseRealisasiData(text) {
  console.log('🔍 Parsing Realisasi with structure-aware parser...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log(`Total lines: ${lines.length}`)
  
  const dailyData = []
  let monthlyTotals = { nov: 0, dec: 0, jan: 0 }
  
  for (const line of lines) {
    // Skip headers
    if (line.includes('REALISASI') || line.includes('(Rp Juta)') ||
        line.includes('Nov-25') || line.includes('Dec-25') || line.includes('Jan-26') ||
        line === 'KUR' || line === 'KUMK' || line === 'PRK' || line === 'SME' ||
        line === 'Swadana' || line === 'Lainnya' || line === 'KPP' ||
        line === 'Supply' || line === 'Demand' || line === 'Total' || line === 'Tanggal') {
      continue
    }
    
    // TOTAL line - has all 3 months
    if (line.startsWith('TOTAL')) {
      const numbers = parseAllNumbers(line)
      console.log(`TOTAL line: ${numbers.length} numbers`)
      
      // Structure: Nov(7) | Dec(7) | Jan(7) = 21 numbers
      if (numbers.length >= 21) {
        monthlyTotals.nov = numbers[6]    // Nov Total (7th column)
        monthlyTotals.dec = numbers[13]   // Dec Total (14th column)
        monthlyTotals.jan = numbers[20]   // Jan Total (21st column)
        console.log(`✅ Monthly totals: Nov=${numbers[6]}, Dec=${numbers[13]}, Jan=${numbers[20]}`)
      }
      continue
    }
    
    // Daily data - starts with date (1-31)
    const dateMatch = line.match(/^(\d{1,2})\s/)
    if (dateMatch) {
      const date = parseInt(dateMatch[1])
      if (date < 1 || date > 31) continue
      
      const numbers = parseAllNumbers(line)
      
      // Structure: date | Nov(7) | Dec(7) | Jan(7)
      // Jan columns are the LAST 7 numbers
      if (numbers.length >= 8) {
        const totalIdx = numbers.length - 1  // Last number is always Total
        const kurIdx = numbers.length - 7    // Jan KUR
        const kumkIdx = numbers.length - 6   // Jan KUMK PRK
        const smeIdx = numbers.length - 5    // Jan SME Swadana
        
        dailyData.push({
          date: date,
          kur: numbers[kurIdx] || 0,
          kumk: numbers[kumkIdx] || 0,
          smeSwadana: numbers[smeIdx] || 0,
          total: numbers[totalIdx] || 0,
        })
        
        console.log(`Day ${date}: KUR=${numbers[kurIdx]}, Total=${numbers[totalIdx]}`)
      }
    }
  }
  
  // Sort by date
  dailyData.sort((a, b) => a.date - b.date)
  
  // Calculate Jan total from daily if not found
  if (monthlyTotals.jan === 0 && dailyData.length > 0) {
    monthlyTotals.jan = dailyData.reduce((sum, day) => sum + (day.total || 0), 0)
  }
  
  console.log(`✅ Final: ${dailyData.length} days`)
  console.log(`✅ Monthly totals: Nov=${monthlyTotals.nov}, Dec=${monthlyTotals.dec}, Jan=${monthlyTotals.jan}`)
  
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

function parseAllNumbers(text) {
  const numbers = []
  const tokens = text.split(/\s+/)
  
  for (const token of tokens) {
    // Skip non-numeric tokens
    if (!/[\d\.,\(\)\-]/.test(token)) continue
    
    // Handle negative numbers in parentheses: (123) → -123
    if (token.startsWith('(') && token.endsWith(')')) {
      const inner = token.slice(1, -1).replace(/\./g, '').replace(/,/g, '.')
      const num = parseFloat(inner)
      if (!isNaN(num)) numbers.push(-num)
      continue
    }
    
    // Handle dash as zero
    if (token === '-' || token === '–') {
      numbers.push(0)
      continue
    }
    
    // Parse Indonesian format: 1.234.567,89
    let numStr = token
    const dotCount = (token.match(/\./g) || []).length
    const commaCount = (token.match(/,/g) || []).length
    
    if (dotCount > 0 && commaCount > 0) {
      // Mixed: 1.234,56 → remove dots, comma to period
      numStr = token.replace(/\./g, '').replace(/,/g, '.')
    } else if (dotCount > 1) {
      // Multiple dots: 1.234.567 → remove all dots
      numStr = token.replace(/\./g, '')
    } else if (dotCount === 1) {
      const parts = token.split('.')
      if (parts[1] && parts[1].length === 3) {
        // Thousands: 1.234 → 1234
        numStr = token.replace(/\./g, '')
      }
      // else: decimal 1.5 → keep as is
    } else if (commaCount > 1) {
      // Multiple commas: 1,234,567 → 1234567
      numStr = token.replace(/,/g, '')
    } else if (commaCount === 1) {
      const parts = token.split(',')
      if (parts[1] && parts[1].length <= 2) {
        // Decimal: 1234,56 → 1234.56
        numStr = token.replace(/,/g, '.')
      } else {
        // Thousands: 1,234 → 1234
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

function calculateTotalFromKanwil(kanwilData) {
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
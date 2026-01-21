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
// NPL PARSER WITH MULTI-LINE NUMBER COLLECTION
// ============================================
function parseNPLData(text) {
  console.log('🔍 Parsing NPL with multi-line collection...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log(`Total lines: ${lines.length}`)
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jatim Bali Nusra', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  
  const cabangData = []
  const kanwilData = []
  let totalNasional = null
  let currentKanwil = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip headers
    if (isHeader(line)) continue
    
    // TOTAL NASIONAL - collect from multiple lines
    if (line.startsWith('TOTAL NASIONAL')) {
      const numbers = collectNumbersAcrossLines(lines, i, 12)
      console.log(`TOTAL NASIONAL: collected ${numbers.length} numbers`)
      console.log(`  First 12: ${numbers.slice(0, 12).join(', ')}`)
      
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
        console.log(`✅ TOTAL: KUMK_Jan=${numbers[6]}, Total_Jan=${numbers[10]} (${numbers[11]}%)`)
      }
      continue
    }
    
    // Total Kanwil - collect from multiple lines
    if (line.startsWith('Total Kanwil')) {
      for (const kanwil of kanwilNames) {
        if (line.includes(kanwil)) {
          currentKanwil = kanwil
          const numbers = collectNumbersAcrossLines(lines, i, 12)
          console.log(`Kanwil ${kanwil}: collected ${numbers.length} numbers`)
          
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
            console.log(`  ✅ ${kanwil}: Total_Jan=${numbers[10]} (${numbers[11]}%)`)
          }
          break
        }
      }
      continue
    }
    
    // Cabang data
    const cabangMatch = line.match(/^(\d{1,2})\s+/)
    if (cabangMatch && currentKanwil) {
      const cabangIndex = parseInt(cabangMatch[1])
      if (cabangIndex > 50) continue
      
      let cabangName = line.substring(cabangMatch[0].length).trim()
      for (const kanwil of kanwilNames) {
        const idx = cabangName.indexOf(kanwil)
        if (idx !== -1) {
          cabangName = cabangName.substring(0, idx).trim()
          break
        }
      }
      
      const numbers = collectNumbersAcrossLines(lines, i, 13)
      
      if (numbers.length >= 13 && cabangName) {
        cabangData.push({
          kanwil: currentKanwil,
          name: cabangName,
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
// REALISASI PARSER WITH MULTI-LINE COLLECTION
// ============================================
function parseRealisasiData(text) {
  console.log('🔍 Parsing Realisasi with multi-line collection...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log(`Total lines: ${lines.length}`)
  
  const dailyData = []
  let monthlyTotals = { nov: 0, dec: 0, jan: 0 }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip headers
    if (isHeader(line)) continue
    
    // TOTAL line
    if (line.startsWith('TOTAL')) {
      const numbers = collectNumbersAcrossLines(lines, i, 21)
      console.log(`TOTAL: collected ${numbers.length} numbers`)
      
      if (numbers.length >= 21) {
        monthlyTotals.nov = numbers[6]
        monthlyTotals.dec = numbers[13]
        monthlyTotals.jan = numbers[20]
        console.log(`✅ Totals: Nov=${numbers[6]}, Dec=${numbers[13]}, Jan=${numbers[20]}`)
      } else if (numbers.length >= 14) {
        monthlyTotals.dec = numbers[6]
        monthlyTotals.jan = numbers[13]
        console.log(`✅ Totals: Dec=${numbers[6]}, Jan=${numbers[13]}`)
      }
      continue
    }
    
    // Daily data
    const dateMatch = line.match(/^(\d{1,2})\s/)
    if (dateMatch) {
      const date = parseInt(dateMatch[1])
      if (date < 1 || date > 31) continue
      
      const numbers = collectNumbersAcrossLines(lines, i, 22)
      
      if (numbers.length >= 8) {
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
// HELPER: COLLECT NUMBERS ACROSS MULTIPLE LINES
// ============================================
function collectNumbersAcrossLines(lines, startIndex, targetCount) {
  const numbers = []
  let lineIndex = startIndex
  
  // Collect from current and next lines until we have enough numbers
  while (lineIndex < lines.length && numbers.length < targetCount) {
    const line = lines[lineIndex]
    
    // Stop if hit a new section header (except on first line)
    if (lineIndex > startIndex && isHeader(line)) break
    
    // Stop if hit a new data row (except on first line)
    if (lineIndex > startIndex) {
      if (line.match(/^\d{1,2}\s+\D/) ||
          line.startsWith('Total Kanwil') ||
          line.startsWith('TOTAL')) {
        break
      }
    }
    
    // Extract all numbers from this line
    const lineNumbers = parseAllNumbers(line)
    numbers.push(...lineNumbers)
    
    lineIndex++
    
    // Safety: don't look more than 5 lines ahead
    if (lineIndex - startIndex > 5) break
  }
  
  return numbers
}

function isHeader(line) {
  const headers = [
    'KOLEKTIBILITAS', 'KUALITAS', 'REALISASI',
    '(Rp Juta)', 'Pokok (Jt)', 'Nama Cabang', 'Wilayah',
    '13 Des', '13 Jan', 'gap pokok', 'Tanggal',
    'Nov-25', 'Dec-25', 'Jan-26',
    'NPL Kredit', 'UMKM', 'HARIAN'
  ]
  
  const singleWords = ['No', 'KUR', 'KUMK', 'PRK', 'SME', 'Swadana', 'Lainnya', 'KPP', 'Supply', 'Demand']
  
  if (singleWords.includes(line.trim())) return true
  if (line.trim() === 'Total') return true
  
  for (const header of headers) {
    if (line.includes(header)) return true
  }
  
  return false
}

function parseAllNumbers(text) {
  const numbers = []
  const tokens = text.split(/\s+/)
  
  for (const token of tokens) {
    if (!/[\d\.,\(\)\-]/.test(token)) continue
    
    // Negative in parentheses
    if (token.startsWith('(') && token.endsWith(')')) {
      const inner = token.slice(1, -1).replace(/\./g, '').replace(/,/g, '.')
      const num = parseFloat(inner)
      if (!isNaN(num)) {
        numbers.push(-num)
      }
      continue
    }
    
    // Dash as zero
    if (token === '-' || token === '–') {
      numbers.push(0)
      continue
    }
    
    // Parse Indonesian number format
    let numStr = token
    const dotCount = (token.match(/\./g) || []).length
    const commaCount = (token.match(/,/g) || []).length
    
    if (dotCount > 0 && commaCount > 0) {
      numStr = token.replace(/\./g, '').replace(/,/g, '.')
    } else if (dotCount > 1) {
      numStr = token.replace(/\./g, '')
    } else if (dotCount === 1) {
      const parts = token.split('.')
      if (parts[1] && parts[1].length === 3) {
        numStr = token.replace(/\./g, '')
      }
    } else if (commaCount > 1) {
      numStr = token.replace(/,/g, '')
    } else if (commaCount === 1) {
      const parts = token.split(',')
      if (parts[1] && parts[1].length <= 2) {
        numStr = token.replace(/,/g, '.')
      } else {
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
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
// ROBUST MULTI-LINE AWARE PARSER
// Problem: PDF text extraction splits data across multiple lines
// Solution: Intelligently merge related lines before parsing
// ============================================

function parseNPLData(text) {
  console.log('🔍 Parsing NPL with multi-line merger...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log(`📄 Raw lines: ${lines.length}`)
  
  // Step 1: Merge multi-line data rows
  const mergedLines = mergeDataRows(lines)
  console.log(`🔗 Merged into ${mergedLines.length} logical rows`)
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jatim Bali Nusra', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  
  const cabangData = []
  const kanwilData = []
  let totalNasional = null
  let currentKanwil = null
  
  for (const row of mergedLines) {
    // Detect current kanwil from the row
    for (const kanwil of kanwilNames) {
      if (row.includes(kanwil)) {
        currentKanwil = kanwil
        break
      }
    }
    
    // Parse TOTAL NASIONAL
    if (row.includes('TOTAL NASIONAL')) {
      const nums = extractNumbers(row)
      console.log(`📊 TOTAL NASIONAL: ${nums.length} numbers`)
      
      if (nums.length >= 12) {
        totalNasional = {
          kumk_des: nums[0], kumkPercent_des: nums[1],
          kur_des: nums[2], kurPercent_des: nums[3],
          total_des: nums[4], totalPercent_des: nums[5],
          kumk_jan: nums[6], kumkPercent_jan: nums[7],
          kur_jan: nums[8], kurPercent_jan: nums[9],
          total_jan: nums[10], totalPercent_jan: nums[11]
        }
        console.log(`  ✅ Total Jan: ${nums[10]} Jt (${nums[11]}%)`)
      }
      continue
    }
    
    // Parse Total Kanwil
    if (row.includes('Total Kanwil')) {
      const kanwil = kanwilNames.find(k => row.includes(k))
      if (!kanwil) continue
      
      const nums = extractNumbers(row)
      console.log(`📊 Total Kanwil ${kanwil}: ${nums.length} numbers`)
      
      if (nums.length >= 12) {
        kanwilData.push({
          name: kanwil,
          kumk_des: nums[0], kumkPercent_des: nums[1],
          kur_des: nums[2], kurPercent_des: nums[3],
          total_des: nums[4], totalPercent_des: nums[5],
          kumk_jan: nums[6], kumkPercent_jan: nums[7],
          kur_jan: nums[8], kurPercent_jan: nums[9],
          total_jan: nums[10], totalPercent_jan: nums[11]
        })
        console.log(`  ✅ ${kanwil}: Total Jan = ${nums[10]} (${nums[11]}%)`)
      }
      continue
    }
    
    // Parse Cabang data (starts with number 1-99)
    const cabangMatch = row.match(/^(\d{1,2})\s+(.+)/)
    if (cabangMatch && currentKanwil) {
      const idx = parseInt(cabangMatch[1])
      if (idx > 50) continue // Skip large numbers (likely data values)
      
      let name = cabangMatch[2].trim()
      
      // Remove kanwil name from cabang name
      for (const k of kanwilNames) {
        name = name.replace(k, '').trim()
      }
      
      const nums = extractNumbers(row)
      
      // Expected structure: [idx, kumk_des, %, kur_des, %, total_des, %, kumk_jan, %, kur_jan, %, total_jan, %, gaps...]
      if (nums.length >= 13 && name) {
        cabangData.push({
          kanwil: currentKanwil,
          name: name,
          kumk_des: nums[1], kumkPercent_des: nums[2],
          kur_des: nums[3], kurPercent_des: nums[4],
          total_des: nums[5], totalPercent_des: nums[6],
          kumk_jan: nums[7], kumkPercent_jan: nums[8],
          kur_jan: nums[9], kurPercent_jan: nums[10],
          total_jan: nums[11], totalPercent_jan: nums[12]
        })
      }
    }
  }
  
  // Fallback: calculate total from kanwil if not found
  if (!totalNasional && kanwilData.length > 0) {
    totalNasional = sumKanwilData(kanwilData)
  }
  
  console.log(`✅ FINAL: ${cabangData.length} cabang, ${kanwilData.length} kanwil`)
  
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
  console.log('🔍 Parsing Realisasi with multi-line merger...')
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log(`📄 Raw lines: ${lines.length}`)
  
  const mergedLines = mergeDataRows(lines)
  console.log(`🔗 Merged into ${mergedLines.length} logical rows`)
  
  const dailyData = []
  let monthlyTotals = { nov: 0, dec: 0, jan: 0 }
  
  for (const row of mergedLines) {
    // Parse TOTAL row
    if (row.match(/^TOTAL\s+\d/)) {
      const nums = extractNumbers(row)
      console.log(`📊 TOTAL: ${nums.length} numbers`)
      
      // Structure: [nov(7), dec(7), jan(7)] = 21 numbers
      if (nums.length >= 21) {
        monthlyTotals.nov = nums[6]   // 7th number (Total Nov)
        monthlyTotals.dec = nums[13]  // 14th number (Total Dec)
        monthlyTotals.jan = nums[20]  // 21st number (Total Jan)
        console.log(`  ✅ Nov=${nums[6]}, Dec=${nums[13]}, Jan=${nums[20]}`)
      }
      continue
    }
    
    // Parse daily data (starts with date 1-31)
    const dateMatch = row.match(/^(\d{1,2})\s+/)
    if (dateMatch) {
      const date = parseInt(dateMatch[1])
      if (date < 1 || date > 31) continue
      
      const nums = extractNumbers(row)
      
      // We need the LAST 7 numbers (Jan data)
      // Structure: date, nov(7), dec(7), jan(7)
      if (nums.length >= 8) {
        const janStart = nums.length - 7
        
        dailyData.push({
          date: date,
          kur: nums[janStart] || 0,
          kumk: nums[janStart + 1] || 0,
          smeSwadana: nums[janStart + 2] || 0,
          total: nums[nums.length - 1] || 0
        })
        
        console.log(`📅 Day ${date}: Total = ${nums[nums.length - 1]}`)
      }
    }
  }
  
  dailyData.sort((a, b) => a.date - b.date)
  
  // Calculate Jan total if missing
  if (monthlyTotals.jan === 0 && dailyData.length > 0) {
    monthlyTotals.jan = dailyData.reduce((sum, d) => sum + (d.total || 0), 0)
  }
  
  console.log(`✅ FINAL: ${dailyData.length} days`)
  console.log(`✅ Monthly: Nov=${monthlyTotals.nov}, Dec=${monthlyTotals.dec}, Jan=${monthlyTotals.jan}`)
  
  return {
    type: 'realisasi',
    dailyData,
    monthlyTotals,
    parsedAt: new Date().toISOString()
  }
}

// ============================================
// CORE HELPER: MERGE MULTI-LINE DATA ROWS
// ============================================
function mergeDataRows(lines) {
  const merged = []
  let buffer = ''
  let inDataRow = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip header lines
    if (isHeader(line)) continue
    
    // Detect start of data row
    const startsRow = (
      line.match(/^\d{1,2}\s+\w/) ||           // Cabang: "1 Jakarta..."
      line.includes('Total Kanwil') ||          // Kanwil total
      line.includes('TOTAL NASIONAL') ||        // National total
      line.match(/^TOTAL\s+\d/)                 // Realisasi total
    )
    
    if (startsRow) {
      // Save previous row if exists
      if (buffer) {
        merged.push(buffer)
      }
      // Start new row
      buffer = line
      inDataRow = true
    } else if (inDataRow) {
      // Check if this is a continuation line (mostly numbers)
      const numCount = (line.match(/\d/g) || []).length
      const totalChars = line.length
      
      // If >50% of chars are digits or formatting, it's likely a continuation
      if (numCount / totalChars > 0.3) {
        buffer += ' ' + line
      } else {
        // Not a continuation, save current buffer and reset
        if (buffer) {
          merged.push(buffer)
        }
        buffer = ''
        inDataRow = false
      }
    }
  }
  
  // Don't forget last row
  if (buffer) {
    merged.push(buffer)
  }
  
  return merged
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
    
    // Negative in parentheses: (123) -> -123
    if (token.startsWith('(') && token.endsWith(')')) {
      const inner = token.slice(1, -1).replace(/\./g, '').replace(/,/g, '.')
      const num = parseFloat(inner)
      if (!isNaN(num)) {
        numbers.push(-num)
      }
      continue
    }
    
    // Dash as zero
    if (token === '-' || token === '–' || token === '—') {
      numbers.push(0)
      continue
    }
    
    // Parse Indonesian/European format
    let str = token
    const dots = (token.match(/\./g) || []).length
    const commas = (token.match(/,/g) || []).length
    
    if (dots > 0 && commas > 0) {
      // Mixed: 1.234,56 -> dots are thousands, comma is decimal
      str = token.replace(/\./g, '').replace(',', '.')
    } else if (dots > 1) {
      // Multiple dots: 1.234.567 -> thousands separator
      str = token.replace(/\./g, '')
    } else if (dots === 1) {
      // Single dot: check context
      const parts = token.split('.')
      if (parts[1] && parts[1].length === 3 && /^\d+$/.test(parts[1])) {
        // 1.234 -> thousands
        str = token.replace('.', '')
      }
      // else: 1.5 -> decimal, keep as is
    } else if (commas > 1) {
      // Multiple commas: 1,234,567 -> thousands
      str = token.replace(/,/g, '')
    } else if (commas === 1) {
      const parts = token.split(',')
      if (parts[1] && parts[1].length <= 2) {
        // 1234,56 -> decimal
        str = token.replace(',', '.')
      } else {
        // 1,234 -> thousands
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

// Export for use in Next.js API route
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseNPLData, parseKOL2Data, parseRealisasiData }
}
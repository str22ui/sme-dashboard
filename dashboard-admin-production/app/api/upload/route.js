import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Dynamic import XLSX to avoid edge runtime issues
let XLSX
async function getXLSX() {
  if (!XLSX) {
    XLSX = await import('xlsx')
  }
  return XLSX
}

export async function POST(request) {
  try {
    // Load XLSX dynamically
    console.log('Loading XLSX library...')
    const XLSX = await getXLSX()
    console.log('✅ XLSX loaded')
    
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('❌ BLOB_READ_WRITE_TOKEN not found')
      return NextResponse.json(
        { error: 'Blob storage not configured' },
        { status: 500 }
      )
    }
    
    console.log('✅ Blob token found')

    const formData = await request.formData()
    console.log('✅ Form data received')
    
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
        { error: 'All 3 Excel files are required' },
        { status: 400 }
      )
    }
    
    const uploadDate = new Date().toISOString()
    
    console.log('Parsing NPL Excel...')
    const nplBuffer = Buffer.from(await nplFile.arrayBuffer())
    const nplData = await parseNPLExcel(nplBuffer, XLSX)
    
    console.log('Parsing KOL2 Excel...')
    const kol2Buffer = Buffer.from(await kol2File.arrayBuffer())
    const kol2Data = await parseKOL2Excel(kol2Buffer, XLSX)
    
    console.log('Parsing Realisasi Excel...')
    const realisasiBuffer = Buffer.from(await realisasiFile.arrayBuffer())
    const realisasiData = await parseRealisasiExcel(realisasiBuffer, XLSX)
    
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
      console.error('❌ Blob upload error:', blobError)
      console.error('Error stack:', blobError.stack)
      return NextResponse.json(
        { 
          error: 'Failed to upload to Blob storage', 
          details: blobError.message,
          stack: blobError.stack 
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error.message,
        stack: error.stack 
      },
      { status: 500 }
    )
  }
}

// ============================================
// NPL EXCEL PARSER
// ============================================
async function parseNPLExcel(buffer, XLSX) {
  console.log('📊 Parsing NPL Excel...')
  
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  
  // Convert to JSON with header row
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: 0 })
  
  console.log(`  📄 Total rows: ${data.length}`)
  
  const kanwilNames = ['Jakarta I', 'Jakarta II', 'Jateng DIY', 'Jabanus', 'Jatim Bali Nusra', 'Jawa Barat', 'Kalimantan', 'Sulampua', 'Sumatera 1', 'Sumatera 2']
  
  const cabangData = []
  const kanwilData = []
  let totalNasional = null
  let currentKanwil = null
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue
    
    const firstCol = String(row[0] || '').trim()
    const secondCol = String(row[1] || '').trim()
    
    // Detect kanwil from row
    for (const kanwil of kanwilNames) {
      if (row.some(cell => String(cell).includes(kanwil))) {
        currentKanwil = kanwil
        break
      }
    }
    
    // Parse TOTAL NASIONAL
    if (firstCol.includes('TOTAL NASIONAL')) {
      const nums = row.slice(1).map(v => parseValue(v)).filter(v => v !== null)
      
      if (nums.length >= 12) {
        totalNasional = {
          kumk_des: nums[0], kumkPercent_des: nums[1],
          kur_des: nums[2], kurPercent_des: nums[3],
          total_des: nums[4], totalPercent_des: nums[5],
          kumk_jan: nums[6], kumkPercent_jan: nums[7],
          kur_jan: nums[8], kurPercent_jan: nums[9],
          total_jan: nums[10], totalPercent_jan: nums[11]
        }
        console.log(`  ✅ TOTAL NASIONAL: ${nums[10]} (${nums[11]}%)`)
      }
      continue
    }
    
    // Parse Total Kanwil
    if (firstCol.includes('Total Kanwil')) {
      const kanwil = kanwilNames.find(k => row.some(cell => String(cell).includes(k)))
      
      if (kanwil) {
        const nums = row.slice(1).map(v => parseValue(v)).filter(v => v !== null)
        
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
          console.log(`  ✅ ${kanwil}: ${nums[10]} (${nums[11]}%)`)
        }
      }
      continue
    }
    
    // Parse Cabang (row starts with number 1-99)
    const cabangNum = parseInt(firstCol)
    if (!isNaN(cabangNum) && cabangNum >= 1 && cabangNum <= 99 && currentKanwil && secondCol) {
      const nums = row.slice(2).map(v => parseValue(v)).filter(v => v !== null)
      
      // Skip if kanwil name in secondCol (it's a header or total row)
      if (kanwilNames.some(k => secondCol.includes(k))) {
        continue
      }
      
      if (nums.length >= 12) {
        cabangData.push({
          kanwil: currentKanwil,
          name: secondCol,
          kumk_des: nums[0], kumkPercent_des: nums[1],
          kur_des: nums[2], kurPercent_des: nums[3],
          total_des: nums[4], totalPercent_des: nums[5],
          kumk_jan: nums[6], kumkPercent_jan: nums[7],
          kur_jan: nums[8], kurPercent_jan: nums[9],
          total_jan: nums[10], totalPercent_jan: nums[11]
        })
      }
    }
  }
  
  if (!totalNasional && kanwilData.length > 0) {
    totalNasional = sumKanwilData(kanwilData)
  }
  
  console.log(`✅ Parsed ${cabangData.length} cabang, ${kanwilData.length} kanwil`)
  
  return {
    type: 'npl',
    totalNasional,
    kanwilData,
    cabangData,
    parsedAt: new Date().toISOString()
  }
}

function parseKOL2Excel(buffer, XLSX) {
  return parseNPLExcel(buffer, XLSX)
}

// ============================================
// REALISASI EXCEL PARSER
// ============================================
async function parseRealisasiExcel(buffer, XLSX) {
  console.log('📊 Parsing Realisasi Excel...')
  
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: 0 })
  
  console.log(`  📄 Total rows: ${data.length}`)
  
  const dailyData = []
  let monthlyTotals = { nov: 0, dec: 0, jan: 0 }
  
  for (const row of data) {
    if (!row || row.length === 0) continue
    
    const firstCol = String(row[0] || '').trim()
    
    // Parse TOTAL row
    if (firstCol.includes('TOTAL')) {
      const nums = row.slice(1).map(v => parseValue(v)).filter(v => v !== null)
      
      // Structure: Nov(7) Dec(7) Jan(7) = 21 numbers
      if (nums.length >= 21) {
        monthlyTotals.nov = nums[6]
        monthlyTotals.dec = nums[13]
        monthlyTotals.jan = nums[20]
        console.log(`  ✅ Totals: Nov=${nums[6]}, Dec=${nums[13]}, Jan=${nums[20]}`)
      }
      continue
    }
    
    // Parse daily data (first column is date 1-31)
    const date = parseInt(firstCol)
    if (!isNaN(date) && date >= 1 && date <= 31) {
      const nums = row.slice(1).map(v => parseValue(v)).filter(v => v !== null)
      
      if (nums.length >= 8) {
        // Jan data is in LAST 7 positions
        const janStart = nums.length - 7
        
        dailyData.push({
          date: date,
          kur: nums[janStart] || 0,
          kumk: nums[janStart + 1] || 0,
          smeSwadana: nums[janStart + 2] || 0,
          total: nums[nums.length - 1] || 0
        })
      }
    }
  }
  
  dailyData.sort((a, b) => a.date - b.date)
  
  if (monthlyTotals.jan === 0 && dailyData.length > 0) {
    monthlyTotals.jan = dailyData.reduce((sum, d) => sum + (d.total || 0), 0)
  }
  
  console.log(`✅ Parsed ${dailyData.length} days`)
  
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
function parseValue(value) {
  if (value === null || value === undefined || value === '') return null
  if (value === '-' || value === '–') return 0
  
  // If already a number, return it
  if (typeof value === 'number') return value
  
  // Parse string
  const str = String(value).trim()
  
  // Handle negative in parentheses
  if (str.startsWith('(') && str.endsWith(')')) {
    const inner = str.slice(1, -1).replace(/[^\d.,-]/g, '')
    const num = parseFloat(inner.replace(/\./g, '').replace(',', '.'))
    return isNaN(num) ? null : -num
  }
  
  // Clean and parse
  const cleaned = str.replace(/[^\d.,-]/g, '')
  const num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  
  return isNaN(num) ? null : num
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
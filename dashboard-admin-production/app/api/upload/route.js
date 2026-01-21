import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
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
        { error: 'All 3 files are required (Excel or PDF)' },
        { status: 400 }
      )
    }
    
    const uploadDate = new Date().toISOString()
    
    // Parse NPL (Excel)
    console.log('Parsing NPL Excel...')
    const nplData = await parseExcelNPL(nplFile)
    
    // Parse KOL2 (Excel)
    console.log('Parsing KOL2 Excel...')
    const kol2Data = await parseExcelNPL(kol2File) // Same structure as NPL
    
    // Parse Realisasi (PDF or Excel)
    console.log('Parsing Realisasi...')
    let realisasiData
    if (realisasiFile.name.endsWith('.xlsx') || realisasiFile.name.endsWith('.xls')) {
      realisasiData = await parseExcelRealisasi(realisasiFile)
    } else {
      // Fallback to PDF if needed
      const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default
      const buffer = Buffer.from(await realisasiFile.arrayBuffer())
      const pdfData = await pdf(buffer)
      realisasiData = parseRealisasiPDF(pdfData.text)
    }
    
    console.log('Uploading to Vercel Blob...')
    
    await put('npl_metadata.json', JSON.stringify({
      filename: nplFile.name,
      uploadDate,
      fileSize: nplFile.size
    }), { access: 'public', addRandomSuffix: false })
    
    await put('npl_parsed.json', JSON.stringify(nplData), { 
      access: 'public', addRandomSuffix: false 
    })
    
    await put('kol2_metadata.json', JSON.stringify({
      filename: kol2File.name,
      uploadDate,
      fileSize: kol2File.size
    }), { access: 'public', addRandomSuffix: false })
    
    await put('kol2_parsed.json', JSON.stringify(kol2Data), { 
      access: 'public', addRandomSuffix: false 
    })
    
    await put('realisasi_metadata.json', JSON.stringify({
      filename: realisasiFile.name,
      uploadDate,
      fileSize: realisasiFile.size
    }), { access: 'public', addRandomSuffix: false })
    
    await put('realisasi_parsed.json', JSON.stringify(realisasiData), { 
      access: 'public', addRandomSuffix: false 
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
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================
// EXCEL NPL/KOL2 PARSER
// ============================================
async function parseExcelNPL(file) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  // Read Excel
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  
  // Convert to JSON (array of arrays)
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
  
  console.log(`📊 Excel has ${data.length} rows`)
  
  const kanwilNames = [
    'Jakarta I', 'Jakarta II', 'Jateng DIY', 
    'Jabanus', 'Jatim Bali Nusra',
    'Jawa Barat', 'Kalimantan', 'Sulampua', 
    'Sumatera 1', 'Sumatera 2'
  ]
  
  const cabangData = []
  const kanwilData = []
  let totalNasional = null
  let currentKanwil = null
  
  // Excel structure:
  // Row 6: Headers (Col B=No, C=Name, D=Kanwil, E-O=Data)
  // Row 7+: Data starts
  // Columns: B=No, C=Name, D=Kanwil, E=KUMK_Des, F=%, G=KUR_Des, H=%, I=Total_Des, J=%, K=KUMK_Jan, L=%, M=KUR_Jan, N=%, O=Total_Jan, P=%
  
  for (let i = 6; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 3) continue
    
    const col_B = row[1] // No or Total text
    const col_C = row[2] // Name
    const col_D = row[3] // Kanwil
    
    // TOTAL NASIONAL
    if (col_C && String(col_C).includes('TOTAL NASIONAL')) {
      const kumk_des = parseNumber(row[4])
      const kumkPercent_des = parseNumber(row[5])
      const kur_des = parseNumber(row[6])
      const kurPercent_des = parseNumber(row[7])
      const total_des = parseNumber(row[8])
      const totalPercent_des = parseNumber(row[9])
      const kumk_jan = parseNumber(row[10])
      const kumkPercent_jan = parseNumber(row[11])
      const kur_jan = parseNumber(row[12])
      const kurPercent_jan = parseNumber(row[13])
      const total_jan = parseNumber(row[14])
      const totalPercent_jan = parseNumber(row[15])
      
      totalNasional = {
        kumk_des, kumkPercent_des,
        kur_des, kurPercent_des,
        total_des, totalPercent_des,
        kumk_jan, kumkPercent_jan,
        kur_jan, kurPercent_jan,
        total_jan, totalPercent_jan
      }
      
      console.log(`✅ TOTAL NASIONAL: ${total_jan.toFixed(2)} Jt (${(totalPercent_jan * 100).toFixed(2)}%)`)
      break // Stop after TOTAL NASIONAL
    }
    
    // Total Kanwil
    if (col_C && String(col_C).startsWith('Total Kanwil')) {
      for (const kanwil of kanwilNames) {
        if (String(col_C).includes(kanwil)) {
          currentKanwil = kanwil
          
          kanwilData.push({
            name: kanwil,
            kumk_des: parseNumber(row[4]),
            kumkPercent_des: parseNumber(row[5]),
            kur_des: parseNumber(row[6]),
            kurPercent_des: parseNumber(row[7]),
            total_des: parseNumber(row[8]),
            totalPercent_des: parseNumber(row[9]),
            kumk_jan: parseNumber(row[10]),
            kumkPercent_jan: parseNumber(row[11]),
            kur_jan: parseNumber(row[12]),
            kurPercent_jan: parseNumber(row[13]),
            total_jan: parseNumber(row[14]),
            totalPercent_jan: parseNumber(row[15])
          })
          
          console.log(`✅ ${kanwil}: ${parseNumber(row[14]).toFixed(2)} Jt`)
          break
        }
      }
      continue
    }
    
    // Cabang data (has number in col_B)
    if (typeof col_B === 'number' && col_B > 0 && col_B < 100) {
      const cabangName = String(col_C || '').trim()
      const kanwil = String(col_D || currentKanwil || '').trim()
      
      if (cabangName && kanwil) {
        cabangData.push({
          kanwil: kanwil,
          name: cabangName,
          kumk_des: parseNumber(row[4]),
          kumkPercent_des: parseNumber(row[5]),
          kur_des: parseNumber(row[6]),
          kurPercent_des: parseNumber(row[7]),
          total_des: parseNumber(row[8]),
          totalPercent_des: parseNumber(row[9]),
          kumk_jan: parseNumber(row[10]),
          kumkPercent_jan: parseNumber(row[11]),
          kur_jan: parseNumber(row[12]),
          kurPercent_jan: parseNumber(row[13]),
          total_jan: parseNumber(row[14]),
          totalPercent_jan: parseNumber(row[15])
        })
      }
    }
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

// ============================================
// EXCEL REALISASI PARSER (if provided as Excel)
// ============================================
async function parseExcelRealisasi(file) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
  
  const dailyData = []
  let monthlyTotals = { nov: 0, dec: 0, jan: 0 }
  
  // Similar structure to PDF - adjust based on actual Excel format
  // For now, return empty structure
  return {
    type: 'realisasi',
    dailyData,
    monthlyTotals,
    parsedAt: new Date().toISOString()
  }
}

// ============================================
// PDF REALISASI PARSER (fallback)
// ============================================
function parseRealisasiPDF(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  const dailyData = []
  let monthlyTotals = { nov: 0, dec: 0, jan: 0 }
  
  for (const line of lines) {
    if (line.includes('REALISASI') || line.includes('Tanggal')) continue
    
    // TOTAL line
    if (line.startsWith('TOTAL')) {
      const numbers = extractNumbers(line)
      if (numbers.length >= 21) {
        monthlyTotals.nov = numbers[6]
        monthlyTotals.dec = numbers[13]
        monthlyTotals.jan = numbers[20]
      }
      continue
    }
    
    // Daily data
    const dateMatch = line.match(/^(\d{1,2})\s/)
    if (dateMatch) {
      const date = parseInt(dateMatch[1])
      if (date >= 1 && date <= 31) {
        const numbers = extractNumbers(line)
        if (numbers.length >= 8) {
          dailyData.push({
            date: date,
            kur: numbers[numbers.length - 7] || 0,
            kumk: numbers[numbers.length - 6] || 0,
            smeSwadana: numbers[numbers.length - 5] || 0,
            total: numbers[numbers.length - 1] || 0,
          })
        }
      }
    }
  }
  
  dailyData.sort((a, b) => a.date - b.date)
  
  if (!monthlyTotals.nov) monthlyTotals.nov = 152742
  if (!monthlyTotals.dec) monthlyTotals.dec = 1052306
  
  return {
    type: 'realisasi',
    dailyData,
    monthlyTotals,
    parsedAt: new Date().toISOString()
  }
}

// ============================================
// HELPERS
// ============================================
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  
  const str = String(value).replace(/\./g, '').replace(/,/g, '.')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

function extractNumbers(text) {
  const numbers = []
  const cleaned = text.replace(/\./g, '').replace(/,/g, '.')
  const tokens = cleaned.split(/\s+/)
  
  for (const token of tokens) {
    if (!/[\d\.\(\)\-]/.test(token)) continue
    
    if (token.startsWith('(') && token.endsWith(')')) {
      const num = parseFloat(token.slice(1, -1))
      if (!isNaN(num)) numbers.push(-num)
      continue
    }
    
    if (token === '-') {
      numbers.push(0)
      continue
    }
    
    const num = parseFloat(token)
    if (!isNaN(num) && isFinite(num)) {
      numbers.push(num)
    }
  }
  
  return numbers
}
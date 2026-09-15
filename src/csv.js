import Papa from 'papaparse'

export const supportedExts = ['csv', 'txt', 'xlsx', 'xls', 'pdf']

/* local fingerprint (same as store.js) so this module stays Node-testable */
const transactionFingerprint = ({ date, amount, note }) =>
  `${date}|${Math.abs(Number(amount))}|${String(note || '').trim()}`
export { transactionFingerprint }

/* ---------- decode ArrayBuffer (gbk or utf-8) ---------- */
export async function decodeBuffer(buf) {
  const bytes = new Uint8Array(buf)
  // try utf-8 first strictly
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (!/\uFFFD/.test(utf8)) return utf8
  } catch {
    /* fall through */
  }
  try {
    return new TextDecoder('gbk').decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

/* ---------- detect bill type from header ---------- */
export function detectBillType(rows) {
  const header = rows[0]
  if (!header) return 'generic'
  const h = Object.keys(header).map(String)
  const joined = JSON.stringify(h)
  // WeChat-specific columns first (both sheets contain 交易时间)
  if (
    h.some((c) => /金额\(?元\)?/.test(c)) ||
    /支付方式|商户单号|交易单号|交易类型|微信/.test(joined)
  ) {
    return 'wechat'
  }
  if (/支付宝|收\/付款方式|商品说明|对方账号/.test(joined)) return 'alipay'
  return 'generic'
}

/* ---------- normalize a single row to {date, amount, direction, peer, note, src, accountId} ---------- */
function normalizeAlipayRow(row, accounts) {
  const pick = (...keys) => {
    for (const k of keys) if (row[k] != null && row[k] !== '') return row[k]
    return ''
  }
  const date = pick('交易时间') || pick('交易日期') || pick('时间')
  const amountRaw = pick('金额')
  const type = String(pick('收/支') || pick('收支') || '').trim()
  const direction = type === '支出' ? 'withdraw' : 'deposit'
  const peer = pick('交易对方')
  const note = pick('商品说明') || pick('交易分类')
  const acc = suggestAccount(String(peer + note), accounts)
  const abs = Math.abs(parseFloat(amountRaw) || 0)
  const amount = direction === 'withdraw' ? -abs : abs
  return { date: normDate(date), amount, direction, peer, note, src: '支付宝', accountId: acc }
}

function normalizeWechatRow(row, accounts) {
  const date = row['交易时间'] || row['交易日期'] || row['时间'] || ''
  const amountRaw = row['金额(元)'] || row['金额'] || ''
  const peer = row['交易对方'] || row['对方'] || ''
  const type = row['收/支'] || row['收支'] || ''
  const commodity = row['商品'] || row['商品说明'] || ''
  const rawFlags = String(row['支付方式'] || row['资金状态'] || '')
  const direction = String(type).trim() === '支出' ? 'withdraw' : 'deposit'
  let amount = Math.abs(parseFloat(amountRaw) || 0)
  if (direction === 'withdraw') amount = -amount
  const zlq = accounts.find((a) => /零钱通/.test(a.name))
  const acc = /零钱通/.test(rawFlags) && zlq
    ? zlq.id
    : suggestAccount(String(peer + commodity + rawFlags), accounts)
  return { date: normDate(date), amount, direction, peer, note: commodity, src: '微信', accountId: acc }
}

function normalizeGenericRow(row, accounts, mapping) {
  const date = row[mapping.date] || ''
  const amountRaw = row[mapping.amount] || ''
  const note = row[mapping.note] || ''
  const peer = (row[mapping.peer] || '').toString()
  const dirRaw = (row[mapping.direction] || '').toString()
  let amount = Math.abs(parseFloat(amountRaw) || 0)
  let direction = /支出|支取|转出|Expense/i.test(dirRaw) || /^\s*-/.test(amountRaw)
    ? 'withdraw'
    : 'deposit'
  if (direction === 'withdraw') amount = -amount
  return { date: normDate(date), amount, direction, peer, note, src: '通用', accountId: suggestAccount(String(peer + note), accounts) }
}

/* ---------- suggestion using simple local rules ---------- */
function suggestAccount(text, accounts) {
  const s = String(text)
  const rules = [
    { keys: ['零钱通', '微信支付', '微信'], name: /零钱通|微信/ },
    { keys: ['余额宝', '支付宝', '余利宝', '花呗'], name: /余额宝|支付宝|余利宝/ },
  ]
  for (const r of rules) {
    if (r.keys.some((k) => s.includes(k))) {
      const hit = accounts.find((a) => r.name.test(a.name))
      if (hit) return hit.id
    }
  }
  return accounts.length ? accounts[0].id : null
}

export function suggestAccountId(text, accounts) {
  return suggestAccount(text, accounts)
}

function normDate(raw) {
  if (raw == null) return ''
  const s = String(raw).trim()
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  m = s.match(/(\d{1,2})[/-](\d{1,2})/)
  if (m) {
    const now = new Date()
    return `${now.getFullYear()}-${pad(m[1])}-${pad(m[2])}`
  }
  return ''
}

const pad = (n) => String(n).padStart(2, '0')

/* ---------- main entry: parse file -> array of parsed rows ---------- */
export function parseExtension(name) {
  const m = String(name || '').match(/\.([A-Za-z0-9]+)$/)
  const ext = (m ? m[1] : '').toLowerCase()
  return supportedExts.includes(ext) ? ext : 'csv'
}

export async function parseBillFile(file, accounts, opts = {}) {
  const ext = parseExtension(file?.name)
  const buf = await file.arrayBuffer()
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(buf, accounts, opts)
  if (ext === 'pdf') return parsePdf(buf, accounts)
  return parseCsv(buf, accounts, opts)
}

/* ---------- CSV / TXT ---------- */
async function parseCsv(arrayBuffer, accounts, opts = {}) {
  const text = await decodeBuffer(arrayBuffer)
  // read as raw arrays so we can locate the real header row (WeChat prepends
  // several "说明/共N笔记录" lines before the column header)
  const raw = Papa.parse(text, { header: false, skipEmptyLines: 'greedy' }).data
  const cleaned = raw.filter(
    (r) => Array.isArray(r) && r.some((v) => v != null && String(v).trim() !== '')
  )
  return normalizeFromCells(cleaned, accounts, opts)
}

/* ---------- Excel (.xlsx / .xls) ---------- */
async function parseExcel(arrayBuffer, accounts, opts = {}) {
  const mod = await import('xlsx')
  const XLSX = mod.default ?? mod // tolerate both CJS-interop shapes
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  let parsed = []
  let type = 'generic'
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    // raw:false keeps cell values as strings (matches CSV behaviour for dates/amounts)
    const cells = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false })
    const cleaned = cells.filter((r) => Array.isArray(r) && r.some((v) => v != null && String(v).trim() !== ''))
    if (cleaned.length === 0) continue
    const res = normalizeFromCells(cleaned, accounts, opts)
    parsed = parsed.concat(res.parsed)
    if (res.type !== 'generic') type = res.type
  }
  return { type, parsed }
}

/* ---------- shared: raw cell arrays -> normalized rows ---------- */
function normalizeFromCells(cleaned, accounts, opts) {
  // find header row: the row whose cells cover bill column keywords
  let headerIdx = cleaned.findIndex((row) =>
    row.some((c) => /交易时间|交易日期|支付宝|金额\(?元\)?|商品说明|收\/?支/.test(String(c)))
  )
  if (headerIdx < 0) headerIdx = 0
  const header = cleaned[headerIdx].map((c) => String(c).trim())
  const rows = cleaned.slice(headerIdx + 1).map((cells) => {
    const obj = {}
    header.forEach((h, i) => {
      obj[h] = cells[i] != null ? cells[i] : ''
    })
    return obj
  })

  const type = detectBillType(rows)
  const mappings = opts.mapping || {}

  const parsed = rows
    .map((row) => {
      if (type === 'alipay') return normalizeAlipayRow(row, accounts)
      if (type === 'wechat') return normalizeWechatRow(row, accounts)
      return normalizeGenericRow(row, accounts, mappings)
    })
    .filter((r) => r.date && r.amount)

  return { type, parsed }
}

/* ---------- PDF (best-effort text extraction) ---------- */
async function parsePdf(arrayBuffer, accounts) {
  const pmod = await import('pdfjs-dist')
  const P = pmod.default ?? pmod
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  P.GlobalWorkerOptions.workerSrc = worker.default ?? worker
  const lines = await extractPdfLines(P, arrayBuffer)
  const parsed = pdfRowsToTransactions(lines, accounts)
  return { type: 'pdf', parsed }
}

async function extractPdfLines(pdfjs, arrayBuffer) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  const lines = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    // group text items into visual lines by y position
    const pageRows = new Map()
    for (const it of tc.items) {
      if (!it || !it.str) continue
      const y = Math.round(it.transform[5])
      const x = it.transform[4]
      if (!pageRows.has(y)) pageRows.set(y, [])
      pageRows.get(y).push({ x, s: it.str })
    }
    const ys = [...pageRows.keys()].sort((a, b) => b - a) // top lines have larger y in PDF coords
    for (const y of ys) {
      const text = pageRows
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.s)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (text) lines.push(text)
    }
  }
  doc.destroy && doc.destroy().catch(() => {})
  return lines
}

function pdfRowsToTransactions(lines, accounts) {
  const out = []
  for (const line of lines) {
    const dm = line.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
    if (!dm) continue
    const date = `${dm[1]}-${pad(dm[2])}-${pad(dm[3])}`
    // cut the date out before hunting for the amount
    const rest = line.replace(dm[0], ' ').replace(/[\s·|｜【】()[\]（）]/g, ' ')
    const isWithdraw = /支出|支取|消费|付款|转出|退会员费|Expense/i.test(rest)
    const isDeposit = /收入|存入|转入|收款|到账|Recv|Receipt/i.test(rest)

    const nums = []
    const re = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g
    let m
    while ((m = re.exec(rest))) nums.push({ s: m[1], v: parseFloat(m[1].replace(/,/g, '')) })

    let amount = 0
    if (nums.length) {
      // prefer a value with decimals (amounts usually carry cents); else last number
      const dec = nums.filter((n) => n.s.includes('.'))
      const chosen = dec.length ? dec[dec.length - 1] : nums[nums.length - 1]
      amount = isWithdraw ? -Math.abs(chosen.v) : Math.abs(chosen.v)
    }
    if (!amount) continue // no usable amount

    const note = rest
      .replace(re, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[¥￥]/g, '')
      .slice(0, 60)

    out.push({
      date,
      amount,
      direction: isWithdraw ? 'withdraw' : isDeposit ? 'deposit' : 'deposit',
      peer: '',
      note,
      src: 'PDF',
      accountId: suggestAccount(line, accounts) || (accounts.length ? accounts[0].id : null),
    })
  }
  // de-dup rows that are page headers/footers (same date+... unlikely); just return
  return out
}

export function fingerprintFor(row) {
  return transactionFingerprint({ date: row.date, amount: Math.abs(row.amount), note: row.note })
}
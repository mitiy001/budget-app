import Papa from 'papaparse'

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
export async function parseBillFile(arrayBuffer, accounts, opts = {}) {
  const text = await decodeBuffer(arrayBuffer)
  // read as raw arrays so we can locate the real header row (WeChat prepends
  // several "说明/共N笔记录" lines before the column header)
  const raw = Papa.parse(text, { header: false, skipEmptyLines: 'greedy' }).data
  const cleaned = raw.filter(
    (r) => Array.isArray(r) && r.some((v) => v != null && String(v).trim() !== '')
  )

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

export function fingerprintFor(row) {
  return transactionFingerprint({ date: row.date, amount: Math.abs(row.amount), note: row.note })
}
/* AI helpers: natural-language ledger parsing + AI account mapping.
   Uses DeepSeek (OpenAI-compatible) by default; falls back to local rules
   when no API key is configured or the call fails. */

const SYSTEM = `你是一个中文记账解析助手。用户会输入一句描述资金流水的日常用语，例如"今天工资存了5000到招行"。\
请解析为严格 JSON，不要输出任何其他内容。\
格式：{"date":"YYYY-MM-DD","amount":5000,"direction":"deposit|withdraw","note":"简短备注","accountHint":"账户关键词"}。
规则：存入为 deposit，支取/支出为 withdraw；金额为正数（不含负号）；\
日期若不明确则省略当天或用今天；accountHint 是用户提到的账户称呼，若无则为空字符串。`

export async function aiParseLedger(text, { settings } = {}) {
  if (!settings?.aiKey) return { usedAi: false, result: localParseLedger(text) }
  try {
    const body = {
      model: settings.aiModel || 'deepseek-chat',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `今天日期：${todayStr()}。输入："${text}"` },
      ],
    }
    const res = await fetch(
      `${(settings.aiBaseUrl || 'https://api.deepseek.com').replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.aiKey}`,
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || ''
    const json = content.match(/\{[\s\S]*\}/)?.[0]
    if (!json) throw new Error('no json')
    return { usedAi: true, result: parseAiJson(json, text) }
  } catch (e) {
    return { usedAi: false, result: localParseLedger(text), error: String(e?.message || e) }
  }
}

function parseAiJson(content, rawText) {
  const obj = JSON.parse(content)
  const direction = obj.direction === 'withdraw' ? 'withdraw' : 'deposit'
  const amount = Math.abs(parseFloat(obj.amount))
  return {
    date: validYMD(obj.date) ? obj.date : todayStr(),
    amount: isNaN(amount) ? 0 : amount,
    direction,
    note: String(obj.note || rawText),
    accountHint: String(obj.accountHint || ''),
  }
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const validYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s))

/* ---------- local rule-based fallback ---------- */
export function localParseLedger(text) {
  const t = String(text)
  const out = { date: todayStr(), amount: 0, direction: 'deposit', note: t, accountHint: '' }

  // date keywords
  if (/昨天/.test(t)) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    out.date = d.toISOString().slice(0, 10)
  } else if (/前天/.test(t)) {
    const d = new Date()
    d.setDate(d.getDate() - 2)
    out.date = d.toISOString().slice(0, 10)
  }
  const ymd = t.match(/(\d{4}[-/.]?\d{1,2}[-/.]?\d{1,2})/)
  if (ymd) {
    const m = ymd[1].match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
    if (m) out.date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }

  // amount
  const amt = t.match(/(\d+(?:\.\d+)?)\s*(元|块钱)?/)
  if (amt) out.amount = parseFloat(amt[1])

  // direction
  if (/支取|支出|花了|付了|取出了|转出|花掉|扣了|交了|买了|付给|还款|提现/.test(t)) {
    out.direction = 'withdraw'
  } else if (/存入|存了|工资|收入|转入了|收到|打进|赚了|转入|理财到账|利息/.test(t)) {
    out.direction = 'deposit'
  }

  // account hint
  const accHints = ['招行', '招商', '工商', '工行', '建行', '零钱通', '余额宝', '余利宝', '支付宝', '微信', '银行', '储蓄']
  const hit = accHints.find((h) => t.includes(h))
  if (hit) out.accountHint = hit

  return out
}

/* add account hint => accountId matching */
export function matchAccount(accounts, hint) {
  const h = String(hint || '')
  if (!h) return accounts[0]?.id || null
  // order by length of hint so "招商" prefers over "银行"
  let best = null
  let bestLen = 0
  for (const a of accounts) {
    if (h.split('').some((ch) => a.name.includes(ch))) {
      // crude: score if hint chars all present
      let score = 0
      for (const ch of [...h]) if (a.name.includes(ch)) score++
      if (score > bestLen) {
        bestLen = score
        best = a.id
      }
    }
  }
  return best || accounts[0]?.id || null
}
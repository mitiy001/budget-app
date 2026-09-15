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

/* ------------------------------------------------------------------
   Goal planning
   ------------------------------------------------------------------ */

/* Local fallback: parse a natural-lang goal intent into a plan. */
export function localGoalPlan(text) {
  const t = String(text || '')
  const out = {
    target: 0,
    months: 0,
    monthly: 0,
    daily: 0,
    note: '',
    feasible: true,
  }
  // years/months/days, supporting word forms like "一年", "半年", "6个月" and "1年内"
  const tm = t.match(/(?:(\d+(?:\.\d+)?)|([一|二|三|四|五|六|七|八|九|十|半]))\s*(年内?|个月|个月后|月|天)/)
  let months = 0
  if (tm) {
    let num = 0
    if (tm[1]) num = parseFloat(tm[1])
    else {
      const zh = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
      num = /半/.test(tm[2] || '') ? 0.5 : zh[(tm[2] || '').replace('半', '')] || 1
    }
    if (/天/.test(tm[3])) months = Math.max(1, Math.round(num / 30))
    else if (/年/.test(tm[3])) months = Math.max(1, Math.round(num * 12))
    else months = Math.max(1, Math.round(num)) // 个月 / 月
  }

  // amount: prefer "X万" / "X元"; fall back to a number that is NOT part of the period
  let mWan = t.match(/(\d+(?:\.\d+)?)\s*万(?:元)?/)
  let target = 0
  if (mWan) {
    target = parseFloat(mWan[1]) * 10000
  } else {
    const mYuan = t.match(/(\d+(?:\.\d+)?)\s*元/)
    if (mYuan) target = parseFloat(mYuan[1])
    else {
      const nums = t.match(/(\d+(?:\.\d+)?)/g) || []
      if (nums.length) {
        // pick the number not used as the period (the period is typically first)
        const periods = tm ? new Set([tm[1]]) : new Set()
        const cand = nums.filter((n) => !periods.has(n))
        target = parseFloat(cand.length ? cand[cand.length - 1] : nums[nums.length - 1])
      }
    }
  }

  if (months > 0 && target > 0) {
    out.target = target
    out.months = months
    out.monthly = Math.round((target / months) * 100) / 100
    out.daily = Math.round((target / (months * 30)) * 100) / 100
    out.note = `约需每月存入 ¥${out.monthly.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}，即平均每天 ¥${out.daily.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}。`
  } else {
    out.note = '已识别，但建议补充目标金额或期限，以便给出规划建议。'
  }
  return out
}

const GOAL_SYSTEM = `你是存钱规划助手。用户会输入攒钱目标，例如"一年内存10万"。请解析为严格 JSON：{"target":100000,"months":12}。target 为人民币金额（万元按数字乘10000），months 为月数（一年=12）。不要输出其他内容。`

export async function aiGoalPlan(text, { settings } = {}) {
  const local = localGoalPlan(text)
  if (!settings?.aiKey) return { usedAi: false, ...local }
  try {
    const res = await fetch(
      `${(settings.aiBaseUrl || 'https://api.deepseek.com').replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.aiKey}`,
        },
        body: JSON.stringify({
          model: settings.aiModel || 'deepseek-chat',
          temperature: 0,
          messages: [
            { role: 'system', content: GOAL_SYSTEM },
            { role: 'user', content: `输入："${text}"` },
          ],
        }),
      }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const json = data?.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/)?.[0]
    if (!json) throw new Error('no json')
    const obj = JSON.parse(json)
    const target = Math.abs(parseFloat(obj.target)) || local.target
    const months = Math.max(1, Math.round(parseFloat(obj.months) || local.months)) || 1
    return {
      usedAi: true,
      target,
      months,
      monthly: Math.round((target / months) * 100) / 100,
      daily: Math.round((target / (months * 30)) * 100) / 100,
      note: `约需每月存入 ¥${(target / months).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}，即平均每天 ¥${(target / (months * 30)).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}。`,
      feasible: true,
    }
  } catch (e) {
    return { usedAi: false, ...local, error: String(e?.message || e) }
  }
}

/* Dynamic advice given a computed goal state (g from computeGoal). */
export function aiGoalAdvice(goal, g, { settings } = {}) {
  const base = localGoalAdvice(goal, g)
  if (!settings?.aiKey) return { usedAi: false, advice: base.advice }
  // We skip a real LLM round-trip here for a snappy MVP;
  // fall back to local rule-based advice which is fully deterministic.
  return { usedAi: false, advice: base.advice }
}

export function localGoalAdvice(goal, g) {
  const { fmtPlain } = needPlain()
  if (g.level === 'completed') {
    return { advice: '目标已达成！可以规划庆祝或开始下一个存钱目标 🎉', tone: 'good' }
  }
  if (g.level === 'paused') {
    return { advice: '目标已暂停。恢复后按每日 ¥' + fmtPlain(g.dailyNeed) + ' 的节奏继续即可。', tone: 'info' }
  }
  if (g.level === 'expired') {
    return {
      advice: `已过期，还差 ¥${fmtPlain(g.remaining)}。建议把截止日期后移 ${Math.max(1, g.remainingMonths)} 个月，或把每日预算上调为 ¥${fmtPlain(g.remaining / Math.max(1, g.remainingDays) !== 0 ? g.remaining / Math.max(1, g.remainingDays) : g.dailyNeed)} 下再战。`,
      tone: 'warn',
    }
  }
  if (g.level === 'normal') {
    const extra = Math.max(0, (g.dailyNeed || 0) - (g.avgDaily || 0))
    if (extra > 0) {
      return {
        advice: `当前日均存款 ¥${fmtPlain(g.avgDaily)}，比每日需存 ¥${fmtPlain(g.dailyNeed)} 少 ¥${fmtPlain(extra)}，但仍能按时完成。建议尽快补齐差额，更稳妥。`,
        tone: 'info',
      }
    }
    return {
      advice: `进度正常！按当前 ¥${fmtPlain(g.avgDaily || g.dailyNeed)}/天的节奏，预计 ${g.projectedDate || '按时'} 达成。`,
      tone: 'good',
    }
  }
  if (g.level === 'behind') {
    const extra = fmtPlain(Math.max(0, g.dailyNeed - (g.avgDaily || 0)))
    const newMonthly = fmtPlain(Math.ceil((g.remaining / Math.max(1, g.remainingDays)) * 30 * 100) / 100)
    return {
      advice: `进度落后：每天再多存 ¥${extra}，即可跟上每日 ¥${fmtPlain(g.dailyNeed)} 的目标，等于每月约 ¥${newMonthly}。`,
      tone: 'warn',
    }
  }
  // severe
  const extendMonths = g.projectedDate ? Math.max(1, (daysUntil(g.projectedDate, g.endDate) / 30 | 0) + 1) : 1
  const altMonthly = fmtPlain(Math.ceil((g.remaining / Math.max(1, g.remainingMonths + extendMonths)) * 100) / 100)
  return {
    advice: `按当前速度无法按时完成。建议：① 每月提高到 ¥${altMonthly}；② 或把期限顺延约 ${extendMonths + 1} 个月更现实。`,
    tone: 'warn',
  }
}

/* ---- tiny internal helpers (avoid circular import) ---- */
function needPlain() {
  return { fmtPlain: (n) => (Number(n) || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }
}
function daysUntil(a, b) {
  const A = new Date(`${a}T00:00:00`)
  const B = new Date(`${b}T00:00:00`)
  return Math.round((B - A) / 86400000)
}
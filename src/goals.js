import { round2 } from './store'

/* ---------- date helpers ---------- */

export const todayStr = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// days from a (inclusive) to b (exclusive); daily granularity on YYYY-MM-DD strings
export function daysBetween(a, b) {
  if (!a || !b) return 0
  const A = new Date(`${a}T00:00:00`)
  const B = new Date(`${b}T00:00:00`)
  return Math.max(0, Math.round((B - A) / 86400000))
}

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

// returns date string exactly N calendar months after base (clamped to month end)
export function addMonths(base, months) {
  const [y, m, d] = String(base || todayStr()).split('-').map(Number)
  const dt = new Date(y, m - 1 + months, 1, 0, 0, 0)
  const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0, 0, 0, 0).getDate()
  dt.setDate(Math.min(d || 1, lastDay))
  const pad = (x) => String(x).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

/* ---------- derived current saved ----------
   currentSaved = initialSaved + autoDeposits(linked accounts, start..today)
                  + sum(checkins) + manualAdjust
   auto only counts deposit (amount > 0) transactions whose date falls in [startDate, today].
*/
export function computeCurrentSaved(goal, transactions, today = todayStr()) {
  const start = goal.startDate || today
  let auto = 0
  const linked = new Set(goal.linkedAccountIds || [])
  ;(transactions || []).forEach((t) => {
    if (!linked.has(t.accountId)) return
    const amt = Number(t.amount) || 0
    if (amt <= 0) return
    if (t.date && t.date >= start && t.date <= today) auto += amt
  })
  const checkins = (goal.checkins || []).reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const manual = Number(goal.manualAdjust) || 0
  return round2((Number(goal.initialSaved) || 0) + auto + checkins + manual)
}

/* ---------- elapsed / projected savings ---------- */
export function autoDepositsByDate(goal, transactions, start, end = todayStr()) {
  const linked = new Set(goal.linkedAccountIds || [])
  return (transactions || []).filter(
    (t) =>
      linked.has(t.accountId) &&
      (Number(t.amount) || 0) > 0 &&
      t.date &&
      t.date >= start &&
      t.date <= end
  )
}

/* ---------- main goal computation ---------- */
export function computeGoal(goal, transactions, today = todayStr()) {
  const target = Number(goal.targetAmount) || 0
  const saved = computeCurrentSaved(goal, transactions, today)
  const remaining = round2(Math.max(0, target - saved))

  const totalDays = daysBetween(goal.startDate, goal.endDate)
  const elapsedDays = daysBetween(goal.startDate, today)
  const remainingDays = daysBetween(today, goal.endDate)
  const remainingMonths = Math.max(1, Math.ceil(remainingDays / 30))

  const completed = target > 0 && saved >= target
  const expired = !completed && goal.endDate && today > goal.endDate
  const paused = goal.status === 'paused'

  const progress = target > 0 ? clamp(saved / target, 0, 1) : 0 // 0..1 raw
  const pct = round2(progress * 100)

  const dailyNeed = remainingDays > 0 && remaining > 0 ? round2(remaining / remainingDays) : 0
  const monthlyNeed = remaining > 0 ? round2(remaining / remainingMonths) : 0

  // average daily deposit rate from linked account deposits since start
  const depTxns = autoDepositsByDate(goal, transactions, goal.startDate, today)
  const depositTotal = depTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const rate =
    scheduledDeposits(depTxns, goal, today) // includes checkins & manual (treated as today's saving)
  const activeDays = Math.max(1, elapsedDays)
  const avgDaily = round2(rate / activeDays)

  // when does it finish at the current rate?
  let projectedDate = null
  if (remaining > 0) {
    if (avgDaily > 0) {
      projectedDate = addDays(today, Math.ceil(remaining / avgDaily))
    }
    // no rate → unknowable (projectedDate stays null)
  }

  // plan-vs-actual series: expected cumulative saved by each month boundary
  const expectedCumulative = buildPlanSeries(goal, transactions, today)

  // on-time check
  let scheduledOnTime = null
  if (remaining > 0 && projectedDate) {
    scheduledOnTime = projectedDate <= (goal.endDate || '9999-99-99')
  }

  // status: normal / behind / severe / completed / expired / paused
  let level = 'paused'
  let reason = ''
  if (paused) {
    level = 'paused'
    reason = '已暂停'
  } else if (completed) {
    level = 'completed'
    reason = '目标已达成 🎉'
  } else if (expired) {
    level = 'expired'
    reason = '已过期，剩余 ' + fmtPlain(remaining) + ' 元未完成'
  } else if (remaining === 0) {
    level = 'completed'
    reason = '目标已达成 🎉'
  } else {
    // not done, not past end
    if (avgDaily >= dailyNeed && dailyNeed > 0) {
      level = 'normal'
      reason = `按当前日均存款 ${fmtPlain(avgDaily)} 元可按时完成`
    } else if (scheduledOnTime) {
      level = 'normal'
      reason = '进度正常，按计划可按时完成'
    } else if (projectedDate) {
      const extraDays = daysBetween(goal.endDate, projectedDate)
      if (extraDays <= 30) {
        level = 'behind'
        reason = `进度落后，预计晚 ${extraDays} 天，需加快节奏`
      } else {
        level = 'severe'
        reason = '进度严重落后，按当前速度无法按时完成'
      }
    } else {
      level = 'behind'
      reason = '尚无存款记录，需开始按计划存入'
    }
  }

  return {
    target,
    saved: round2(saved),
    remaining,
    totalDays,
    elapsedDays: Math.max(0, elapsedDays),
    remainingDays,
    remainingMonths,
    progress,
    pct,
    dailyNeed,
    monthlyNeed,
    avgDaily,
    projectedDate,
    scheduledOnTime,
    level,
    reason,
    expectedCumulative,
  }
}

/* checkins + manual adjust are treated as "saving done today" for rate purposes */
function scheduledDeposits(depTxns, goal) {
  const checkins = (goal.checkins || []).reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const manual = Number(goal.manualAdjust) || 0
  return depTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0) + checkins + manual
}

export function fmtPlain(n) {
  return (Number(n) || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

export const STATUS_META = {
  normal: { label: '进度正常', emoji: '🟢' },
  behind: { label: '进度落后', emoji: '🟡' },
  severe: { label: '严重落后', emoji: '🔴' },
  completed: { label: '已达成', emoji: '✅' },
  expired: { label: '已过期', emoji: '⏰' },
  paused: { label: '已暂停', emoji: '⏸️' },
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + n)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* ---------- plan vs actual series ----------
   Returns [{ month, plan, actual }] where plan = linearly-targeted cumulative
   savings at each month boundary and actual = cumulative auto+checkin saved.
*/
export function buildPlanSeries(goal, transactions, today = todayStr()) {
  const start = goal.startDate || today
  const end = goal.endDate || today
  const target = Number(goal.targetAmount) || 0
  const initial = Number(goal.initialSaved) || 0
  const totalDays = Math.max(1, daysBetween(start, end))
  const params = { linkedAccountIds: goal.linkedAccountIds, checkins: goal.checkins, manualAdjust: goal.manualAdjust }

  const points = []
  let month = start.slice(0, 7)
  const finalYM = end.slice(0, 7)
  let cursor = start
  let guard = 0
  // collect actual cumulative at each month boundary
  const actualAt = (boundary) => {
    let auto = 0
    const linked = new Set(goal.linkedAccountIds || [])
    ;(transactions || []).forEach((t) => {
      if (!linked.has(t.accountId)) return
      if ((Number(t.amount) || 0) <= 0) return
      if (t.date && t.date >= start && t.date <= boundary) auto += Number(t.amount)
    })
    const checkins = (goal.checkins || []).filter((c) => c.date >= start && c.date <= boundary).reduce((s, c) => s + (Number(c.amount) || 0), 0)
    return initial + auto + checkins
  }

  while (month <= finalYM && month <= today.slice(0, 7) && guard < 200) {
    // boundary = last day of this month (min with end & today)
    const nextMonth = nextMonthStr(month)
    let boundary = lastDayOfMonth(month)
    if (boundary > today) boundary = today
    if (boundary > end) boundary = end
    const frac = clamp(daysBetween(start, boundary) / totalDays, 0, 1)
    points.push({
      month,
      plan: round2(initial + (target - initial) * frac),
      actual: round2(actualAt(boundary)),
    })
    month = nextMonth
    guard++
  }
  return points
}

function nextMonthStr(ym) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastDayOfMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 0, 0, 0, 0) // day 0 of next month = last day
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fmtMoneyPlain(n) {
  return fmtPlain(n)
}
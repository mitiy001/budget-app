import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'porklypig.v1'

/* ---------- pure helpers ---------- */

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const fmtMoney = (n) => {
  const v = Number(n) || 0
  const neg = v < 0 ? '-' : ''
  const s = Math.abs(v)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${neg}¥${s}`
}

// fingerprint for dedupe: date + amount + normalized note
export const transactionFingerprint = ({ date, amount, note }) =>
  `${date}|${Math.abs(Number(amount))}|${String(note || '').trim()}`

/* ---------- parse date into YYYY-MM ---------- */
export const yyyymm = (date) => {
  if (!date) return ''
  const d = String(date)
  return d.slice(0, 7)
}

export const todayStr = () => new Date().toISOString().slice(0, 10)
const todayYMD = todayStr

/* ---------- default data ---------- */
const seed = () => ({
  accounts: [
    { id: 'acc-sp', name: '招商银行', initial: 5000, note: '主力工资卡', createdAt: Date.now() },
    { id: 'acc-wx', name: '零钱通', initial: 0, note: '微信闲钱', createdAt: Date.now() },
    { id: 'acc-al', name: '余额宝', initial: 0, note: '支付宝闲钱', createdAt: Date.now() },
  ],
  transactions: [],
  settings: {
    aiProvider: 'deepseek',
    aiBaseUrl: 'https://api.deepseek.com',
    aiKey: '',
    aiModel: 'deepseek-chat',
  },
  importedFingerprints: [],
  goals: [],
})

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const data = JSON.parse(raw)
    return {
      accounts: data.accounts || [],
      transactions: data.transactions || [],
      settings: { ...seed().settings, ...(data.settings || {}) },
      importedFingerprints: data.importedFingerprints || [],
      goals: data.goals || [],
    }
  } catch {
    return seed()
  }
}

/* ---------- react store hooks ---------- */

export function useAppStore() {
  const [data, setData] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* storage full - ignore for MVP */
    }
  }, [data])

  const addAccount = useCallback((acc) => {
    setData((d) => ({
      ...d,
      accounts: [...d.accounts, { ...acc, id: uid(), createdAt: Date.now() }],
    }))
  }, [])

  const updateAccount = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      accounts: d.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
  }, [])

  const deleteAccount = useCallback((id) => {
    setData((d) => ({
      ...d,
      accounts: d.accounts.filter((a) => a.id !== id),
      transactions: d.transactions.filter((t) => t.accountId !== id),
    }))
  }, [])

  const addTransaction = useCallback((tx) => {
    setData((d) => {
      const t = { ...tx, id: uid() }
      return { ...d, transactions: [...d.transactions, t] }
    })
  }, [])

  const addManyTransactions = useCallback((txs) => {
    setData((d) => ({
      ...d,
      transactions: [...d.transactions, ...txs.map((tx) => ({ ...tx, id: uid() }))],
    }))
  }, [])

  const updateTransaction = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }, [])

  const deleteTransaction = useCallback((id) => {
    setData((d) => ({
      ...d,
      transactions: d.transactions.filter((t) => t.id !== id),
    }))
  }, [])

  const setSettings = useCallback((patch) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const recordImportedFingerprints = useCallback((fps) => {
    setData((d) => ({
      ...d,
      importedFingerprints: [...new Set([...d.importedFingerprints, ...fps])],
    }))
  }, [])

  /* ---------- goal actions ---------- */
  const addGoal = useCallback((goal) => {
    setData((d) => ({
      ...d,
      goals: [
        ...d.goals,
        {
          id: uid(),
          name: '新目标',
          targetAmount: 0,
          startDate: todayStr(),
          endDate: todayStr(),
          linkedAccountIds: [],
          initialSaved: 0,
          manualAdjust: 0,
          checkins: [],
          status: 'active',
          note: '',
          createdAt: Date.now(),
          ...goal,
        },
      ],
    }))
  }, [])

  const updateGoal = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }))
  }, [])

  const deleteGoal = useCallback((id) => {
    setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }))
  }, [])

  const addGoalCheckin = useCallback((id, entry) => {
    setData((d) => ({
      ...d,
      goals: d.goals.map((g) =>
        g.id === id ? { ...g, checkins: [...(g.checkins || []), { id: uid(), ...entry }] } : g
      ),
    }))
  }, [])

  const deleteGoalCheckin = useCallback((goalId, checkinId) => {
    setData((d) => ({
      ...d,
      goals: d.goals.map((g) =>
        g.id === goalId ? { ...g, checkins: (g.checkins || []).filter((c) => c.id !== checkinId) } : g
      ),
    }))
  }, [])

  return {
    ...data,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    addManyTransactions,
    updateTransaction,
    deleteTransaction,
    setSettings,
    recordImportedFingerprints,
    addGoal,
    updateGoal,
    deleteGoal,
    addGoalCheckin,
    deleteGoalCheckin,
  }
}

/* ---------- derived: monthly balances ---------- */

// returns [{ month:'2026-01', accountId, balance }]
export function computeMonthlyBalances(accounts, transactions) {
  const months = new Set()
  // tx map by acc: [{date, amount}]
  const byAcc = {}
  accounts.forEach((a) => {
    byAcc[a.id] = { initial: a.initial, txs: [] }
  })
  transactions.forEach((t) => {
    if (!byAcc[t.accountId]) return
    byAcc[t.accountId].txs.push(t)
    months.add(yyyymm(t.date))
  })
  if (months.size === 0) return []

  const sortedMonths = [...months].sort()
  const rows = []
  accounts.forEach((a) => {
    const { initial, txs } = byAcc[a.id]
    const sortedTxs = txs.sort((x, y) => x.date.localeCompare(y.date))
    let running = initial
    let ti = 0
    sortedMonths.forEach((m) => {
      while (ti < sortedTxs.length && yyyymm(sortedTxs[ti].date) <= m) {
        running += Number(sortedTxs[ti].amount) || 0
        ti++
      }
      rows.push({ month: m, accountId: a.id, balance: round2(running) })
    })
  })
  return rows
}

export function monthStartBalance(rowsByAccount, accountId, month) {
  // balance at end of the previous month
  const arr = rowsByAccount[accountId] || []
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].month < month) return arr[i].balance
  }
  return 0
}

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
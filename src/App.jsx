import { useMemo, useState } from 'react'
import { useAppStore, computeMonthlyBalances, yyyymm, round2, transactionFingerprint } from './store'
import { computeGoal } from './goals'
import Filters from './components/Filters'
import Metrics from './components/Metrics'
import TransactionSection from './components/TransactionSection'
import ImportModal from './components/ImportModal'
import AccountModal from './components/AccountModal'
import SettingsModal from './components/SettingsModal'
import SummaryTable from './components/SummaryTable'
import Charts from './components/Charts'
import GoalsPage from './components/GoalsPage'
import { PigIcon, GearIcon, GoalIcon } from './icons'

export default function App() {
  const store = useAppStore()
  const {
    accounts, transactions, settings, importedFingerprints, goals,
    addAccount, updateAccount, deleteAccount,
    addTransaction, addManyTransactions, updateTransaction, deleteTransaction,
    setSettings, recordImportedFingerprints,
    addGoal, updateGoal, deleteGoal, addGoalCheckin, deleteGoalCheckin,
  } = store

  const [filters, setFilters] = useState({ selectedAccounts: [], fromMonth: '', toMonth: '' })
  const [showAccounts, setShowAccounts] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showGoals, setShowGoals] = useState(false)

  const fSet = (patch) => setFilters((f) => ({ ...f, ...patch }))

  const visibleAccounts = useMemo(() => {
    if (!filters.selectedAccounts.length) return accounts
    return accounts.filter((a) => filters.selectedAccounts.includes(a.id))
  }, [accounts, filters.selectedAccounts])

  const base = useMemo(() => computeMonthlyBalances(accounts, transactions), [accounts, transactions])
  const byAccFull = useMemo(() => {
    const map = {}
    base.forEach((r) => {
      if (!map[r.accountId]) map[r.accountId] = []
      map[r.accountId].push(r)
    })
    return map
  }, [base])

  const range = useMemo(() => {
    const months = filters.fromMonth || filters.toMonth
    if (!months) return { from: '', to: '' }
    return {
      from: filters.fromMonth || '0000-00',
      to: filters.toMonth || '9999-99',
    }
  }, [filters])

  const txnInRange = useMemo(() => {
    const ids = new Set(visibleAccounts.map((a) => a.id))
    return transactions.filter((t) => {
      const inAcc = ids.has(t.accountId)
      const m = yyyymm(t.date)
      const inRange =
        !range.from && !range.to ? true : m >= range.from && m <= range.to
      return inAcc && inRange
    })
  }, [transactions, visibleAccounts, range])

  // monthly rows limited to visible accounts & range
  const monthlyRows = useMemo(() => {
    const ids = new Set(visibleAccounts.map((a) => a.id))
    return base.filter(
      (r) => ids.has(r.accountId) && (!range.from || r.month >= range.from) && (!range.to || r.month <= range.to)
    )
  }, [base, visibleAccounts, range])

  const latestMonth = useMemo(() => {
    const ms = [...new Set(monthlyRows.map((r) => r.month))].sort()
    return ms.length ? ms[ms.length - 1] : ''
  }, [monthlyRows])

  // total assets = per visible account balance at latest month (fallback initial)
  const totalAssets = useMemo(() => {
    return round2(
      visibleAccounts.reduce((sum, a) => {
        const rows = byAccFull[a.id] || []
        const val = latestMonth ? lookBackBalance(rows, latestMonth) : a.initial + sumAccount(a.id)
        return sum + val
      }, 0)
    )
  }, [visibleAccounts, byAccFull, latestMonth, transactions])

  function sumAccount(aid) {
    return transactions.filter((t) => t.accountId === aid).reduce((s, t) => s + (Number(t.amount) || 0), 0)
  }

  const netChange = useMemo(() => {
    const m = latestMonth
    if (!m) return 0
    return round2(
      txnInRange.filter((t) => yyyymm(t.date) === m).reduce((s, t) => s + (Number(t.amount) || 0), 0)
    )
  }, [txnInRange, latestMonth])

  const txnFPset = useMemo(() => new Set(importedFingerprints), [importedFingerprints])

  // goal overview for the dashboard metric (active goals only)
  const goalSummary = useMemo(() => {
    let total = 0
    let saved = 0
    goals.forEach((goal) => {
      const g = computeGoal(goal, transactions)
      if (g.level === 'paused' || g.level === 'completed' || g.level === 'expired') return
      total += goal.targetAmount || 0
      saved += g.saved
    })
    const pct = total > 0 ? Math.round((saved / total) * 100) : 0
    return { total, saved, pct, count: goals.length }
  }, [goals, transactions])

  const handleImport = (rows) => {
    const txs = rows.map((r) => ({
      date: r.date,
      accountId: r.accountId,
      amount: Number(r.amount) || 0,
      direction: r.amount > 0 ? 'deposit' : 'withdraw',
      note: r.note || r.peer || '',
      imported: true,
    }))
    addManyTransactions(txs)
    recordImportedFingerprints(txs.map((t) => transactionFingerprint(t)))
  }

  const handleEdit = (id, patch) => updateTransaction(id, patch)
  const handleDelete = (id) => deleteTransaction(id)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-soft flex items-center justify-center">
            <PigIcon size={32} />
          </div>
          <div>
            <h1 className="font-cute font-extrabold text-2xl text-pig-ink leading-tight">猪宝存钱罐</h1>
            <p className="text-sm text-pig-sub">多储蓄账户记账工作台</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGoals(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-pig-accent text-white font-cute font-bold shadow-chip hover:brightness-105 transition"
          >
            <GoalIcon size={16} /> 存钱目标
          </button>
          <button
            onClick={() => setShowAccounts(true)}
            className="px-3.5 py-2 rounded-2xl bg-white text-pig-ink font-medium shadow-soft hover:brightness-105 transition"
          >
            账户管理
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 rounded-2xl bg-white text-pig-ink shadow-soft hover:brightness-105 transition"
            aria-label="设置"
          >
            <GearIcon />
          </button>
        </div>
      </header>

      <div className="space-y-6">
        <Filters
          accounts={accounts}
          fromMonth={filters.fromMonth}
          toMonth={filters.toMonth}
          selectedAccounts={filters.selectedAccounts}
          onChange={fSet}
        />

        <Metrics totalAssets={totalAssets} netChange={netChange} month={latestMonth} goalSummary={goalSummary} onOpenGoals={() => setShowGoals(true)} />

        <TransactionSection
          accounts={accounts}
          goals={goals}
          onAdd={addTransaction}
          settings={settings}
          onOpenImport={() => setShowImport(true)}
        />

        <SummaryTable
          accounts={visibleAccounts}
          monthlyRows={monthlyRows}
          transactions={txnInRange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          goals={goals}
        />

        <Charts accounts={visibleAccounts} monthlyRows={monthlyRows} />
      </div>

      <footer className="text-center text-xs text-pig-sub mt-8 pb-4">
        🐷 数据仅保存在本地浏览器 · 不会上传云端
      </footer>

      {showAccounts && (
        <AccountModal
          accounts={accounts}
          transactions={transactions}
          onClose={() => setShowAccounts(false)}
          onAdd={addAccount}
          onUpdate={updateAccount}
          onDelete={deleteAccount}
        />
      )}
      {showImport && (
        <ImportModal
          accounts={accounts}
          transactionFPs={txnFPset}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          settings={settings}
        />
      )}
      {showSettings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={setSettings} />
      )}

      {showGoals && (
        <GoalsPage
          accounts={accounts}
          transactions={transactions}
          goals={goals}
          settings={settings}
          addGoal={addGoal}
          updateGoal={updateGoal}
          deleteGoal={deleteGoal}
          addGoalCheckin={addGoalCheckin}
          deleteGoalCheckin={deleteGoalCheckin}
          onClose={() => setShowGoals(false)}
        />
      )}
    </div>
  )
}

function lookBackBalance(rows, month) {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].month <= month) return rows[i].balance
  }
  return 0
}
import { useMemo, useState } from 'react'
import GoalCard from './goals/GoalCard'
import GoalDetail from './goals/GoalDetail'
import GoalFormModal from './goals/GoalFormModal'
import { computeGoal, todayStr, addMonths, fmtPlain } from '../goals'
import { aiGoalPlan } from '../ai'
import { BackIcon, PlusIcon, SparkIcon } from '../icons'
import { fmtMoney } from '../store'

const FILTERS = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'active', label: '进行中', match: (lvl) => ['normal', 'behind', 'severe'].includes(lvl) },
  { key: 'completed', label: '已完成', match: (lvl) => lvl === 'completed' },
  { key: 'expired', label: '已过期/暂停', match: (lvl) => ['expired', 'paused'].includes(lvl) },
]

export default function GoalsPage({
  accounts, transactions, goals, settings,
  addGoal, updateGoal, deleteGoal, addGoalCheckin, deleteGoalCheckin,
  onClose,
}) {
  const [sort, setSort] = useState('due')
  const [filter, setFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [smart, setSmart] = useState('')
  const [smartPlan, setSmartPlan] = useState(null)
  const [smartBusy, setSmartBusy] = useState(false)

  const today = todayStr()

  const computed = useMemo(
    () => goals.map((goal) => ({ goal, g: computeGoal(goal, transactions, today) })),
    [goals, transactions, today]
  )

  const list = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.key === filter) || FILTERS[0]
    let arr = computed.filter(({ g }) => activeFilter.match(g.level))
    arr = [...arr].sort((a, b) => {
      if (sort === 'due') return (a.goal.endDate || '').localeCompare(b.goal.endDate || '')
      if (sort === 'progress') return b.g.pct - a.g.pct
      return b.goal.targetAmount - a.goal.targetAmount // amount
    })
    return arr
  }, [computed, sort, filter])

  const overview = useMemo(() => {
    const total = goals.reduce((s, x) => s + (Number(x.targetAmount) || 0), 0)
    let saved = 0
    const actives = computed.filter(({ g }) => !['completed', 'expired', 'paused'].includes(g.level))
    actives.forEach(({ g }) => (saved += g.saved))
    const activeTotal = actives.reduce((s, x) => s + (Number(x.goal.targetAmount) || 0), 0)
    const pct = activeTotal > 0 ? Math.round((saved / activeTotal) * 100) : 0
    return { totalGoals: goals.length, total, saved, pct }
  }, [computed, goals])

  const detail = detailId ? computed.find((c) => c.goal.id === detailId) : null

  const handleSave = (data) => {
    if (editingGoal) updateGoal(editingGoal.id, data)
    else addGoal(data)
    setFormOpen(false)
    setEditingGoal(null)
    setSmartPlan(null)
    setSmart('')
  }

  const runSmart = async () => {
    const t = smart.trim()
    if (!t) return
    setSmartBusy(true)
    setSmartPlan(null)
    const plan = await aiGoalPlan(t, { settings })
    setSmartPlan({ ...plan, text: t })
    setSmartBusy(false)
  }

  const createFromSmart = () => {
    if (!smartPlan || smartPlan.target <= 0) return
    setEditingGoal(null)
    setFormOpen(true)
    setSmartPlan(null)
    setSmart('')
  }

  const prefill = smartPlan && smartPlan.target > 0
    ? {
        name: smartPlan.text.slice(0, 12),
        targetAmount: smartPlan.target,
        startDate: today,
        endDate: addMonths(today, smartPlan.months),
      }
    : null

  return (
    <div className="fixed inset-0 z-40 bg-[#FFF4E8] overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* header */}
        <header className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-2xl bg-white shadow-soft text-pig-ink hover:brightness-105 transition" aria-label="返回主工作台">
              <BackIcon size={20} />
            </button>
            <h1 className="font-cute font-extrabold text-2xl text-pig-ink">存钱目标 🎯</h1>
          </div>
          <button
            onClick={() => { setEditingGoal(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-pig-accent text-white font-cute font-bold shadow-chip hover:brightness-105 transition"
          >
            <PlusIcon size={16} /> 新建目标
          </button>
        </header>

        {/* overview */}
        <div className="bg-gradient-to-r from-pig-bg to-white rounded-blob shadow-soft p-5 mb-5 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-pig-sub">目标总数</p>
            <p className="font-cute font-bold text-2xl text-pig-ink">{overview.totalGoals}</p>
          </div>
          <div className="h-8 w-px bg-[#EFDCBF]" />
          <div>
            <p className="text-xs text-pig-sub">进行中目标总金额</p>
            <p className="font-cute font-bold text-2xl text-pig-ink">{fmtMoney(overview.total)}</p>
          </div>
          <div className="h-8 w-px bg-[#EFDCBF]" />
          <div>
            <p className="text-xs text-pig-sub">进行中已存</p>
            <p className="font-cute font-bold text-2xl text-pig-deposit">{fmtMoney(overview.saved)}</p>
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center justify-between text-xs text-pig-sub mb-1">
              <span>进行中总体进度</span>
              <span className="font-bold text-pig-ink">{overview.pct}%</span>
            </div>
            <div className="h-3 rounded-full bg-white overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full"
                style={{ width: `${overview.pct}%`, background: 'linear-gradient(90deg,#F4A261,#F2C14E)' }}
              />
            </div>
          </div>
        </div>

        {/* AI smart create */}
        <div className="bg-gradient-to-r from-[#FDF1DD] to-[#F9E5F0] rounded-blob p-4 mb-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-pig-ink mb-2">
            <SparkIcon size={16} /> 一句话新建目标
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-2xl border-2 border-white px-4 py-2.5 text-pig-ink bg-white/90 focus:border-pig-accent outline-none"
              placeholder="例如：一年内存10万，或 6个月攒3万旅游基金"
              value={smart}
              onChange={(e) => setSmart(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSmart()}
            />
            <button
              onClick={runSmart}
              disabled={smartBusy}
              className="px-5 rounded-2xl bg-pig-accent text-white font-cute font-bold shadow-chip hover:brightness-105 disabled:opacity-60 transition"
            >
              {smartBusy ? '解析中…' : '规划'}
            </button>
          </div>
          {smartPlan && smartPlan.target > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 bg-white/80 rounded-2xl p-3">
              <span className="text-sm text-pig-ink">{smartPlan.note}</span>
              <button
                onClick={createFromSmart}
                className="px-3 py-1.5 rounded-2xl bg-pig-ink text-white text-sm font-medium hover:brightness-110 transition"
              >
                用此方案创建 →
              </button>
            </div>
          )}
          {smartPlan && smartPlan.target <= 0 && (
            <p className="mt-2 text-xs text-pig-coral">未能识别金额或期限，请补充，如“6个月存3万”。</p>
          )}
        </div>

        {detail ? (
          <GoalDetail
            goal={detail.goal}
            g={detail.g}
            accounts={accounts}
            transactions={transactions}
            settings={settings}
            actions={{
              onClose: () => setDetailId(null),
              onEdit: () => { setEditingGoal(detail.goal); setFormOpen(true) },
              onCheckin: (entry) => addGoalCheckin(detail.goal.id, entry),
              onDeleteCheckin: (cid) => deleteGoalCheckin(detail.goal.id, cid),
              onManualAdjust: (amt) => updateGoal(detail.goal.id, { manualAdjust: (Number(detail.goal.manualAdjust) || 0) + amt }),
            }}
          />
        ) : (
          <>
            {/* sort + filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-2xl text-sm transition ${
                      filter === f.key ? 'bg-pig-ink text-white shadow-chip' : 'bg-white text-pig-sub hover:bg-[#f7e7d3]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-2xl border-2 border-[#EFDCBF] px-3 py-1.5 text-pig-ink bg-white text-sm"
              >
                <option value="due">按截止日期</option>
                <option value="progress">按进度</option>
                <option value="amount">按金额</option>
              </select>
            </div>

            {list.length === 0 ? (
              <div className="text-center text-pig-sub py-16">暂无该状态下的目标，去「新建目标」开始存钱吧 🐷</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map(({ goal, g }) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    g={g}
                    onClick={() => setDetailId(goal.id)}
                    onTogglePause={() => updateGoal(goal.id, { status: goal.status === 'paused' ? 'active' : 'paused' })}
                    onDelete={() => { if (confirm(`删除目标「${goal.name}」？打卡记录将一并删除。`)) deleteGoal(goal.id) }}
                  />
                ))}
              </div>
            )}
            <p className="text-center text-xs text-pig-sub mt-8 pb-4">
              🐷 目标进度实时根据关联账户存入流水与打卡记录自动计算
            </p>
          </>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <GoalFormModal
            accounts={accounts}
            goal={editingGoal || null}
            initial={prefill || null}
            onClose={() => { setFormOpen(false); setEditingGoal(null) }}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  )
}
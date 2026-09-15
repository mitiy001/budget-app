import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import GoalRing from './GoalRing'
import { fmtPlain, STATUS_META } from '../../goals'
import { localGoalAdvice } from '../../ai'
import { fmtMoney } from '../../store'
import { SparkIcon, PlusIcon, TrashIcon, BackIcon, EditIcon } from '../../icons'

const toneStyle = {
  good: 'bg-[#E9F7EF] text-[#4C9B6D]',
  warn: 'bg-[#FDF2E4] text-[#C97A2A]',
  info: 'bg-[#EAF3F6] text-[#5B98A6]',
}

export default function GoalDetail({ goal, g, accounts, transactions, settings, actions }) {
  const { onClose, onEdit, onCheckin, onDeleteCheckin, onManualAdjust } = actions
  const advice = useMemo(() => localGoalAdvice(goal, g), [goal, g])
  const meta = STATUS_META[g.level]

  const [ciDate, setCiDate] = useState(new Date().toISOString().slice(0, 10))
  const [ciAmount, setCiAmount] = useState('')
  const [adjAmount, setAdjAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const lineData = g.expectedCumulative || []
  const pct = Math.round(g.pct)
  const accNames = (ids) => accounts.filter((a) => ids.includes(a.id)).map((a) => a.name)
  const linkedNames = accNames(goal.linkedAccountIds || [])
  const hasCheckins = (goal.checkins || []).length > 0

  const submitCheckin = (e) => {
    e.preventDefault()
    const amt = parseFloat(ciAmount)
    if (!amt || amt <= 0) return
    setBusy(true)
    // slight delay so the "撒花" state isn't jumpy
    setTimeout(() => {
      onCheckin({ date: ciDate, amount: amt })
      setCiAmount('')
      setBusy(false)
    }, 120)
  }

  const submitAdjust = (e) => {
    e.preventDefault()
    const amt = parseFloat(adjAmount)
    onManualAdjust(amt || 0)
    setAdjAmount('')
  }

  return (
    <div>
      {/* header */}
      <div className="sticky top-0 bg-pig-card z-10 pb-3 border-b border-[#F4E6D2] mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 rounded-xl bg-pig-bg text-pig-sub hover:bg-[#f7e7d3] transition" aria-label="返回">
            <BackIcon size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-cute font-bold text-xl text-pig-ink truncate">
              {meta.emoji} {goal.name}
            </h2>
            <p className="text-xs text-pig-sub">
              {goal.startDate} → {goal.endDate} · {goal.status === 'paused' ? '已暂停' : g.scheduledOnTime === false ? '当前无法按时完成' : '进度评估有效'}
            </p>
          </div>
          <button onClick={onEdit} className="p-1.5 rounded-xl bg-pig-bg text-pig-sub hover:bg-pig-accent hover:text-white transition" aria-label="编辑">
            <EditIcon size={16} />
          </button>
        </div>
        {goal.note && <p className="text-xs text-pig-sub mt-1.5">{goal.note}</p>}
      </div>

      <div className="space-y-4">
        {/* top: ring + key numbers */}
        <div className="flex flex-col sm:flex-row items-center gap-5 bg-pig-bg rounded-blob p-5">
          <GoalRing pct={g.progress} label={`${pct}%`} subLabel="完成度" color={meta.emoji === '✅' ? '#62B98B' : '#F4A261'} />
          <div className="flex-1 w-full grid grid-cols-2 gap-3">
            <BigStat l="目标金额" v={fmtMoney(goal.targetAmount)} />
            <BigStat l="已存金额" v={fmtMoney(g.saved)} sub={`${pct}%`} />
            <BigStat l="剩余金额" v={fmtMoney(g.remaining)} />
            <BigStat l="剩余天数" v={`${g.remainingDays} 天`} sub={`共 ${g.totalDays} 天`} />
          </div>
        </div>

        {/* daily / monthly need highlight */}
        <div className="rounded-blob p-4 text-white shadow-soft" style={{ background: 'linear-gradient(120deg,#F4A261,#E76F51)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-white/80 text-xs">每天需存</p>
              <p className="font-cute font-bold text-2xl">¥{fmtPlain(g.dailyNeed)}</p>
            </div>
            <div className="h-8 w-px bg-white/30 hidden sm:block" />
            <div>
              <p className="text-white/80 text-xs">每月需存</p>
              <p className="font-cute font-bold text-2xl">¥{fmtPlain(g.monthlyNeed)}</p>
            </div>
            <div className="h-8 w-px bg-white/30 hidden sm:block" />
            <div>
              <p className="text-white/80 text-xs">当前日均存款</p>
              <p className="font-cute font-bold text-2xl">¥{fmtPlain(g.avgDaily)}</p>
            </div>
            {g.projectedDate && (
              <div>
                <p className="text-white/80 text-xs">预计完成</p>
                <p className="font-cute font-bold text-xl">{g.projectedDate}</p>
              </div>
            )}
          </div>
        </div>

        {/* plan vs actual */}
        <div className="bg-pig-card rounded-blob shadow-soft p-5">
          <h3 className="font-cute font-bold text-pig-ink mb-1">计划 vs 实际累计存款</h3>
          <p className="text-xs text-pig-sub mb-3">虚线为目标线性累计，实线为按关联账户存入 + 打卡估算的累计。</p>
          {lineData.length === 0 ? (
            <p className="text-center text-pig-sub py-6">期限尚未开始，暂无趋势数据 📅</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#F0E3D1" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#A98E7E' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#A98E7E' }} width={56} />
                  <Tooltip formatter={(v) => [fmtMoney(Number(v) || 0), '元']} contentStyle={{ borderRadius: 16, border: '2px solid #F2B26B', background: '#fff', fontSize: 13 }} />
                  <Legend />
                  <Line dataKey="plan" name="计划" stroke="#E7A34F" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} />
                  <Line dataKey="actual" name="实际" stroke="#7FB8A9" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* AI advice */}
        <div className={`rounded-blob p-4 flex gap-3 ${toneStyle[advice.tone] || toneStyle.info}`}>
          <span className="shrink-0 mt-0.5"><SparkIcon size={18} /></span>
          <div>
            <p className="font-bold text-sm mb-0.5">AI 规划建议</p>
            <p className="text-sm leading-relaxed">{advice.advice}</p>
          </div>
        </div>

        {/* check-in */}
        <div className="bg-pig-card rounded-blob shadow-soft p-5">
          <h3 className="font-cute font-bold text-pig-ink mb-1">每日 / 每月打卡</h3>
          <p className="text-xs text-pig-sub mb-3">手动记录一笔存款，计入目标进度并用于日均计算。</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="date"
              className="rounded-2xl border-2 border-[#EFDCBF] px-3 py-2 text-pig-ink bg-white"
              value={ciDate}
              onChange={(e) => setCiDate(e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="存入金额"
              className="rounded-2xl border-2 border-[#EFDCBF] px-3 py-2 text-pig-ink bg-white"
              value={ciAmount}
              onChange={(e) => setCiAmount(e.target.value)}
            />
            <button
              onClick={submitCheckin}
              disabled={busy}
              className="flex items-center justify-center gap-1 rounded-2xl bg-pig-accent text-white font-cute font-bold shadow-chip hover:brightness-105 disabled:opacity-60 transition"
            >
              <PlusIcon size={15} /> 打卡存入
            </button>
          </div>

          {hasCheckins && (
            <div className="mt-3 space-y-1.5 max-h-44 overflow-y-auto">
              {[...goal.checkins].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-2xl bg-pig-bg">
                  <div>
                    <span className="text-xs text-pig-sub">{c.date}</span>
                    <span className="ml-2 font-semibold text-pig-deposit">+¥{fmtPlain(c.amount)}</span>
                  </div>
                  <button onClick={() => onDeleteCheckin(c.id)} className="text-pig-sub hover:text-pig-coral transition p-1" aria-label="删除打卡">
                    <TrashIcon size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* manual adjust (外部转入) */}
          <form onSubmit={submitAdjust} className="mt-3 pt-3 border-t border-[#F4E6D2] flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-pig-sub mb-1">手动调整“目标已存”（如从其他账户一次性转入）</label>
              <input
                type="number"
                step="0.01"
                placeholder="输入增减金额（负数表示扣除）"
                className="w-full rounded-2xl border-2 border-[#EFDCBF] px-3 py-2 text-pig-ink bg-white"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-2xl bg-pig-ink text-white text-sm font-medium hover:brightness-110 transition">
              调整
            </button>
          </form>
        </div>

        {linkedNames.length > 0 && (
          <p className="text-xs text-pig-sub">
            自动累计账户：{linkedNames.join('、')} 的存入流水已计入本目标。
          </p>
        )}
      </div>
    </div>
  )
}

function BigStat({ l, v, sub }) {
  return (
    <div className="bg-white rounded-2xl px-3 py-2.5 shadow-chip">
      <p className="text-[11px] text-pig-sub">{l}</p>
      <p className="font-cute font-bold text-lg text-pig-ink truncate">{v}</p>
      {sub && <p className="text-[10px] text-pig-accent">{sub}</p>}
    </div>
  )
}
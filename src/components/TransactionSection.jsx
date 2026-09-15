import { useState } from 'react'
import { SparkIcon, ArrowUp, ArrowDown, PlusIcon, UploadIcon } from '../icons'
import { aiParseLedger, matchAccount } from '../ai'
import { todayStr } from '../store'

export default function TransactionSection({ accounts, onAdd, settings, onOpenImport, goals }) {
  const [aiText, setAiText] = useState('')
  const [aiState, setAiState] = useState('idle') // idle | loading | done
  const [aiHint, setAiHint] = useState('')
  const [form, setForm] = useState({
    date: todayStr(),
    accountId: accounts[0]?.id || '',
    direction: 'deposit',
    amount: '',
    note: '',
    goalId: '',
  })
  const [error, setError] = useState('')

  const runAi = async () => {
    const text = aiText.trim()
    if (!text) return
    setAiState('loading')
    setAiHint('')
    const { usedAi, result, error: err } = await aiParseLedger(text, { settings })
    if (result) {
      setForm((f) => ({
        ...f,
        date: result.date,
        amount: result.amount || '',
        direction: result.direction,
        note: result.note,
        accountId: matchAccount(accounts, result.accountHint) || f.accountId,
      }))
    }
    setAiState('done')
    setAiHint(
      usedAi ? 'AI 已解析，请核对下面表单后提交 ✨' : '已用内置规则解析（未配置 AI Key），请核对 ✨'
    )
    if (err) setAiHint(`AI 调用失败，已用本地规则解析：${err}`)
  }

  const quickAccount = (id) => setForm((f) => ({ ...f, accountId: id }))
  const setDir = (d) => setForm((f) => ({ ...f, direction: d }))

  const submit = (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.date) return setError('请选择日期')
    if (!form.accountId) return setError('请选择账户')
    if (!amount || amount <= 0 || isNaN(amount)) return setError('金额需大于 0')
    onAdd({
      date: form.date,
      accountId: form.accountId,
      amount: form.direction === 'withdraw' ? -Math.abs(amount) : Math.abs(amount),
      direction: form.direction,
      note: form.note.trim() || (form.direction === 'deposit' ? '存入' : '支取'),
      goalId: form.direction === 'deposit' ? (form.goalId || '') : '',
    })
    setForm((f) => ({ ...f, amount: '', note: '', goalId: '' }))
    setAiText('')
    setError('')
  }

  const cashColor = form.direction === 'deposit' ? 'bg-pig-deposit' : 'bg-pig-withdraw'

  return (
    <section className="bg-pig-card rounded-blob shadow-soft p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-cute font-bold text-xl text-pig-ink">记一笔</h2>
        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 bg-[#F6E8DC] text-pig-ink text-sm font-medium px-3.5 py-2 rounded-2xl hover:bg-[#F0DCC9] transition"
        >
          <UploadIcon size={15} /> 导入账单
        </button>
      </div>

      {/* AI input */}
      <div className="mb-4 p-4 rounded-blob bg-gradient-to-r from-[#FDF1DD] to-[#F9E5F0]">
        <label className="flex items-center gap-2 text-sm font-semibold text-pig-ink mb-2">
          <SparkIcon size={16} /> 一句话记账
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-2xl border-2 border-white px-4 py-2.5 text-pig-ink bg-white/90 focus:border-pig-accent"
            placeholder="例如：今天工资存了5000到招行"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runAi()}
          />
          <button
            onClick={runAi}
            disabled={aiState === 'loading'}
            className="px-5 rounded-2xl bg-pig-accent text-white font-cute font-bold shadow-chip hover:brightness-105 disabled:opacity-60 transition"
          >
            {aiState === 'loading' ? '解析中…' : '解析'}
          </button>
        </div>
        {aiHint && <p className="mt-2 text-xs text-pig-sub">{aiHint}</p>}
      </div>

      {/* manual form */}
      <form onSubmit={submit} className="space-y-3">
        {error && <p className="text-sm text-pig-coral">{error}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-pig-sub mb-1">日期 *</label>
            <input
              type="date"
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-3 py-2 text-pig-ink bg-white"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-pig-sub mb-1">账户 *</label>
            <select
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-3 py-2 text-pig-ink bg-white"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-pig-sub mb-1">金额 *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-3 py-2 text-pig-ink bg-white"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-pig-sub mb-1">备注</label>
            <input
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-3 py-2 text-pig-ink bg-white"
              placeholder="可选"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>

        {form.direction === 'deposit' && goals && goals.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-pig-sub">计入目标</span>
            <select
              className="rounded-2xl border-2 border-[#EFDCBF] px-3 py-1.5 text-pig-ink bg-white text-sm"
              value={form.goalId}
              onChange={(e) => setForm({ ...form, goalId: e.target.value })}
            >
              <option value="">不指定（仅计入账户）</option>
              {goals
                .filter((gv) => gv.status === 'active')
                .map((gv) => (
                  <option key={gv.id} value={gv.id}>{gv.name}</option>
                ))}
            </select>
            <span className="text-[11px] text-pig-sub">绑定账户的存入也会自动累计到目标进度</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDir('deposit')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-semibold text-sm transition ${
                form.direction === 'deposit'
                  ? 'bg-pig-deposit text-white shadow-chip'
                  : 'bg-pig-bg text-pig-sub hover:bg-[#f7e7d3]'
              }`}
            >
              <ArrowUp size={15} /> 存入
            </button>
            <button
              type="button"
              onClick={() => setDir('withdraw')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-semibold text-sm transition ${
                form.direction === 'withdraw'
                  ? 'bg-pig-withdraw text-white shadow-chip'
                  : 'bg-pig-bg text-pig-sub hover:bg-[#e7f0f4]'
              }`}
            >
              <ArrowDown size={15} /> 支取
            </button>
            {accounts.slice(0, 4).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => quickAccount(a.id)}
                className={`px-3 py-2 rounded-2xl text-xs font-medium transition ${
                  form.accountId === a.id
                    ? `${cashColor} text-white shadow-chip`
                    : 'bg-pig-bg text-pig-sub hover:bg-[#f7e7d3]'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-[#7FB8A9] text-white font-cute font-bold shadow-chip hover:brightness-105 active:translate-y-0.5 transition"
          >
            <PlusIcon size={16} /> 记入存钱罐
          </button>
        </div>
      </form>
    </section>
  )
}
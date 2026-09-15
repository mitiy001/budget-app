import { useState } from 'react'
import Modal from '../Modal'
import { todayStr, addMonths } from '../../goals'

const empty = () => ({
  name: '',
  targetAmount: '',
  endDate: '',
  linkedAccountIds: [],
  initialSaved: '',
  note: '',
})

export default function GoalFormModal({ accounts, goal, initial, onSave, onClose }) {
  const isEdit = !!(goal && goal.id)
  const src = isEdit ? goal : initial
  const initialStart = src?.startDate || todayStr()
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: goal.name,
          targetAmount: String(goal.targetAmount),
          endDate: goal.endDate,
          linkedAccountIds: [...(goal.linkedAccountIds || [])],
          initialSaved: String(goal.initialSaved ?? ''),
          note: goal.note || '',
        }
      : {
          ...empty(),
          endDate: addMonths(initialStart, src?.months || 12),
          name: src?.name || '',
          targetAmount: src?.targetAmount != null ? String(src.targetAmount) : '',
          initialSaved: src?.initialSaved != null ? String(src.initialSaved) : '',
        }
  )
  const [startDate, setStartDate] = useState(initialStart)
  const [error, setError] = useState('')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const toggleAcc = (id) =>
    setForm((f) => ({
      ...f,
      linkedAccountIds: f.linkedAccountIds.includes(id)
        ? f.linkedAccountIds.filter((x) => x !== id)
        : [...f.linkedAccountIds, id],
    }))

  const quickDur = (months) => setForm((f) => ({ ...f, endDate: addMonths(startDate, months) }))

  const submit = (e) => {
    e.preventDefault()
    const target = Number(form.targetAmount)
    if (!form.name.trim()) return setError('请填写目标名称')
    if (!target || target <= 0) return setError('目标金额需大于 0')
    if (!form.endDate) return setError('请选择截止日期')
    if (form.endDate <= startDate) return setError('截止日期需晚于开始日期')
    onSave({
      name: form.name.trim(),
      targetAmount: target,
      startDate,
      endDate: form.endDate,
      linkedAccountIds: form.linkedAccountIds,
      initialSaved: Number(form.initialSaved) || 0,
      note: form.note.trim(),
    })
  }

  return (
    <Modal title={isEdit ? '编辑目标' : '新建存钱目标'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-pig-sub mb-1">目标名称 *</label>
          <input
            className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white focus:border-pig-accent outline-none"
            placeholder="例如：旅游基金、买房首付、教育金"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-pig-sub mb-1">目标金额 *</label>
            <input
              type="number"
              min="1"
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white focus:border-pig-accent outline-none"
              placeholder="0.00"
              value={form.targetAmount}
              onChange={(e) => set({ targetAmount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-pig-sub mb-1">初始已存</label>
            <input
              type="number"
              min="0"
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white focus:border-pig-accent outline-none"
              placeholder="0.00（可选）"
              value={form.initialSaved}
              onChange={(e) => set({ initialSaved: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-pig-sub mb-1">开始日期</label>
          <input
            type="date"
            className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white focus:border-pig-accent outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-pig-sub">截止日期 *</label>
            <div className="flex gap-1.5">
              {[
                [3, '3个月'],
                [6, '6个月'],
                [12, '1年'],
              ].map(([m, lab]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => quickDur(m)}
                  className="text-xs px-2 py-1 rounded-xl bg-pig-bg text-pig-sub hover:bg-[#f7e7d3] transition"
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
          <input
            type="date"
            className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white focus:border-pig-accent outline-none"
            value={form.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </div>

        <div>
          <span className="block text-sm text-pig-sub mb-1">关联账户（存入流水自动计入该目标）</span>
          {accounts.length === 0 ? (
            <p className="text-sm text-pig-sub">还没有账户，先到「账户管理」新建一个吧 🐷</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => {
                const on = form.linkedAccountIds.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAcc(a.id)}
                    className={`px-3 py-1.5 rounded-2xl text-sm font-medium transition ${
                      on ? 'bg-pig-accent text-white shadow-chip' : 'bg-pig-bg text-pig-sub hover:bg-[#f7e7d3]'
                    }`}
                  >
                    {on ? '✓ ' : ''}{a.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-pig-sub mb-1">备注</label>
          <input
            className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white focus:border-pig-accent outline-none"
            placeholder="可选"
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>

        {error && <p className="text-sm text-pig-coral">{error}</p>}

        <button
          type="submit"
          className="w-full py-2.5 rounded-2xl bg-pig-accent text-white font-cute font-bold shadow-chip hover:brightness-105 transition"
        >
          {isEdit ? '保存修改' : '创建目标'}
        </button>
      </form>
    </Modal>
  )
}
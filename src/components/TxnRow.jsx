import { useState } from 'react'
import { fmtMoney } from '../store'
import { EditIcon, TrashIcon, ArrowUp, ArrowDown } from '../icons'

export default function TxnRow({ txn, accounts, editing, onEditToggle, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState({
    date: txn.date,
    accountId: txn.accountId,
    amount: Math.abs(txn.amount),
    direction: txn.direction,
    note: txn.note,
  })
  const [err, setErr] = useState('')
  const acc = accounts.find((a) => a.id === txn.accountId)
  const isDeposit = txn.amount > 0

  if (editing) {
    const save = (e) => {
      e.preventDefault()
      const amt = parseFloat(form.amount)
      if (!form.date || !form.accountId) return setErr('日期和账户必填')
      if (!amt || amt <= 0) return setErr('金额需大于 0')
      onSave(txn.id, {
        date: form.date,
        accountId: form.accountId,
        note: form.note.trim(),
        direction: form.direction,
        amount: form.direction === 'withdraw' ? -Math.abs(amt) : Math.abs(amt),
      })
    }
    return (
      <form onSubmit={save} className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-white border-2 border-[#EFDCBF]">
        <input type="date" className="rounded-xl border border-[#EFDCBF] px-2 py-1 text-sm text-pig-ink bg-white" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <div className="flex rounded-xl overflow-hidden">
          <button type="button" onClick={() => setForm({ ...form, direction: 'deposit' })} className={`px-2 py-1 text-xs ${form.direction === 'deposit' ? 'bg-pig-deposit text-white' : 'bg-pig-bg text-pig-sub'}`}>存</button>
          <button type="button" onClick={() => setForm({ ...form, direction: 'withdraw' })} className={`px-2 py-1 text-xs ${form.direction === 'withdraw' ? 'bg-pig-withdraw text-white' : 'bg-pig-bg text-pig-sub'}`}>取</button>
        </div>
        <select className="rounded-xl border border-[#EFDCBF] px-2 py-1 text-sm text-pig-ink bg-white" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="number" step="0.01" className="w-24 rounded-xl border border-[#EFDCBF] px-2 py-1 text-sm text-pig-ink bg-white" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input className="flex-1 min-w-[120px] rounded-xl border border-[#EFDCBF] px-2 py-1 text-sm text-pig-ink bg-white" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        {err && <span className="text-xs text-pig-coral">{err}</span>}
        <button type="submit" className="px-3 py-1 rounded-xl bg-pig-accent text-white text-sm font-semibold">保存</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 rounded-xl bg-pig-bg text-pig-sub text-sm">取消</button>
      </form>
    )
  }

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-white/80 ${isDeposit ? 'border-l-4 border-pig-deposit' : 'border-l-4 border-pig-withdraw'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-pig-sub shrink-0">{txn.date}</span>
        <span className="text-sm font-medium text-pig-ink truncate">{txn.note}</span>
        {acc && <span className="text-xs text-pig-sub bg-pig-bg px-2 py-0.5 rounded-full shrink-0">{acc.name}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`flex items-center gap-1 font-cute font-bold ${isDeposit ? 'text-pig-deposit' : 'text-pig-withdraw'}`}>
          {isDeposit ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {fmtMoney(txn.amount)}
        </span>
        <button onClick={onEditToggle} className="text-pig-sub hover:text-pig-accent transition p-1" aria-label="编辑"><EditIcon /></button>
        <button onClick={() => onDelete(txn.id)} className="text-pig-sub hover:text-pig-coral transition p-1" aria-label="删除"><TrashIcon /></button>
      </div>
    </div>
  )
}
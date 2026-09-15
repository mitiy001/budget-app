import { useState } from 'react'
import Modal from './Modal'
import { PlusIcon, PigIcon, TrashIcon, EditIcon } from '../icons'
import { fmtMoney } from '../store'

const emptyForm = { name: '', initial: '', note: '' }

export default function AccountModal({ accounts, transactions, onClose, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const balanceOf = (id) =>
    transactions
      .filter((t) => t.accountId === id)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)

  const submit = (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('名称不能为空')
    const initial = Number(form.initial) || 0
    if (editing) {
      onUpdate(editing, { name, initial, note: form.note.trim(), createdAt: undefined })
    } else {
      onAdd({ name, initial, note: form.note.trim() })
    }
    setForm(emptyForm)
    setEditing(null)
    setError('')
  }

  const startEdit = (a) => {
    setEditing(a.id)
    setForm({ name: a.name, initial: a.initial, note: a.note || '' })
  }
  const startAdd = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  return (
    <Modal title={<span>存钱罐账户</span>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 mb-6 p-4 rounded-blob bg-pig-bg">
        <div className="flex items-center gap-3">
          <PigIcon size={30} />
          <p className="text-sm text-pig-ink">
            {editing ? '编辑这个存钱罐' : '新建一个存钱罐（储蓄账户）'}
          </p>
        </div>
        <label className="block text-sm text-pig-sub">账户名称 *</label>
        <input
          className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white"
          placeholder="例如：招商银行、零钱通、余额宝"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-pig-sub">初始余额</label>
            <input
              type="number"
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white"
              placeholder="0.00"
              value={form.initial}
              onChange={(e) => setForm({ ...form, initial: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-pig-sub">备注</label>
            <input
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white"
              placeholder="可选"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>
        {error && <p className="text-sm text-pig-coral">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-1.5 bg-pig-accent text-white font-cute font-bold py-2.5 rounded-2xl shadow-chip hover:brightness-105 active:translate-y-0.5 transition"
          >
            <PlusIcon size={16} /> {editing ? '保存修改' : '新建账户'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={startAdd}
              className="px-4 py-2.5 rounded-2xl bg-white text-pig-sub border-2 border-[#EFDCBF] hover:bg-pig-bg transition"
            >
              取消编辑
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2.5">
        {accounts.map((a) => {
          const bal = balanceOf(a.id) + (Number(a.initial) || 0)
          return (
            <div
              key={a.id}
              className="flex items-center justify-between px-4 py-3 rounded-blob bg-pig-bg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-pig-accent font-cute font-bold">
                  {a.name.slice(0, 1)}
                </div>
                <div>
                  <p className="font-semibold text-pig-ink">{a.name}</p>
                  <p className="text-xs text-pig-sub">{a.note || '暂无备注'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-cute font-bold text-pig-ink mr-1">{fmtMoney(bal)}</span>
                <button
                  onClick={() => startEdit(a)}
                  className="text-pig-sub hover:text-pig-accent transition p-1"
                  aria-label="编辑"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => onDelete(a.id)}
                  className="text-pig-sub hover:text-pig-coral transition p-1"
                  aria-label="删除"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          )
        })}
        {accounts.length === 0 && (
          <p className="text-center text-pig-sub py-6">还没有账户，先新建一个吧 🐷</p>
        )}
      </div>
    </Modal>
  )
}
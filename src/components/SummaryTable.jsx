import { useState } from 'react'
import { fmtMoney, yyyymm, monthStartBalance } from '../store'
import { EditIcon, TrashIcon, ArrowDown } from '../icons'
import TxnRow from './TxnRow'

export default function SummaryTable({ accounts, monthlyRows, transactions, onEdit, onDelete }) {
  const [openMonth, setOpenMonth] = useState(null)
  const [openTxnId, setOpenTxnId] = useState(null)

  const months = [...new Set(monthlyRows.map((r) => r.month))].sort()
  const byMonthAcc = {}
  monthlyRows.forEach((r) => {
    if (!byMonthAcc[r.month]) byMonthAcc[r.month] = {}
    byMonthAcc[r.month][r.accountId] = r.balance
  })

  return (
    <section className="bg-pig-card rounded-blob shadow-soft p-6">
      <h2 className="font-cute font-bold text-xl text-pig-ink mb-4">月度余额汇总</h2>
      <div className="border-2 border-[#EFDCBF] rounded-blob overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FBF0DE] text-left text-pig-sub">
              <th className="px-4 py-2.5 font-semibold">月份</th>
              {accounts.map((a) => (
                <th key={a.id} className="px-3 py-2.5 font-medium whitespace-nowrap">
                  {a.name}
                </th>
              ))}
              <th className="px-3 py-2.5 font-semibold text-right">合计</th>
              <th className="px-3 py-2.5 font-semibold text-right">当月变动</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const row = byMonthAcc[m] || {}
              const total = accounts.reduce((s, a) => s + (row[a.id] || 0), 0)
              const prevTotal = accounts.reduce(
                (s, a) => s + monthStartBalance(byMonthAcc, a.id, m),
                0
              )
              const change = total - prevTotal
              const open = openMonth === m
              return (
                <MonthGroup
                  key={m}
                  m={m}
                  open={open}
                  total={total}
                  change={change}
                  accounts={accounts}
                  row={row}
                  onToggle={() => setOpenMonth(open ? null : m)}
                  txns={transactions.filter((t) => yyyymm(t.date) === m)}
                  openTxnId={openTxnId}
                  setOpenTxnId={setOpenTxnId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              )
            })}
            {months.length === 0 && (
              <tr>
                <td colSpan={accounts.length + 3} className="text-center py-8 text-pig-sub">
                  暂无流水，先去「记一笔」或导入账单吧 🐷
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MonthGroup({ m, open, total, change, accounts, row, onToggle, txns, openTxnId, setOpenTxnId, onEdit, onDelete }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-t border-[#F4E6D2] hover:bg-pig-bg cursor-pointer transition"
      >
        <td className="px-4 py-3 font-semibold text-pig-ink flex items-center gap-1.5">
          {m}
          <ArrowDown size={14} className={`text-pig-sub transition-transform ${open ? 'rotate-180' : ''}`} />
        </td>
        {accounts.map((a) => (
          <td key={a.id} className={`px-3 py-3 whitespace-nowrap ${row[a.id] != null ? 'font-medium' : 'text-pig-sub'}`}>
            {row[a.id] != null ? fmtMoney(row[a.id]) : '—'}
          </td>
        ))}
        <td className="px-3 py-3 text-right font-cute font-bold text-pig-ink whitespace-nowrap">
          {fmtMoney(total)}
        </td>
        <td className={`px-3 py-3 text-right font-semibold whitespace-nowrap ${change >= 0 ? 'text-pig-deposit' : 'text-pig-withdraw'}`}>
          {change >= 0 ? '+' : ''}
          {fmtMoney(change)}
        </td>
      </tr>
      {open && (
        <tr className="bg-[#FDF6EC]">
          <td colSpan={accounts.length + 3} className="px-4 py-3">
            {txns.length === 0 ? (
              <p className="text-sm text-pig-sub">该月暂无流水。</p>
            ) : (
              <div className="space-y-1.5">
                {txns.map((t) => (
                  <TxnRow
                    key={t.id}
                    txn={t}
                    accounts={accounts}
                    editing={openTxnId === t.id}
                    onEditToggle={() => setOpenTxnId(openTxnId === t.id ? null : t.id)}
                    onSave={(id, patch, dir) => onEdit(id, patch, dir)}
                    onCancel={() => setOpenTxnId(null)}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// re-export for reuse
export const TxnScaffold = { EditIcon, TrashIcon }
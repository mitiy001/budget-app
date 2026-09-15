import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip,
} from 'recharts'
import { fmtMoney } from '../store'

const PALETTE = ['#F4A261', '#7FB8A9', '#E76F51', '#A78BFA', '#F2C14E', '#5BA3A6']

export default function Charts({ accounts, monthlyRows }) {
  const [hidden, setHidden] = useState({})
  const visibleAcc = accounts.filter((a) => !hidden[a.id])
  const months = [...new Set(monthlyRows.map((r) => r.month))].sort()

  const data = months.map((m) => {
    const point = { month: m }
    accounts.forEach((a) => {
      const row = monthlyRows.find((r) => r.month === m && r.accountId === a.id)
      point[a.id] = row ? row.balance : null
    })
    return point
  })

  const accColor = (i) => PALETTE[i % PALETTE.length]

  const toggle = (id) => setHidden((h) => ({ ...h, [id]: !h[id] }))

  const axisTick = { fontSize: 12, fill: '#A98E7E' }
  const moneyTick = (v) => (Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(v >= 100000 ? 0 : 1)}w` : `${v}`)

  return (
    <section className="bg-pig-card rounded-blob shadow-soft p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-cute font-bold text-xl text-pig-ink">资产趋势</h2>
        <div className="flex flex-wrap gap-1.5">
          {accounts.map((a, i) => (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition ${
                hidden[a.id] ? 'bg-pig-bg text-pig-sub opacity-60' : 'text-white shadow-chip'
              }`}
              style={hidden[a.id] ? {} : { backgroundColor: accColor(i) }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hidden[a.id] ? '#cbb9a8' : '#fff' }} />
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-center text-pig-sub py-8">录入流水后这里会出现趋势图 📈</p>
      ) : (
        <div className="space-y-8">
          <div>
            <p className="text-sm text-pig-sub mb-1">多账户余额走势（折线）</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#F0E3D1" />
                  <XAxis dataKey="month" tick={axisTick} />
                  <YAxis tick={axisTick} tickFormatter={moneyTick} width={52} />
                  <Tooltip formatter={(v) => [fmtMoney(v), '余额']} contentStyle={tooltipStyle} />
                  <Legend />
                  {visibleAcc.map((a, i) => (
                    <Line
                      key={a.id}
                      type="monotone"
                      dataKey={a.id}
                      name={a.name}
                      stroke={accColor(i)}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 0 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-sm text-pig-sub mb-1">每月各账户余额（柱状）</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }} barSize={22}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#F0E3D1" />
                  <XAxis dataKey="month" tick={axisTick} />
                  <YAxis tick={axisTick} tickFormatter={moneyTick} width={52} />
                  <Tooltip formatter={(v) => [fmtMoney(v), '余额']} contentStyle={tooltipStyle} />
                  <Legend />
                  {visibleAcc.map((a, i) => (
                    <Bar key={a.id} dataKey={a.id} name={a.name} fill={accColor(i)} radius={[8, 8, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const tooltipStyle = {
  borderRadius: 16,
  border: '2px solid #F2B26B',
  background: '#fff',
  fontSize: 13,
  boxShadow: '0 6px 20px rgba(236,175,115,0.25)',
}
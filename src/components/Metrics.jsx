import { ArrowUp, ArrowDown, PigIcon } from '../icons'
import { fmtMoney } from '../store'

export default function Metrics({ totalAssets, netChange, month }) {
  const positive = netChange >= 0
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-pig-card rounded-blob shadow-soft p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FDF1DD] to-[#F7DFC0] flex items-center justify-center">
          <PigIcon size={34} />
        </div>
        <div>
          <p className="text-xs text-pig-sub">全部账户总资产</p>
          <p className="font-cute font-bold text-2xl text-pig-ink">{fmtMoney(totalAssets)}</p>
          <p className="text-xs text-pig-sub">{month || ''}</p>
        </div>
      </div>
      <div className="bg-pig-card rounded-blob shadow-soft p-5 flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            positive ? 'bg-[#FDE9D2] text-pig-deposit' : 'bg-[#E7F2F5] text-pig-withdraw'
          }`}
        >
          {positive ? <ArrowUp size={30} /> : <ArrowDown size={30} />}
        </div>
        <div>
          <p className="text-xs text-pig-sub">当月资金净增减</p>
          <p className={`font-cute font-bold text-2xl ${positive ? 'text-pig-deposit' : 'text-pig-withdraw'}`}>
            {fmtMoney(netChange)}
          </p>
          <p className="text-xs text-pig-sub">随筛选联动</p>
        </div>
      </div>
    </section>
  )
}
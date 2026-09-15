import { fmtPlain, STATUS_META } from '../../goals'

const colorOf = (level) =>
  ({
    normal: '#7FB8A9',
    behind: '#F2C14E',
    severe: '#E76F51',
    completed: '#62B98B',
    expired: '#B0A89C',
    paused: '#A98E7E',
  }[level] || '#A98E7E')

export default function GoalCard({ goal, g, onClick, onTogglePause, onDelete }) {
  const metaSt = STATUS_META[g.level]
  const color = colorOf(g.level)
  const pct = Math.round(g.pct)
  const isCompleted = g.level === 'completed'

  return (
    <div
      onClick={onClick}
      className="bg-pig-card rounded-blob shadow-soft p-5 cursor-pointer hover:brightness-[1.02] transition group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{metaSt.emoji}</span>
          <h3 className="font-cute font-bold text-pig-ink truncate">{goal.name}</h3>
        </div>
        <span
          className="shrink-0 text-[11px] px-2 py-0.5 rounded-full text-white font-medium"
          style={{ backgroundColor: color }}
        >
          {metaSt.label}{pct >= 100 ? '·100%' : ''}
        </span>
      </div>

      {/* progress bar */}
      <div className="mt-3 h-3 rounded-full bg-pig-bg overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: isCompleted
              ? 'linear-gradient(90deg,#62B98B,#A8E063)'
              : 'linear-gradient(90deg,#F4A261,#F2C14E)',
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-pig-sub">已存 {fmtPlain(g.saved)} / {fmtPlain(goal.targetAmount)} 元</span>
        <span className="font-cute font-bold text-pig-ink">{pct}%</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat v={fmtPlain(g.remaining)} l="剩余金额" />
        <Stat v={g.remainingDays} l="剩余天数" />
        <Stat v={'¥' + fmtPlain(g.dailyNeed)} l="每日需存" />
      </div>

      <div className="mt-3 pt-3 border-t border-[#F4E6D2] flex items-center justify-between">
        <span className="text-xs text-pig-sub">
          {goal.endDate} 截止 · 每月需存 ¥{fmtPlain(g.monthlyNeed)}
        </span>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onTogglePause}
            className="text-xs px-2 py-1 rounded-xl bg-pig-bg text-pig-sub hover:bg-[#f7e7d3] transition"
          >
            {goal.status === 'paused' ? '恢复' : '暂停'}
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2 py-1 rounded-xl bg-pig-bg text-pig-coral hover:bg-pig-coral hover:text-white transition"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ v, l }) {
  return (
    <div className="bg-pig-bg rounded-2xl py-2">
      <p className="font-cute font-bold text-pig-ink text-sm truncate px-1">{v}</p>
      <p className="text-[11px] text-pig-sub">{l}</p>
    </div>
  )
}
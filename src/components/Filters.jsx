export default function Filters({ accounts, fromMonth, toMonth, selectedAccounts, onChange }) {
  const toggleAcc = (id) => {
    const has = selectedAccounts.includes(id)
    onChange({
      selectedAccounts: has
        ? selectedAccounts.filter((x) => x !== id)
        : [...selectedAccounts, id],
    })
  }
  const setAll = () => onChange({ selectedAccounts: [] })
  const noneSelected = selectedAccounts.length === 0

  return (
    <section className="bg-pig-card rounded-blob shadow-soft p-4 flex flex-wrap items-end gap-4">
      <div className="min-w-[140px]">
        <label className="block text-xs text-pig-sub mb-1">账户筛选</label>
        <button
          onClick={setAll}
          className={`px-3 py-1.5 rounded-2xl text-sm transition mb-1.5 ${noneSelected ? 'bg-pig-accent text-white shadow-chip' : 'bg-pig-bg text-pig-sub hover:bg-[#f7e7d3]'}`}
        >
          全部账户
        </button>
        <div className="flex flex-wrap gap-1.5">
          {accounts.map((a) => {
            const on = selectedAccounts.includes(a.id)
            return (
              <button
                key={a.id}
                onClick={() => toggleAcc(a.id)}
                className={`px-3 py-1 rounded-full text-xs transition ${
                  on ? 'bg-pig-ink text-white' : 'bg-pig-bg text-pig-sub hover:bg-[#f7e7d3]'
                }`}
              >
                {on ? '✓ ' : ''}{a.name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs text-pig-sub mb-1">开始月份</label>
        <input
          type="month"
          className="rounded-2xl border-2 border-[#EFDCBF] px-3 py-1.5 text-pig-ink bg-white"
          value={fromMonth}
          onChange={(e) => onChange({ fromMonth: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs text-pig-sub mb-1">结束月份</label>
        <input
          type="month"
          className="rounded-2xl border-2 border-[#EFDCBF] px-3 py-1.5 text-pig-ink bg-white"
          value={toMonth}
          onChange={(e) => onChange({ toMonth: e.target.value })}
        />
      </div>
    </section>
  )
}
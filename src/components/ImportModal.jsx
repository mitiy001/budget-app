import { useRef, useState } from 'react'
import Modal from './Modal'
import { parseBillFile, fingerprintFor, suggestAccountId } from '../csv'
import { UploadIcon, ArrowUp, ArrowDown, SparkIcon } from '../icons'
import { fmtMoney } from '../store'

export default function ImportModal({ accounts, transactionFPs, onClose, onImport, settings }) {
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState([]) // editable rows
  const [type, setType] = useState('')
  const [mode, setMode] = useState('auto') // auto | all
  const [allAccount, setAllAccount] = useState(accounts[0]?.id || '')
  const [isParsing, setIsParsing] = useState(false)
  const [notice, setNotice] = useState('')

  const [dupCount, setDupCount] = useState(0)
  const [ignored, setIgnored] = useState({}) // index -> true

  const reset = () => {
    setParsed([])
    setType('')
    setFileName('')
    setDupCount(0)
    setIgnored({})
    if (fileRef.current) fileRef.current.value = ''
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsParsing(true)
    setNotice('')
    reset()
    setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const { type, parsed: rows } = await parseBillFile(buf, accounts, { mapping: {} })
      // mark existing duplicates
      let dups = 0
      rows.forEach((r) => {
        r.exists = transactionFPs.has(fingerprintFor(r))
        if (r.exists) dups++
      })
      setType(type)
      setParsed(rows)
      setDupCount(dups)
      setNotice(
        rows.length === 0
          ? '未能从文件中解析出有效流水，请检查是否为支持的账单格式。'
          : `识别为「${billTypeName(type)}」账单，共 ${rows.length} 笔。`
      )
    } catch (err) {
      setNotice(`解析失败：${err?.message || err}`)
    } finally {
      setIsParsing(false)
    }
  }

  const applyModeToAll = () => {
    setParsed((rows) =>
      rows.map((r) => ({ ...r, accountId: mode === 'all' ? allAccount : suggestAccountId(String(r.peer + r.note), accounts) }))
    )
  }

  const applyModeToAllAB = () => {
    setMode('all')
    setAllAccount(accounts[0]?.id || '')
    setParsed((rows) => rows.map((r) => ({ ...r, accountId: accounts[0]?.id || '' })))
  }
  const applyModeToAutoAB = () => {
    setMode('auto')
    setParsed((rows) =>
      rows.map((r) => ({ ...r, accountId: suggestAccountId(String(r.peer + r.note), accounts) }))
    )
  }
  const applyAllAccount = (id) => {
    setAllAccount(id)
    setParsed((rows) => rows.map((r) => ({ ...r, accountId: id })))
  }

  const updateRow = (i, patch) => {
    setParsed((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const toggleIgnore = (i) =>
    setIgnored((ig) => ({ ...ig, [i]: !ig[i] }))

  const dirtyCount = parsed.length - dupCount - Object.values(ignored).filter(Boolean).length
  const validRows = parsed.filter((r, i) => !r.exists && !ignored[i] && r.accountId && r.amount)

  const confirmImport = () => {
    if (validRows.length === 0) return
    onImport(validRows)
    setNotice(`已导入 ${validRows.length} 笔流水 🎉 数据梳洗归位！`)
    setParsed([])
    setDupCount(0)
    setIgnored({})
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Modal title={<span>账单导入</span>} onClose={onClose} wide>
      {/* upload */}
      <div
        className="border-3 border-dashed border-[#EAC89E] rounded-blob bg-pig-bg p-6 text-center cursor-pointer hover:bg-[#f9ecd9] transition"
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={onFile}
        />
        <UploadIcon size={30} className="mx-auto mb-2" />
        <p className="font-semibold text-pig-ink mb-1">
          {fileName || '点击选择支付宝 / 微信导出的 CSV 账单'}
        </p>
        <p className="text-xs text-pig-sub">支持 GBK / UTF-8 自动识别 · 自动去重 · 预览后再导入</p>
        {isParsing && <p className="mt-2 text-sm text-pig-coral">解析中…</p>}
        {notice && <p className="mt-2 text-sm text-pig-ink">{notice}</p>}
      </div>

      {parsed.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2 bg-pig-bg rounded-2xl p-1">
              <button
                onClick={() => { setMode('all'); setAllAccount(accounts[0]?.id || ''); applyModeToAllAB() }}
                className={`px-4 py-1.5 rounded-2xl text-sm font-semibold transition ${mode === 'all' ? 'bg-white shadow-chip text-pig-ink' : 'text-pig-sub'}`}
              >
                全部导入到某账户
              </button>
              <button
                onClick={() => { setMode('auto'); applyModeToAutoAB() }}
                className={`px-4 py-1.5 rounded-2xl text-sm font-semibold transition ${mode === 'auto' ? 'bg-white shadow-chip text-pig-ink' : 'text-pig-sub'}`}
              >
                按规则自动分配
              </button>
            </div>
            {mode === 'all' && (
              <select
                value={allAccount}
                onChange={(e) => { setAllAccount(e.target.value); applyAllAccount(e.target.value) }}
                className="rounded-2xl border-2 border-[#EFDCBF] px-3 py-1.5 text-pig-ink bg-white text-sm"
              >
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
            {mode === 'auto' && (
              <button
                onClick={applyModeToAll}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-2xl bg-[#F6E8DC] text-pig-ink hover:bg-[#F0DCC9] transition"
              >
                <SparkIcon size={14} /> 重新按规则分配
              </button>
            )}
            <span className="text-sm text-pig-sub">可导入 {dirtyCount} 笔</span>
          </div>

          <div className="max-h-72 overflow-y-auto border-2 border-[#EFDCBF] rounded-blob">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#FBF0DE]">
                <tr className="text-left text-pig-sub">
                  <th className="px-3 py-2 font-medium">日期</th>
                  <th className="px-3 py-2 font-medium">对方/说明</th>
                  <th className="px-3 py-2 font-medium">金额</th>
                  <th className="px-3 py-2 font-medium">账户</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((r, i) => (
                  <tr key={i} className={`border-t border-[#F4E6D2] ${ignored[i] ? 'opacity-40 line-through' : ''} ${r.exists ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 max-w-[220px] truncate">
                      {r.peer && <span className="font-medium text-pig-ink">{r.peer}</span>}
                      {r.note && <span className="text-pig-sub text-xs ml-1">{r.note}</span>}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap font-semibold ${r.amount > 0 ? 'text-pig-deposit' : 'text-pig-withdraw'}`}>
                      {fmtMoney(r.amount)}
                    </td>
                    <td className="px-3 py-2">
                      {r.exists ? (
                        <span className="text-xs text-pig-sub bg-pig-bg px-2 py-1 rounded-full">已存在</span>
                      ) : (
                        <select
                          value={r.accountId || ''}
                          onChange={(e) => updateRow(i, { accountId: e.target.value })}
                          className="rounded-xl border border-[#EFDCBF] px-2 py-1 text-pig-ink bg-white text-xs"
                        >
                          <option value="" disabled>选择账户</option>
                          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {!r.exists && (
                        <button
                          onClick={() => toggleIgnore(i)}
                          className="text-xs px-2 py-1 rounded-xl bg-pig-bg text-pig-sub hover:bg-pig-coral hover:text-white transition"
                        >
                          {ignored[i] ? '恢复' : '忽略'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-pig-sub">
              {dupCount > 0 ? `${dupCount} 笔已存在（自动跳过），` : ''}
              {Object.values(ignored).filter(Boolean).length > 0 && `${Object.values(ignored).filter(Boolean).length} 笔已忽略`}
            </p>
            <div className="flex gap-2">
              <button onClick={reset} className="px-4 py-2 rounded-2xl bg-pig-bg text-pig-sub hover:bg-[#f7e7d3] transition">重新选择</button>
              <button
                onClick={confirmImport}
                disabled={validRows.length === 0}
                className="px-6 py-2 rounded-2xl bg-pig-accent text-white font-cute font-bold shadow-chip hover:brightness-105 disabled:opacity-50 transition"
              >
                确认导入 {validRows.length} 笔
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function billTypeName(t) {
  return { alipay: '支付宝', wechat: '微信', generic: '通用' }[t] || '通用'
}
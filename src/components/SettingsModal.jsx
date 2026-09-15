import { useState } from 'react'
import Modal from './Modal'
import { GearIcon } from '../icons'

export default function SettingsModal({ settings, onClose, onSave }) {
  const [form, setForm] = useState({ ...settings })

  const save = (e) => {
    e.preventDefault()
    onSave({
      aiProvider: form.aiProvider,
      aiBaseUrl: form.aiBaseUrl,
      aiKey: form.aiKey.trim(),
      aiModel: form.aiModel,
    })
    onClose()
  }

  return (
    <Modal title={<span>设置</span>} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-blob bg-pig-bg">
          <GearIcon size={26} />
          <p className="text-sm text-pig-ink">
            MVP 数据全部保存在<strong>本地浏览器</strong>，不会上传任何服务器。
          </p>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm text-pig-sub mb-1">AI 服务商</label>
            <select
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white"
              value={form.aiProvider}
              onChange={(e) => setForm({ ...form, aiProvider: e.target.value })}
            >
              <option value="deepseek">DeepSeek</option>
              <option value="dashscope">阿里云百炼（通义）</option>
              <option value="custom">自定义 OpenAI 兼容</option>
            </select>
          </div>

          {form.aiProvider === 'custom' && (
            <div>
              <label className="block text-sm text-pig-sub mb-1">API Base URL</label>
              <input
                className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white"
                placeholder="https://api.example.com/v1"
                value={form.aiBaseUrl}
                onChange={(e) => setForm({ ...form, aiBaseUrl: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-pig-sub mb-1">API Key</label>
            <input
              type="password"
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white"
              placeholder="sk-…（仅存本地）"
              value={form.aiKey}
              onChange={(e) => setForm({ ...form, aiKey: e.target.value })}
            />
            <p className="text-xs text-pig-sub mt-1">
              不填时自动使用本地规则解析，MVP 也能离线记账。
            </p>
          </div>

          <div>
            <label className="block text-sm text-pig-sub mb-1">模型</label>
            <input
              className="w-full rounded-2xl border-2 border-[#EFDCBF] px-4 py-2.5 text-pig-ink bg-white"
              value={form.aiModel}
              onChange={(e) => setForm({ ...form, aiModel: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-2xl bg-pig-accent text-white font-cute font-bold shadow-chip hover:brightness-105 transition"
          >
            保存设置
          </button>
        </form>
      </div>
    </Modal>
  )
}
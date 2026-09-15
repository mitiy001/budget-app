import { useEffect } from 'react'
import { CloseIcon } from '../icons'

export default function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(107,75,58,0.35)' }}
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-4xl' : 'max-w-md'} bg-white rounded-blob shadow-soft border-4 border-white overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#FBF0DE] to-[#FDEBD2]">
          <h2 className="font-cute font-bold text-lg text-pig-ink flex items-center gap-2">{title}</h2>
          <button
            onClick={onClose}
            className="text-pig-sub hover:text-pig-ink transition p-1 rounded-full hover:bg-white"
            aria-label="关闭"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
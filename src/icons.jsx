export const PigIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
    <path d="M24 6C12 6 4 14 4 26c0 7 4 13 10 16l2 4c0 1 .5 2 2 2h12c1.5 0 2-1 2-2l2-4c6-3 10-9 10-16 0-12-8-20-20-20z" fill="#F4A261" />
    <circle cx="14" cy="24" r="2.4" fill="#fff" />
    <circle cx="34" cy="24" r="2.4" fill="#fff" />
    <circle cx="14" cy="24" r="1.1" fill="#6B4B3A" />
    <circle cx="34" cy="24" r="1.1" fill="#6B4B3A" />
    <ellipse cx="24" cy="30" rx="3" ry="2.2" fill="#E76F51" />
    <path d="M24 30v2" stroke="#E76F51" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M18 14l5-6c.8-1 2-1 3 0l3 3-6 4z" fill="#F4A261" />
    <ellipse cx="24" cy="15" rx="4" ry="2.5" fill="#F9B97F" />
    <circle cx="34" cy="9" r="2.2" fill="#E76F51" />
    <circle cx="34" cy="9" r="1" fill="#6B4B3A" />
    <path d="M8 20c-3 1-3 8 0 7" stroke="#F4A261" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
)

export const CoinIcon = ({ size = 18, color = '#E7A34F' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill={color} stroke="#fff" strokeWidth="2" />
    <circle cx="12" cy="12" r="6.5" fill="#fff" />
    <text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="bold" fill={color}>¥</text>
  </svg>
)

export const ArrowUp = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M12 3l7 8h-4v8h-6v-8H5z" />
  </svg>
)

export const ArrowDown = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M12 21l-7-8h4V5h6v8h4z" />
  </svg>
)

export const PlusIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" />
  </svg>
)

export const UploadIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M11 16h2V7.8l3.6 3.6 1.4-1.4L12 4 5 9.9l1.4 1.4L11 7.8zM6 20h12v-2H6z" />
  </svg>
)

export const SparkIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M12 2l2.2 6.3L21 11l-6.8 2.7L12 20l-2.2-6.3L3 11l6.8-2.7z" fill="#F2A65A" />
    <circle cx="19" cy="5" r="1.6" fill="#E76F51" />
  </svg>
)

export const TrashIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
    <path d="M4 7h16M9 7V5h6v2m-8 0l1 13h8l1-13M10 11v6m4-6v6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const EditIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const BackIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" />
  </svg>
)

export const CloseIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2.4" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
)

export const GearIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v3.2M12 18v3.2M21.2 12H18M6 12H2.8M18.4 5.6l-2.3 2.3M8 16.1l-2.3 2.3M18.4 18.4l-2.3-2.3M8 7.9L5.7 5.6" strokeLinecap="round" />
  </svg>
)
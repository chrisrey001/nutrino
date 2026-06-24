import { IconLetterN } from '@tabler/icons-react'

export default function NutrinoLogo({ className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-700 shadow-sm">
        <IconLetterN size={18} stroke={2.5} className="text-white" />
      </div>
      <span className="font-extrabold text-[16px] tracking-tight leading-none bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
        utrino
      </span>
    </div>
  )
}

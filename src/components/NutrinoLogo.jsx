export default function NutrinoLogo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 8C8 10 5.9 16.17 3.82 21H5.1c.48-1.32 1.4-3.24 3.21-4.84 2.78 2.59 5.92 3.24 9.69 3.84v-10z" />
        </svg>
      </div>
      <span className="font-bold text-gray-900 text-[15px] tracking-tight leading-none">Nutrino</span>
    </div>
  )
}

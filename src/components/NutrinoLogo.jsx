export default function NutrinoLogo({ className = '' }) {
  return (
    <div className={`flex items-center gap-0 ${className}`}>
      <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-white font-black text-base leading-none tracking-tighter">N</span>
      </div>
      <span className="font-bold text-gray-900 text-[15px] tracking-tight leading-none ml-0.5">utrino</span>
    </div>
  )
}

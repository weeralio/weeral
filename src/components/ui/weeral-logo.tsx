import Image from 'next/image'

export function WeeralIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Weeral"
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
    />
  )
}

export function WeeralWordmark({ iconSize = 28, className = '' }: { iconSize?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <WeeralIcon size={iconSize} />
      <span className="font-bold text-white tracking-tight">Weeral</span>
    </span>
  )
}

import React from 'react'
import { Wifi, Copy, Check } from 'lucide-react'
import { maskAccountId, formatCurrency } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'

export function VirtualDebitCard({ account, user }) {
  const { showToast } = useToast()
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    if (!account?._id) return
    navigator.clipboard.writeText(account._id)
    setCopied(true)
    showToast('Copied!', 'Account ID copied to clipboard', 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  const cardHolder = user?.name ? user.name.toUpperCase() : 'NOVA CLIENT'
  const cardNumber = account?._id ? maskAccountId(account._id) : '•••• •••• •••• 5642'
  const currency = account?.currency || 'PKR'
  const balance = account?.balance || 0

  return (
    <div className="w-full max-w-sm mx-auto group perspective-[1000px]">
      <div className="virtual-card-sheen relative w-full h-[220px] rounded-3xl p-6 text-white bg-gradient-to-br from-[#102A24] via-[#061A18] to-[#0F172A] border border-white/20 shadow-2xl shadow-emerald-950/40 flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:rotate-x-2 group-hover:rotate-y--2">
        
        {/* Top Row: Bank branding & card type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-heading font-extrabold text-xs tracking-widest text-emerald-400">
            <span>NOVA TITANIUM</span>
          </div>
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 uppercase">
            {currency} DEBIT
          </span>
        </div>

        {/* Middle Row: EMV Chip & Contactless NFC */}
        <div className="flex items-center gap-3 my-1">
          {/* Metallic Gold EMV Chip */}
          <div className="relative w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-500 to-amber-700 border border-amber-800 shadow-inner flex items-center justify-center overflow-hidden">
            <div className="absolute inset-x-0 h-[1px] bg-black/40"></div>
            <div className="absolute inset-y-0 w-[1px] bg-black/40"></div>
          </div>
          <Wifi className="w-5 h-5 text-white/70 rotate-90" />
        </div>

        {/* Card Number & Copy */}
        <div className="flex items-center justify-between">
          <div className="font-mono text-base tracking-[0.18em] font-semibold text-white/90 drop-shadow">
            {cardNumber}
          </div>
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Copy Full Account ID"
          >
            {copied ? <Check className="w-4 h-4 text-brand-primary" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Row: Cardholder & Network Logo */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] font-bold tracking-wider text-white/50 uppercase">Cardholder</div>
            <div className="font-heading font-bold text-xs tracking-wider uppercase truncate max-w-[170px]">
              {cardHolder}
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="flex -space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-red-500/90 shadow-sm"></div>
              <div className="w-6 h-6 rounded-full bg-amber-500/90 shadow-sm"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

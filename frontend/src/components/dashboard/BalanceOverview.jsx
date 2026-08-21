import React, { useState } from 'react'
import { Send, Zap, PlusCircle, Copy, Check, ShieldCheck } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'

export function BalanceOverview({ account, onOpenTransfer, onOpenFaucet, onOpenCreateWallet }) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!account?._id) return
    navigator.clipboard.writeText(account._id)
    setCopied(true)
    showToast('Copied!', 'Account ID copied to clipboard', 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  const balance = account?.balance || 0
  const currency = account?.currency || 'PKR'
  const status = account?.status || 'ACTIVE'

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-base-surface/90 via-slate-900/80 to-base-surface/90">
      
      {/* Top Tag & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-brand-primary" />
          <span>Available Liquid Balance</span>
        </div>
        
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-primary/15 text-brand-primary border border-brand-primary/30">
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span>
          {status}
        </span>
      </div>

      {/* Main Balance Display */}
      <div className="my-5">
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold text-brand-primary font-heading">
            {currency}
          </span>
          <span className="text-4xl sm:text-5xl font-black font-heading tracking-tight text-white drop-shadow-md">
            {Number(balance).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>

        {/* Account ID Pill */}
        <div className="mt-3 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
            <span className="text-slate-500 font-sans">Account:</span>
            <span>{account?._id || 'Loading...'}</span>
            <button
              onClick={handleCopy}
              className="text-brand-primary hover:text-brand-primary-light transition-colors ml-1"
              title="Copy Account ID"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={onOpenTransfer}
          className="flex-1 min-w-[140px] px-5 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primary-dark hover:from-brand-primary-light hover:to-brand-primary text-slate-950 font-heading font-bold text-sm shadow-glow flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
          <span>Transfer Money</span>
        </button>

        <button
          onClick={onOpenFaucet}
          className="px-4 py-3 rounded-xl bg-white/5 border border-white/15 hover:border-white/30 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-white/10 active:scale-95"
        >
          <Zap className="w-4 h-4 text-accent-gold" />
          <span>Instant Top-Up (Faucet)</span>
        </button>

        <button
          onClick={onOpenCreateWallet}
          className="px-3.5 py-3 rounded-xl bg-white/5 border border-white/15 hover:border-white/30 text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition-all hover:bg-white/10 active:scale-95"
          title="Open New Multi-Currency Wallet"
        >
          <PlusCircle className="w-4 h-4 text-accent-cyan" />
          <span>+ Wallet</span>
        </button>
      </div>

    </div>
  )
}

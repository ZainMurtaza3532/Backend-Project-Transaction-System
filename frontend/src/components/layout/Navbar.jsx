import React from 'react'
import { Layers, Volume2, VolumeX, Radio, Wallet, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWallet } from '../../context/WalletContext'
import { useToast } from '../../context/ToastContext'
import { maskAccountId } from '../../utils/formatters'

export function Navbar({ onOpenProfile }) {
  const { user } = useAuth()
  const { accounts, activeAccountId, setActiveAccountId, isRealtimeConnected } = useWallet()
  const { audioEnabled, toggleAudio } = useToast()

  if (!user) return null

  return (
    <header className="sticky top-0 z-40 bg-base-dark/85 backdrop-blur-xl border-b border-white/10 py-3 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-accent-cyan flex items-center justify-center text-slate-950 shadow-glow">
            <Layers className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-extrabold text-xl tracking-tight text-white">
              NOVA<span className="text-brand-primary">LEDGER</span>
            </span>
            <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
              PRO
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Live Sync Status Beacon */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/25 text-xs font-semibold text-brand-primary-light">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75 ${isRealtimeConnected ? '' : 'hidden'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isRealtimeConnected ? 'bg-brand-primary' : 'bg-slate-500'}`}></span>
            </span>
            {isRealtimeConnected ? 'Live Sync' : 'Reconnecting...'}
          </div>

          {/* Wallet Switcher Dropdown */}
          {accounts.length > 0 && (
            <div className="relative flex items-center">
              <select
                value={activeAccountId || ''}
                onChange={(e) => setActiveAccountId(e.target.value)}
                className="bg-base-card border border-white/15 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-primary cursor-pointer hover:border-white/30 transition-colors max-w-[190px] sm:max-w-[240px]"
              >
                {accounts.map((acc, index) => (
                  <option key={acc._id} value={acc._id} className="bg-base-surface text-white">
                    Wallet {index + 1} ({acc.currency}) — {maskAccountId(acc._id)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sound FX Toggle Button */}
          <button
            onClick={toggleAudio}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            title={audioEnabled ? 'Sound FX Enabled' : 'Sound FX Muted'}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>

          {/* User Profile Badge */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-base-card border border-white/10 hover:border-white/25 transition-all group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center text-xs font-bold text-white shadow-md">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white max-w-[100px] truncate">
              {user.name || 'User'}
            </span>
          </button>

        </div>

      </div>
    </header>
  )
}

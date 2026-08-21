import React, { useState } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { ModalBackdrop } from '../ui/ModalBackdrop'
import { useWallet } from '../../context/WalletContext'
import { useToast } from '../../context/ToastContext'

export function FaucetModal({ isOpen, onClose }) {
  const [amount, setAmount] = useState('5000')
  const [loading, setLoading] = useState(false)
  const { fundFaucet, activeAccount } = useWallet()
  const { showToast } = useToast()

  const presets = [1000, 5000, 25000, 100000]

  const handleSubmit = async (e) => {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      showToast('Invalid Amount', 'Please specify a valid top-up amount', 'warning')
      return
    }

    setLoading(true)
    try {
      await fundFaucet(numAmount)
      onClose()
    } catch (err) {
      showToast('Deposit Failed', err.message || 'Could not process faucet deposit', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      title="Instant Top-Up (Faucet)"
      icon={<Zap className="w-5 h-5 text-accent-gold" />}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        
        <p className="text-xs text-slate-400">
          Select a test funding preset or specify a custom deposit amount. Funds are credited directly from the Central Treasury to your active wallet ({activeAccount?.currency || 'PKR'}).
        </p>

        {/* Presets Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset.toString())}
              className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                amount === preset.toString()
                  ? 'bg-accent-gold/15 border-accent-gold text-accent-gold shadow-sm'
                  : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
              }`}
            >
              ₨ {preset.toLocaleString()} PKR
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Custom Deposit Amount</label>
          <input
            type="number"
            required
            min="1"
            max="1000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-base-input border border-white/10 rounded-xl text-base font-bold text-white focus:outline-none focus:border-brand-primary"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-gold to-amber-600 hover:from-amber-400 hover:to-accent-gold text-slate-950 font-heading font-bold text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Deposit Funds</span>}
          </button>
        </div>

      </form>
    </ModalBackdrop>
  )
}

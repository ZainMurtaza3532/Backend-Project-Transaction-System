import React, { useState } from 'react'
import { PlusSquare, Loader2 } from 'lucide-react'
import { ModalBackdrop } from '../ui/ModalBackdrop'
import { useWallet } from '../../context/WalletContext'
import { useToast } from '../../context/ToastContext'

export function CreateWalletModal({ isOpen, onClose }) {
  const [currency, setCurrency] = useState('PKR')
  const [loading, setLoading] = useState(false)
  const { createWallet } = useWallet()
  const { showToast } = useToast()

  const currencies = [
    { code: 'PKR', label: 'Pakistani Rupee (PKR - ₨)' },
    { code: 'USD', label: 'US Dollar (USD - $)' },
    { code: 'EUR', label: 'Euro (EUR - €)' },
    { code: 'GBP', label: 'British Pound (GBP - £)' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createWallet(currency)
      onClose()
    } catch (err) {
      showToast('Wallet Creation Failed', err.message || 'Could not open wallet', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      title="Open New Wallet"
      maxWidth="max-w-md"
      icon={<PlusSquare className="w-5 h-5 text-accent-violet" />}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Wallet Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-base-input border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary cursor-pointer"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code} className="bg-base-surface">
                {c.label}
              </option>
            ))}
          </select>
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
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-violet to-purple-600 hover:from-purple-400 hover:to-accent-violet text-white font-heading font-bold text-xs shadow-glow-violet flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Open Wallet</span>}
          </button>
        </div>

      </form>
    </ModalBackdrop>
  )
}

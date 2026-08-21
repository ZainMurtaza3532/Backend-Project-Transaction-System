import React, { useState } from 'react'
import { Send, Shield, Loader2, Sparkles } from 'lucide-react'
import { ModalBackdrop } from '../ui/ModalBackdrop'
import { useWallet } from '../../context/WalletContext'
import { useToast } from '../../context/ToastContext'
import { API } from '../../services/api'
import { generateIdempotencyKey, formatCurrency, maskAccountId } from '../../utils/formatters'

export function TransferModal({ isOpen, onClose, onOtpRequired, onTransferComplete }) {
  const { accounts, activeAccountId, directory, loadAccounts, loadHistory, loadStats } = useWallet()
  const { showToast } = useToast()

  const [fromAccount, setFromAccount] = useState(activeAccountId || '')
  const [toAccount, setToAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [useOtp, setUseOtp] = useState(true)
  const [loading, setLoading] = useState(false)

  // Sync fromAccount with active account when opened
  React.useEffect(() => {
    if (activeAccountId) setFromAccount(activeAccountId)
  }, [activeAccountId, isOpen])

  const activeAccObj = accounts.find((a) => a._id === fromAccount) || accounts[0]
  const currentBalance = activeAccObj?.balance || 0

  const handlePercentage = (pct) => {
    if (currentBalance > 0) {
      const val = Math.floor((currentBalance * pct) / 100)
      setAmount(val > 0 ? val.toString() : '')
    }
  }

  const handleSelectContact = (e) => {
    const contactId = e.target.value
    if (contactId) {
      setToAccount(contactId)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fromAccount) {
      showToast('Missing Wallet', 'Select a source wallet', 'warning')
      return
    }
    if (!toAccount) {
      showToast('Missing Recipient', 'Provide recipient account ID', 'warning')
      return
    }
    if (fromAccount === toAccount) {
      showToast('Invalid Transfer', 'Source and destination wallets must be different', 'warning')
      return
    }
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      showToast('Invalid Amount', 'Please enter a positive transfer amount', 'warning')
      return
    }
    if (numAmount > currentBalance) {
      showToast('Insufficient Balance', `Current balance is ${formatCurrency(currentBalance)}`, 'warning')
      return
    }

    const idempotencyKey = generateIdempotencyKey()
    setLoading(true)

    try {
      if (useOtp) {
        // Step 1: Request OTP
        const res = await API.initiateOtpTransfer(fromAccount, toAccount, numAmount, idempotencyKey)
        onClose()
        onOtpRequired({
          transactionId: res.transactionId,
          message: res.message,
          demoOtp: res.demoOtp
        })
      } else {
        // Direct Transfer
        const res = await API.createDirectTransfer(fromAccount, toAccount, numAmount, idempotencyKey)
        showToast('Transfer Complete!', `Transferred ${formatCurrency(numAmount)} to recipient`, 'success')
        await loadAccounts()
        await loadHistory()
        await loadStats()
        onClose()
        if (onTransferComplete) onTransferComplete(res.transaction)
      }
    } catch (err) {
      showToast('Transfer Error', err.message || 'Failed to process transfer', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Funds"
      icon={<Send className="w-5 h-5" />}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        
        {/* Source Account */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Source Wallet</label>
          <select
            value={fromAccount}
            onChange={(e) => setFromAccount(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-base-input border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary cursor-pointer"
          >
            {accounts.map((acc) => (
              <option key={acc._id} value={acc._id} className="bg-base-surface">
                {acc.currency} Wallet ({maskAccountId(acc._id)}) — Balance: {formatCurrency(acc.balance, acc.currency)}
              </option>
            ))}
          </select>
        </div>

        {/* Recipient Directory Dropdown */}
        {directory.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Select Verified Contact
            </label>
            <select
              onChange={handleSelectContact}
              className="w-full px-3.5 py-2 bg-base-input border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="">-- Choose from Directory --</option>
              {directory.map((contact) => (
                <option key={contact.accountId} value={contact.accountId} className="bg-base-surface">
                  {contact.userName} ({contact.userEmail}) — {contact.currency} Wallet
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Destination Account ID */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Destination Account ID</label>
          <input
            type="text"
            required
            value={toAccount}
            onChange={(e) => setToAccount(e.target.value)}
            placeholder="e.g. 64b8f... (24-hex ObjectId)"
            className="w-full px-3.5 py-2.5 bg-base-input border border-white/10 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
          />
        </div>

        {/* Amount & Percentage Shortcuts */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-400">Amount</label>
            <span className="text-xs text-slate-500">
              Available: <strong className="text-brand-primary">{formatCurrency(currentBalance)}</strong>
            </span>
          </div>
          <input
            type="number"
            required
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3.5 py-2.5 bg-base-input border border-white/10 rounded-xl text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
          />
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentage(pct)}
                className="py-1 text-xs font-bold rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-colors"
              >
                {pct === 100 ? 'MAX' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* OTP Security Toggle */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div>
            <div className="font-semibold text-xs text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-brand-primary" />
              <span>2-Step OTP Security</span>
            </div>
            <div className="text-[11px] text-slate-500">Requires 6-digit authorization code</div>
          </div>
          <input
            type="checkbox"
            checked={useOtp}
            onChange={(e) => setUseOtp(e.target.checked)}
            className="w-4 h-4 rounded accent-brand-primary cursor-pointer"
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
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primary-dark hover:from-brand-primary-light hover:to-brand-primary text-slate-950 font-heading font-bold text-xs shadow-glow flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Proceed to Transfer</span>}
          </button>
        </div>

      </form>
    </ModalBackdrop>
  )
}

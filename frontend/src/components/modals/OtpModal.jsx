import React, { useState, useEffect, useRef } from 'react'
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import { ModalBackdrop } from '../ui/ModalBackdrop'
import { API } from '../../services/api'
import { useWallet } from '../../context/WalletContext'
import { useToast } from '../../context/ToastContext'

export function OtpModal({ isOpen, onClose, pendingTransfer, onVerificationSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 mins
  const inputRefs = useRef([])
  const { loadAccounts, loadHistory, loadStats } = useWallet()
  const { showToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', ''])
      setTimeLeft(600)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [isOpen])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen, timeLeft])

  const handleInputChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(text)) {
      const split = text.split('')
      setDigits(split)
      inputRefs.current[5]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length < 6) {
      showToast('Incomplete Code', 'Please enter all 6 digits', 'warning')
      return
    }

    setLoading(true)
    try {
      const res = await API.verifyOtpTransfer(pendingTransfer?.transactionId, otp)
      showToast('Transfer Authorized!', 'Funds have been securely moved.', 'success')
      await loadAccounts()
      await loadHistory()
      await loadStats()
      onClose()
      if (onVerificationSuccess) onVerificationSuccess(res.transaction)
    } catch (err) {
      showToast('Verification Failed', err.message || 'Invalid or expired OTP', 'error')
    } finally {
      setLoading(false)
    }
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timerDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      title="Security Verification"
      maxWidth="max-w-md"
      icon={<KeyRound className="w-5 h-5 text-accent-cyan" />}
    >
      <form onSubmit={handleSubmit} className="p-6 text-center space-y-5">
        
        <div>
          <p className="text-xs text-slate-400">
            {pendingTransfer?.message || 'Please enter the 6-digit authorization code sent to your email.'}
          </p>
          {pendingTransfer?.demoOtp && (
            <div className="mt-2 text-xs font-bold text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/25 py-1 px-2.5 rounded-lg inline-block">
              Demo OTP: {pendingTransfer.demoOtp}
            </div>
          )}
        </div>

        {/* 6-Digit Inputs */}
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-base-input border border-white/15 rounded-xl text-white focus:outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/30 transition-all"
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-xs text-slate-500">
          Code expires in:{' '}
          <strong className="text-accent-cyan font-mono font-bold">{timerDisplay}</strong>
        </div>

        {/* Actions */}
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
            disabled={loading || digits.join('').length < 6}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-600 hover:from-cyan-400 hover:to-accent-cyan text-slate-950 font-heading font-bold text-xs shadow-glow-cyan flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Authorize</span>}
          </button>
        </div>

      </form>
    </ModalBackdrop>
  )
}

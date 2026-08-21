import React, { useRef } from 'react'
import { Receipt, Printer, Copy, Check } from 'lucide-react'
import { ModalBackdrop } from '../ui/ModalBackdrop'
import { formatCurrency, formatDate, maskAccountId } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'

export function ReceiptModal({ isOpen, onClose, transaction }) {
  const { showToast } = useToast()
  const [copied, setCopied] = React.useState(false)
  const printRef = useRef(null)

  if (!transaction) return null

  const fromId = transaction.fromAccount?._id || transaction.fromAccount
  const toId = transaction.toAccount?._id || transaction.toAccount
  const currency = transaction.fromAccount?.currency || transaction.toAccount?.currency || 'PKR'
  const senderName = transaction.fromAccount?.user?.name || 'Central Treasury'
  const receiverName = transaction.toAccount?.user?.name || 'Recipient Account'

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction._id)
    setCopied(true)
    showToast('Copied!', 'Transaction Reference ID copied', 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML
    const printWindow = window.open('', '_blank', 'width=600,height=700')
    printWindow.document.write(`
      <html>
        <head>
          <title>Transaction Receipt - Nova Ledger</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 2rem; color: #0F172A; }
            .receipt-header { text-align: center; border-bottom: 2px dashed #CBD5E1; padding-bottom: 1rem; margin-bottom: 1.5rem; }
            .receipt-bank-title { font-size: 1.5rem; font-weight: bold; }
            .receipt-amount-box { text-align: center; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; }
            .receipt-amount-val { font-size: 2rem; font-weight: bold; color: #10B981; }
            .receipt-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #F1F5F9; font-size: 0.9rem; }
            .receipt-row-label { color: #64748B; }
            .receipt-row-val { font-weight: 600; text-align: right; }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Receipt"
      maxWidth="max-w-md"
      icon={<Receipt className="w-5 h-5 text-brand-primary" />}
    >
      <div className="p-6 bg-slate-100 text-slate-900">
        
        {/* Printable Section */}
        <div ref={printRef} className="relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-30 text-5xl font-black text-emerald-500/10 pointer-events-none uppercase tracking-widest">
            VERIFIED
          </div>

          <div className="text-center border-b-2 border-dashed border-slate-200 pb-4 mb-4">
            <div className="font-heading font-extrabold text-lg tracking-tight text-slate-900">
              NOVA LEDGER BANKING
            </div>
            <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">
              OFFICIAL DOUBLE-ENTRY RECORD
            </div>
          </div>

          <div className="text-center bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              AMOUNT TRANSFERRED
            </div>
            <div className="font-heading font-extrabold text-2xl text-emerald-600 mt-0.5">
              {formatCurrency(transaction.amount, currency)}
            </div>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Status</span>
              <span className="font-bold text-emerald-600 uppercase">{transaction.status}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Date & Time</span>
              <span className="font-semibold text-slate-900">{formatDate(transaction.createdAt)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Sender</span>
              <span className="font-semibold text-slate-900 text-right">{senderName} ({maskAccountId(fromId)})</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Beneficiary</span>
              <span className="font-semibold text-slate-900 text-right">{receiverName} ({maskAccountId(toId)})</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Reference ID</span>
              <span className="font-mono text-[11px] text-slate-700 font-semibold">{transaction._id}</span>
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyId}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy ID</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>

      </div>
    </ModalBackdrop>
  )
}

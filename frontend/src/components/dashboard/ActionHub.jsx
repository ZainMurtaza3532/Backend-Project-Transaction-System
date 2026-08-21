import React from 'react'
import { Send, Zap, PlusSquare, Download } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export function ActionHub({ onOpenTransfer, onOpenFaucet, onOpenCreateWallet, transactions }) {
  const { showToast } = useToast()

  const handleExportCsv = () => {
    if (!transactions || transactions.length === 0) {
      showToast('No Data', 'No transactions found to export', 'info')
      return
    }

    const headers = ['Transaction ID', 'From Account', 'To Account', 'Amount', 'Status', 'Timestamp']
    const rows = transactions.map((tx) => [
      tx._id,
      tx.fromAccount?._id || tx.fromAccount,
      tx.toAccount?._id || tx.toAccount,
      tx.amount,
      tx.status,
      `"${new Date(tx.createdAt).toISOString()}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `nova_ledger_statement_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast('Exported!', 'Transaction statement saved as CSV', 'success')
  }

  const actions = [
    {
      title: 'Send Payment',
      desc: 'Direct or 2-step OTP transfer',
      icon: <Send className="w-5 h-5 text-brand-primary" />,
      bg: 'bg-brand-primary/10 group-hover:bg-brand-primary/20',
      border: 'hover:border-brand-primary/50 hover:shadow-glow',
      onClick: onOpenTransfer
    },
    {
      title: 'Deposit / Faucet',
      desc: '1-click treasury simulation',
      icon: <Zap className="w-5 h-5 text-accent-cyan" />,
      bg: 'bg-accent-cyan/10 group-hover:bg-accent-cyan/20',
      border: 'hover:border-accent-cyan/50 hover:shadow-glow-cyan',
      onClick: onOpenFaucet
    },
    {
      title: 'Create Wallet',
      desc: 'Multi-currency sub-account',
      icon: <PlusSquare className="w-5 h-5 text-accent-violet" />,
      bg: 'bg-accent-violet/10 group-hover:bg-accent-violet/20',
      border: 'hover:border-accent-violet/50 hover:shadow-glow-violet',
      onClick: onOpenCreateWallet
    },
    {
      title: 'Export Statement',
      desc: 'Download ledger CSV file',
      icon: <Download className="w-5 h-5 text-accent-gold" />,
      bg: 'bg-accent-gold/10 group-hover:bg-accent-gold/20',
      border: 'hover:border-accent-gold/50',
      onClick: handleExportCsv
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((act, idx) => (
        <button
          key={idx}
          onClick={act.onClick}
          className={`glass-card p-5 rounded-2xl flex items-center gap-4 text-left transition-all duration-300 group ${act.border} active:scale-98`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${act.bg} shrink-0`}>
            {act.icon}
          </div>
          <div>
            <div className="font-heading font-bold text-sm text-white group-hover:text-brand-primary transition-colors">
              {act.title}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{act.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

import React from 'react'
import { ArrowDownLeft, ArrowUpRight, Activity, WalletCards } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

export function MetricsGrid({ stats, accountsCount }) {
  const totalCredits = stats?.totalCredits || 0
  const totalDebits = stats?.totalDebits || 0
  const totalTxs = stats?.totalTransactions || 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Metric 1: Total Received (Inflow) */}
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Received</span>
          <div className="w-8 h-8 rounded-lg bg-brand-primary/15 text-brand-primary flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading font-extrabold text-xl text-brand-primary">
            {formatCurrency(totalCredits)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Credit inflow to your wallets</div>
        </div>
      </div>

      {/* Metric 2: Total Transferred (Outflow) */}
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transferred</span>
          <div className="w-8 h-8 rounded-lg bg-accent-rose/15 text-accent-rose flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading font-extrabold text-xl text-accent-rose">
            {formatCurrency(totalDebits)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Debit outflow from your wallets</div>
        </div>
      </div>

      {/* Metric 3: Total Transactions Volume */}
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ledger Entries</span>
          <div className="w-8 h-8 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading font-extrabold text-xl text-white">
            {totalTxs}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Double-entry ledger transactions</div>
        </div>
      </div>

      {/* Metric 4: Active Wallets */}
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Wallets</span>
          <div className="w-8 h-8 rounded-lg bg-accent-gold/15 text-accent-gold flex items-center justify-center">
            <WalletCards className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading font-extrabold text-xl text-white">
            {accountsCount || 1}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Sub-accounts & currencies</div>
        </div>
      </div>

    </div>
  )
}

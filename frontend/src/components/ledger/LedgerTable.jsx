import React from 'react'
import { ArrowDownLeft, ArrowUpRight, Receipt, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate, formatRelativeTime, maskAccountId } from '../../utils/formatters'

export function LedgerTable({
  transactions,
  userAccounts,
  loading,
  pagination,
  onPageChange,
  onViewReceipt,
  onOpenFaucet
}) {
  const userAccountIds = userAccounts.map((a) => a._id)

  return (
    <div className="glass-card rounded-3xl overflow-hidden p-6">
      
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Transaction / Counterparty</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">Date & Time</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="font-heading font-bold text-base text-slate-300">No Transactions Found</h4>
                    <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
                      Use the instant top-up faucet or send a payment to start recording ledger entries.
                    </p>
                    <button
                      onClick={onOpenFaucet}
                      className="px-4 py-2 rounded-xl bg-brand-primary text-slate-950 font-bold text-xs shadow-glow hover:bg-brand-primary-light transition-all"
                    >
                      Top-Up Wallet
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {transactions.map((tx) => {
              const fromId = tx.fromAccount?._id || tx.fromAccount
              const toId = tx.toAccount?._id || tx.toAccount

              const isDebit = userAccountIds.includes(fromId)
              const isCredit = userAccountIds.includes(toId) && !isDebit

              const senderName = tx.fromAccount?.user?.name || 'Central Treasury'
              const receiverName = tx.toAccount?.user?.name || 'Recipient Account'
              const currency = tx.fromAccount?.currency || tx.toAccount?.currency || 'PKR'

              const statusBadge = {
                COMPLETED: 'bg-brand-primary/15 text-brand-primary border-brand-primary/30',
                PENDING: 'bg-accent-gold/15 text-accent-gold border-accent-gold/30',
                FAILED: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30',
                REVERSED: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
              }[tx.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'

              return (
                <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors group">
                  
                  {/* Party Details */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit ? 'bg-brand-primary/15 text-brand-primary' : 'bg-accent-rose/15 text-accent-rose'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">
                          {isCredit ? `Received from ${senderName}` : `Transferred to ${receiverName}`}
                        </div>
                        <div className="font-mono text-xs text-slate-400">
                          {maskAccountId(isCredit ? fromId : toId)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {tx.status}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="py-4 px-4">
                    <div
                      className={`font-mono font-bold text-sm ${
                        isCredit ? 'text-brand-primary' : 'text-accent-rose'
                      }`}
                    >
                      {isCredit ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </div>
                  </td>

                  {/* Date & Relative Time */}
                  <td className="py-4 px-4">
                    <div className="text-xs text-slate-300">{formatDate(tx.createdAt)}</div>
                    <div className="text-[10px] text-slate-500">{formatRelativeTime(tx.createdAt)}</div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => onViewReceipt(tx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-300 hover:text-white transition-all hover:bg-white/10"
                    >
                      <Receipt className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>Receipt</span>
                    </button>
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-5 mt-4 border-t border-white/10">
          <span className="text-xs text-slate-400">
            Showing {transactions.length} of {pagination.totalRecords} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-white">
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

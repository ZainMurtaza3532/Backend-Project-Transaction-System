import React from 'react'
import { Search, Filter } from 'lucide-react'

export function SearchFilterToolbar({ filters, onFilterChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
      
      {/* Title & Badge */}
      <div className="flex items-center gap-3">
        <h2 className="font-heading font-extrabold text-xl text-white">
          Audit Ledger & History
        </h2>
        <span className="text-[10px] font-bold text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Double-Entry
        </span>
      </div>

      {/* Controls: Search + Type Pills + Status Dropdown */}
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Search Input */}
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Search ID or amount..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-base-card border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
          />
        </div>

        {/* Direction Filter Pills */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          {['ALL', 'CREDIT', 'DEBIT'].map((type) => {
            const labels = { ALL: 'All', CREDIT: 'Inflow', DEBIT: 'Outflow' }
            const active = filters.type === type
            return (
              <button
                key={type}
                onClick={() => onFilterChange({ ...filters, type })}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  active
                    ? 'bg-brand-primary text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {labels[type]}
              </button>
            )
          })}
        </div>

        {/* Status Dropdown */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="bg-base-card border border-white/10 text-xs font-semibold rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-brand-primary cursor-pointer hover:border-white/25"
        >
          <option value="ALL" className="bg-base-surface">All Statuses</option>
          <option value="COMPLETED" className="bg-base-surface">Completed</option>
          <option value="PENDING" className="bg-base-surface">Pending</option>
          <option value="FAILED" className="bg-base-surface">Failed</option>
        </select>

      </div>

    </div>
  )
}

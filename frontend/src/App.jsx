import React, { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useWallet } from './context/WalletContext'
import { Navbar } from './components/layout/Navbar'
import { AuthCard } from './components/auth/AuthCard'
import { BalanceOverview } from './components/dashboard/BalanceOverview'
import { VirtualDebitCard } from './components/cards/VirtualDebitCard'
import { MetricsGrid } from './components/dashboard/MetricsGrid'
import { ActionHub } from './components/dashboard/ActionHub'
import { SearchFilterToolbar } from './components/ledger/SearchFilterToolbar'
import { LedgerTable } from './components/ledger/LedgerTable'

// Modals
import { TransferModal } from './components/modals/TransferModal'
import { OtpModal } from './components/modals/OtpModal'
import { FaucetModal } from './components/modals/FaucetModal'
import { CreateWalletModal } from './components/modals/CreateWalletModal'
import { ReceiptModal } from './components/modals/ReceiptModal'
import { ProfileModal } from './components/modals/ProfileModal'

export function App() {
  const { user, loading: authLoading } = useAuth()
  const {
    accounts,
    activeAccount,
    transactions,
    stats,
    pagination,
    setPagination,
    filters,
    setFilters,
    loadingHistory
  } = useWallet()

  // Modal Visibility States
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isOtpOpen, setIsOtpOpen] = useState(false)
  const [isFaucetOpen, setIsFaucetOpen] = useState(false)
  const [isCreateWalletOpen, setIsCreateWalletOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Contextual modal data
  const [pendingTransfer, setPendingTransfer] = useState(null)
  const [selectedReceiptTx, setSelectedReceiptTx] = useState(null)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-heading font-bold text-sm text-slate-400">Loading Nova Ledger...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthCard />
  }

  const handleOtpRequired = (transferInfo) => {
    setPendingTransfer(transferInfo)
    setIsOtpOpen(true)
  }

  const handleTransferComplete = (tx) => {
    if (tx) {
      setSelectedReceiptTx(tx)
      setIsReceiptOpen(true)
    }
  }

  const handleViewReceipt = (tx) => {
    setSelectedReceiptTx(tx)
    setIsReceiptOpen(true)
  }

  return (
    <div className="min-h-screen bg-base-dark text-white flex flex-col selection:bg-brand-primary selection:text-black">
      
      {/* Top Navbar */}
      <Navbar onOpenProfile={() => setIsProfileOpen(true)} />

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* Hero Section: Balance Overview + 3D Holographic Card */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <BalanceOverview
              account={activeAccount}
              onOpenTransfer={() => setIsTransferOpen(true)}
              onOpenFaucet={() => setIsFaucetOpen(true)}
              onOpenCreateWallet={() => setIsCreateWalletOpen(true)}
            />
          </div>
          <div className="lg:col-span-5">
            <VirtualDebitCard account={activeAccount} user={user} />
          </div>
        </section>

        {/* Financial Metrics Grid */}
        <section>
          <MetricsGrid stats={stats} accountsCount={accounts.length} />
        </section>

        {/* Quick Action Tiles */}
        <section>
          <ActionHub
            onOpenTransfer={() => setIsTransferOpen(true)}
            onOpenFaucet={() => setIsFaucetOpen(true)}
            onOpenCreateWallet={() => setIsCreateWalletOpen(true)}
            transactions={transactions}
          />
        </section>

        {/* Ledger & Transaction Table Section */}
        <section className="space-y-4">
          <SearchFilterToolbar
            filters={filters}
            onFilterChange={(newFilters) => {
              setFilters(newFilters)
              setPagination((prev) => ({ ...prev, currentPage: 1 }))
            }}
          />
          <LedgerTable
            transactions={transactions}
            userAccounts={accounts}
            loading={loadingHistory}
            pagination={pagination}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, currentPage: page }))}
            onViewReceipt={handleViewReceipt}
            onOpenFaucet={() => setIsFaucetOpen(true)}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          Nova Ledger Banking Platform &copy; {new Date().getFullYear()} — Enterprise Double-Entry Ledger System.
        </div>
      </footer>

      {/* ================= MODALS ================= */}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onOtpRequired={handleOtpRequired}
        onTransferComplete={handleTransferComplete}
      />

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        pendingTransfer={pendingTransfer}
        onVerificationSuccess={handleTransferComplete}
      />

      {/* Instant Faucet Modal */}
      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
      />

      {/* Create Wallet Modal */}
      <CreateWalletModal
        isOpen={isCreateWalletOpen}
        onClose={() => setIsCreateWalletOpen(false)}
      />

      {/* Digital Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        transaction={selectedReceiptTx}
      />

      {/* Profile & Security Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

    </div>
  )
}

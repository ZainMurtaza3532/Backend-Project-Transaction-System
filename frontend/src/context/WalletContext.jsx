import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API } from '../services/api'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { useRealtime } from '../hooks/useRealtime'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [accounts, setAccounts] = useState([])
  const [activeAccountId, setActiveAccountId] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [directory, setDirectory] = useState([])
  const [stats, setStats] = useState({
    totalDebits: 0,
    totalCredits: 0,
    totalTransactions: 0,
    completedCount: 0,
    recentDaily: []
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10
  })
  const [filters, setFilters] = useState({
    type: 'ALL',
    status: 'ALL',
    search: ''
  })
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch all accounts
  const loadAccounts = useCallback(async () => {
    if (!user) return
    setLoadingAccounts(true)
    try {
      const res = await API.getAccounts()
      const list = res.accounts || []
      setAccounts(list)
      if (list.length > 0) {
        setActiveAccountId((prev) => {
          const exists = list.some((a) => a._id === prev)
          return exists ? prev : list[0]._id
        })
      } else {
        setActiveAccountId(null)
      }
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoadingAccounts(false)
    }
  }, [user])

  // Fetch transaction history
  const loadHistory = useCallback(async () => {
    if (!user) return
    setLoadingHistory(true)
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit
      }
      if (filters.type !== 'ALL') params.type = filters.type
      if (filters.status !== 'ALL') params.status = filters.status
      if (filters.search) params.search = filters.search
      if (activeAccountId) params.accountId = activeAccountId

      const res = await API.getTransactionHistory(params)
      setTransactions(res.data || [])
      setPagination((prev) => ({
        ...prev,
        totalPages: res.totalPages || 1,
        totalRecords: res.totalRecords || 0
      }))
    } catch (err) {
      console.error('Failed to load transaction history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [user, activeAccountId, filters, pagination.currentPage, pagination.limit])

  // Fetch stats
  const loadStats = useCallback(async () => {
    if (!user) return
    try {
      const res = await API.getTransactionStats()
      setStats(res.stats || {})
    } catch (err) {}
  }, [user])

  // Fetch directory of other active accounts
  const loadDirectory = useCallback(async () => {
    if (!user) return
    try {
      const res = await API.getAccountDirectory()
      setDirectory(res.directory || [])
    } catch (err) {}
  }, [user])

  // Initial load on user login
  useEffect(() => {
    if (user) {
      loadAccounts()
      loadDirectory()
      loadStats()
    } else {
      setAccounts([])
      setActiveAccountId(null)
      setTransactions([])
      setDirectory([])
    }
  }, [user, loadAccounts, loadDirectory, loadStats])

  // Reload history when filters or active account change
  useEffect(() => {
    if (user) {
      loadHistory()
    }
  }, [user, activeAccountId, filters, pagination.currentPage, loadHistory])

  // Real-time SSE event handler
  const handleRealtimeEvent = useCallback((event) => {
    if (!event || !event.type) return

    switch (event.type) {
      case 'TRANSFER_COMPLETED':
        loadAccounts()
        loadHistory()
        loadStats()
        break
      case 'FUNDS_RECEIVED':
        showToast('Funds Received!', `Received ${event.transaction?.amount} in your account!`, 'receive')
        loadAccounts()
        loadHistory()
        loadStats()
        break
      case 'DEPOSIT_SUCCESS':
        loadAccounts()
        loadHistory()
        loadStats()
        break
      case 'ACCOUNT_CREATED':
        loadAccounts()
        break
      default:
        loadAccounts()
        loadHistory()
    }
  }, [loadAccounts, loadHistory, loadStats, showToast])

  const { isConnected: isRealtimeConnected } = useRealtime({
    user,
    onEvent: handleRealtimeEvent,
    onPollingTick: () => {
      loadAccounts()
    }
  })

  // Create new wallet
  const createWallet = async (currency = 'PKR') => {
    const res = await API.createAccount(currency)
    showToast('Wallet Created', `New ${currency} wallet opened successfully!`, 'success')
    await loadAccounts()
    setActiveAccountId(res.account._id)
    return res.account
  }

  // Faucet Deposit
  const fundFaucet = async (amount = 5000) => {
    if (!activeAccountId) throw new Error('No active wallet selected')
    const res = await API.fundAccountFaucet(activeAccountId, amount)
    showToast('Deposit Successful!', res.message, 'receive')
    await loadAccounts()
    await loadHistory()
    await loadStats()
    return res
  }

  // Active account object
  const activeAccount = accounts.find((a) => a._id === activeAccountId) || accounts[0] || null

  return (
    <WalletContext.Provider
      value={{
        accounts,
        activeAccount,
        activeAccountId,
        setActiveAccountId,
        transactions,
        directory,
        stats,
        pagination,
        setPagination,
        filters,
        setFilters,
        loadingAccounts,
        loadingHistory,
        isRealtimeConnected,
        loadAccounts,
        loadHistory,
        loadStats,
        loadDirectory,
        createWallet,
        fundFaucet
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used within WalletProvider')
  return context
}

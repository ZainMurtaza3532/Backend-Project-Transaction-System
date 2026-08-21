// API Client Service

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'nova_ledger_token'

export const API = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const fetchOptions = {
      ...options,
      headers,
      credentials: 'include'
    }

    try {
      const response = await fetch(url, fetchOptions)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          this.setToken(null)
          window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        }
        const error = new Error(data.message || `Request failed with status ${response.status}`)
        error.status = response.status
        error.data = data
        throw error
      }

      return data
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message)
      throw err
    }
  },

  // Auth endpoints
  register(name, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    })
  },

  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  },

  getMe() {
    return this.request('/auth/me')
  },

  logout() {
    return this.request('/auth/logout', { method: 'POST' })
  },

  updateProfile(data) {
    return this.request('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  // Accounts endpoints
  getAccounts() {
    return this.request('/accounts')
  },

  createAccount(currency = 'PKR') {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({ currency })
    })
  },

  getAccountBalance(accountId) {
    return this.request(`/accounts/balance/${accountId}`)
  },

  getAccountDirectory() {
    return this.request('/accounts/directory')
  },

  fundAccountFaucet(accountId, amount = 1000) {
    return this.request('/accounts/faucet', {
      method: 'POST',
      body: JSON.stringify({ accountId, amount })
    })
  },

  // Transactions endpoints
  createDirectTransfer(fromAccount, toAccount, amount, idempotencyKey) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({ fromAccount, toAccount, amount, idempotencyKey })
    })
  },

  initiateOtpTransfer(fromAccount, toAccount, amount, idempotencyKey) {
    return this.request('/transactions/initiate', {
      method: 'POST',
      body: JSON.stringify({ fromAccount, toAccount, amount, idempotencyKey })
    })
  },

  verifyOtpTransfer(transactionId, otp) {
    return this.request('/transactions/verify', {
      method: 'POST',
      body: JSON.stringify({ transactionId, otp })
    })
  },

  getTransactionHistory(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/transactions/history${query ? `?${query}` : ''}`)
  },

  getTransactionStats() {
    return this.request('/transactions/stats')
  }
}

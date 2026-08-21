# 💎 NOVA LEDGER — Production React.js & Tailwind CSS Banking Platform

> **An enterprise full-stack neo-banking platform featuring Double-Entry Ledger Bookkeeping, 2-Step OTP-Authorized Transfers, React 18 + Tailwind CSS + Lucide Icons, and Real-Time SSE live synchronization.**

---

## 🏛️ Production Folder Structure

```
Backend Project/
├── backend/                       # Node.js + Express Ledger Microservice
│   ├── src/
│   │   ├── config/                # MongoDB Atlas connection (db.js)
│   │   ├── controllers/           # Auth, Accounts, Transactions, Admin controllers
│   │   ├── middleware/            # JWT Auth, Rate limiting guards
│   │   ├── models/                # User, Account, Ledger (Immutable), Transaction
│   │   ├── routes/                # Express REST router modules
│   │   └── services/              # Nodemailer & SSE Event Broadcaster
│   ├── .env                       # Environment secrets & database keys
│   ├── package.json               # Backend dependencies
│   ├── server.js                  # Express application server
│   └── test_e2e.js                # Automated E2E integration test suite
│
├── frontend/                      # React 18 + Vite + Tailwind CSS Frontend
│   ├── public/
│   │   └── favicon.svg            # Platform favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              # AuthCard (Sign in / Register)
│   │   │   ├── cards/             # VirtualDebitCard (3D Holographic Card & EMV chip)
│   │   │   ├── dashboard/         # BalanceOverview, MetricsGrid, ActionHub
│   │   │   ├── layout/            # Navbar with live sync beacon & wallet switcher
│   │   │   ├── ledger/            # LedgerTable, SearchFilterToolbar, Pagination
│   │   │   ├── modals/            # TransferModal, OtpModal, FaucetModal, CreateWalletModal, ReceiptModal, ProfileModal
│   │   │   └── ui/                # ModalBackdrop
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # User authentication state
│   │   │   ├── WalletContext.jsx   # Wallets, balances, history & real-time sync
│   │   │   └── ToastContext.jsx    # Toast notifications & Web Audio synth
│   │   ├── hooks/
│   │   │   ├── useAudio.js         # Web Audio synthesizer tones
│   │   │   └── useRealtime.js      # Server-Sent Events live sync hook
│   │   ├── services/
│   │   │   └── api.js              # Fetch client with auto JWT interceptor
│   │   ├── utils/
│   │   │   └── formatters.js       # Currency, date, masking & idempotency helpers
│   │   ├── App.jsx                # Main Application view coordinator
│   │   ├── index.css              # Tailwind CSS directives & glassmorphism
│   │   └── main.jsx               # React DOM entry point
│   ├── index.html                 # Vite HTML template (Google Fonts Outfit & Plus Jakarta Sans)
│   ├── tailwind.config.js         # Custom luxury dark fintech theme
│   ├── postcss.config.js          # PostCSS configuration
│   ├── vite.config.js             # Vite development server & backend proxy
│   └── package.json               # Frontend dependencies & scripts
│
├── package.json                   # Root scripts
└── README.md                      # Documentation & architecture guide
```

---

## ⚡ Key Features

1. **React 18 & Tailwind CSS UI**:
   - Built with component-driven React 18 and curated Tailwind CSS tokens.
   - Obsidian dark theme with emerald neon (`#10B981`), electric cyan (`#06B6D4`), and cyber violet accents.
   - Vector iconography powered by **Lucide React**.

2. **3D Holographic Virtual Debit Card**:
   - Interactive payment card with metallic EMV chip, contactless NFC icon, cardholder name, and masked account number with 1-click clipboard copy.

3. **2-Step Secure Fund Transfers (with OTP Modal)**:
   - Recipient directory picker and percentage shortcuts (25%, 50%, 75%, MAX).
   - 6-digit auto-advancing OTP verification modal with countdown timer and instant authorization.

4. **Instant Faucet / Deposit Simulator**:
   - 1-click test funding presets (₨1,000 to ₨100,000) credited directly from the Central Treasury.

5. **Real-Time Live Sync (Server-Sent Events)**:
   - Zero-lag real-time balance and transaction push updates across all connected browser tabs.

6. **Digital Watermarked Receipts & CSV Export**:
   - Printable digital transaction receipts with reference IDs.
   - 1-click CSV statement export.

---

## 🚀 How to Run

### Development Mode
```bash
# Start backend
npm run dev:backend

# In a separate terminal, start frontend with hot reload
npm run dev:frontend
```
Open **`http://localhost:5173`** for hot-reloading development.

### Production Mode
```bash
# Build React frontend
npm run build

# Start production server
npm start
```
Open **`http://localhost:5000`** to access the production build served directly by the backend.

### Run Automated Integration Tests
```bash
npm test
```

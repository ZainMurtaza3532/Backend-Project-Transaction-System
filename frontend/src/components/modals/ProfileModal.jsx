import React, { useState, useEffect } from 'react'
import { User, LogOut, Loader2, Key } from 'lucide-react'
import { ModalBackdrop } from '../ui/ModalBackdrop'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, logout } = useAuth()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setOldPassword('')
      setNewPassword('')
    }
  }, [user, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {}
    if (name && name !== user.name) payload.name = name
    if (newPassword) {
      if (!oldPassword) {
        showToast('Password Error', 'Current password is required to change password', 'warning')
        return
      }
      payload.newPassword = newPassword
      payload.oldPassword = oldPassword
    }

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    setLoading(true)
    try {
      await updateProfile(payload)
      onClose()
    } catch (err) {
      showToast('Update Failed', err.message || 'Could not update profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    onClose()
    await logout()
  }

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      title="Profile & Security"
      maxWidth="max-w-md"
      icon={<User className="w-5 h-5 text-accent-violet" />}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Legal Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-base-input border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-400 opacity-60 cursor-not-allowed"
          />
        </div>

        <div className="border-t border-white/10 pt-4 mt-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-3">
            <Key className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Change Password (Optional)</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Required if setting new password"
                className="w-full px-3.5 py-2 bg-base-input border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">New Password</label>
              <input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2 bg-base-input border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 flex items-center justify-between border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-accent-rose/15 border border-accent-rose/30 hover:bg-accent-rose/25 text-accent-rose text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-brand-primary text-slate-950 font-heading font-bold text-xs shadow-glow hover:bg-brand-primary-light transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Changes</span>}
            </button>
          </div>
        </div>

      </form>
    </ModalBackdrop>
  )
}

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Table, Tr, Td, SearchInput, EmptyState, Modal } from '@/components/ui/index'
import { formatDate, formatRelativeTime, USER_ROLES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { UsersRound, Plus, Edit2, CheckCircle, XCircle, Trash2, KeyRound } from 'lucide-react'
import api from '@/lib/api'
import { useForm } from 'react-hook-form'

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/30',
  ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SALES_MANAGER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SALES_EXECUTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
  TELECALLER: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  ACCOUNTS: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CRM_TEAM: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  POST_SALES: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
}

export default function TeamPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [deleteUser, setDeleteUser] = useState<any>(null)
  const [pwError, setPwError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => api.get('/api/users', { params: { search: search || undefined, role: roleFilter || undefined } }),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/api/auth/register', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      resetCreate()
      toast.success('Team member added successfully')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add member'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/api/users/${id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
    },
    onError: () => toast.error('Failed to update user'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: any) => api.patch(`/api/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      toast.success('Password reset successfully')
      setEditUser(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reset password'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteUser(null)
      toast.success('User deactivated successfully')
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => api.put(`/api/users/${id}`, { isActive }),
    onSuccess: (_, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(variables.isActive ? 'User activated successfully' : 'User deactivated successfully')
    },
    onError: () => toast.error('Failed to update user status'),
  })

  const users = data?.data?.data || []
  const { register: registerCreate, handleSubmit: handleCreate, reset: resetCreate } = useForm()
  const { register: registerEdit, handleSubmit: handleEditSubmit, watch: watchEdit, reset: resetEdit } = useForm<{ name: string; phone: string; role: string; newPassword: string; confirmPassword: string }>()

  const roleSummary = USER_ROLES.map(r => ({
    ...r,
    count: users.filter((u: any) => u.role === r.value).length,
  }))

  const onCreateSubmit = (d: any) => createMutation.mutate(d)

  const validatePassword = (password: string) => {
    if (!password) return ''
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return 'Password must contain at least one special character'
    return ''
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { label: '', color: 'bg-transparent' }
    const score = [/[A-Z]/, /[a-z]/, /[0-9]/, /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, /.{12,}/].reduce((count, regex) => count + (regex.test(password) ? 1 : 0), 0)
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500' }
    if (score === 3) return { label: 'Fair', color: 'bg-yellow-400' }
    if (score === 4) return { label: 'Strong', color: 'bg-green-400' }
    return { label: 'Very Strong', color: 'bg-emerald-500' }
  }

  const inp = "w-full bg-[#0A1628] border border-[#2A4070] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8BA3C4]/50 focus:outline-none focus:ring-1 focus:ring-[#C9A84C]/50"
  const sel = "w-full bg-[#0A1628] border border-[#2A4070] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C9A84C]/50"
  const lbl = "block text-xs font-medium text-[#B8CAE0] mb-1.5"

  return (
    <AppLayout
      title="Team Management"
      subtitle={`${users.length} team members`}
      actions={
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
          Add Member
        </Button>
      }
    >
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setRoleFilter('')} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${!roleFilter ? 'bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/40' : 'bg-[#12243E] border-[#2A4070] text-[#8BA3C4] hover:text-white'}`}>
          All ({users.length})
        </button>
        {roleSummary.filter(r => r.count > 0).map(r => (
          <button key={r.value} onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${roleFilter === r.value ? ROLE_COLORS[r.value] : 'bg-[#12243E] border-[#2A4070] text-[#8BA3C4] hover:text-white'}`}>
            {r.label} {r.count}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search team members..." />
      </div>

      <Card>
        <Table headers={['Member', 'Role', 'Phone', 'Status', 'Last Login', 'Joined', 'Actions']}>
          {isLoading ? (
            <tr><td colSpan={7} className="py-12 text-center text-[#8BA3C4] text-sm">Loading team...</td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan={7}><EmptyState icon={<UsersRound className="w-10 h-10" />} title="No team members found" /></td></tr>
          ) : users.map((u: any) => (
            <Tr key={u.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8C96A] flex items-center justify-center text-[#0A1628] text-xs font-bold flex-shrink-0">
                    {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-[10px] text-[#8BA3C4]">{u.email}</p>
                  </div>
                </div>
              </Td>
              <Td>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[u.role] || 'bg-slate/20 text-slate border-slate/30'}`}>
                  {u.role?.replace(/_/g, ' ')}
                </span>
              </Td>
              <Td className="text-xs text-[#8BA3C4]">{u.phone || '—'}</Td>
              <Td>
                <button
                onClick={() => {
                  const action = u.isActive ? 'deactivate' : 'activate'
                  if (confirm(`Are you sure you want to ${action} this user?`)) {
                    toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })
                  }
                }}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${u.isActive ? 'text-green-400 hover:text-red-400' : 'text-red-400 hover:text-green-400'}`}
              >
                {u.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {u.isActive ? 'Deactivate' : 'Activate'}
              </button>
              </Td>
              <Td className="text-xs text-[#8BA3C4]">{u.lastLogin ? formatRelativeTime(u.lastLogin) : 'Never'}</Td>
              <Td className="text-xs text-[#8BA3C4]">{formatDate(u.createdAt)}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setPwError(''); setEditUser(u) }} title="Edit user" className="p-1.5 text-[#8BA3C4] hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 rounded transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteUser(u)} title="Deactivate user" className="p-1.5 text-[#8BA3C4] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* ADD MEMBER MODAL */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetCreate() }} title="Add Team Member" size="sm">
        <form onSubmit={handleCreate(onCreateSubmit)} className="space-y-4">
          <div><label className={lbl}>Full Name *</label><input {...registerCreate('name', { required: true })} placeholder="Full name" className={inp} /></div>
          <div><label className={lbl}>Email Address *</label><input {...registerCreate('email', { required: true })} type="email" placeholder="email@aarovia.co.in" className={inp} /></div>
          <div><label className={lbl}>Phone Number</label><input {...registerCreate('phone')} placeholder="+91 9876543210" className={inp} /></div>
          <div>
            <label className={lbl}>Role *</label>
            <select {...registerCreate('role', { required: true })} className={sel}>
              <option value="">Select role</option>
              {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Password *</label><input {...registerCreate('password', { required: true, minLength: 8 })} type="password" placeholder="Min 8 characters" className={inp} /></div>
          <Button type="submit" loading={createMutation.isPending} className="w-full">Add Team Member</Button>
        </form>
      </Modal>

      {/* EDIT + PASSWORD RESET MODAL */}
      {editUser && (
        <Modal open={!!editUser} onClose={() => { setEditUser(null); setPwError('') }} title={`Edit — ${editUser.name}`} size="sm">
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div><label className={lbl}>Full Name</label><input {...registerEdit('name')} defaultValue={editUser.name} className={inp} /></div>
            <div><label className={lbl}>Phone Number</label><input {...registerEdit('phone')} defaultValue={editUser.phone || ''} className={inp} /></div>
            <div>
              <label className={lbl}>Role</label>
              <select {...registerEdit('role')} defaultValue={editUser.role} className={sel}>
                {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="border-t border-[#2A4070] pt-4">
              <p className="text-[10px] text-[#8BA3C4] uppercase tracking-wider mb-3 flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-[#C9A84C]" />
                Reset Password (leave blank to keep current)
              </p>
              <div className="space-y-3">
                <div>
                  <label className={lbl}>New Password</label>
                  <input {...registerEdit('newPassword')} type="password" placeholder="Min 8 characters" className={inp} />
                  {watchEdit('newPassword') && (
                    <div className="mt-2">
                      <div className="h-2 rounded-full bg-[#1E3559] overflow-hidden">
                        <div className={`${getPasswordStrength(watchEdit('newPassword')).color} h-2 rounded-full`} style={{ width: `${Math.min(100, watchEdit('newPassword').length * 8)}%` }} />
                      </div>
                      <p className="text-[11px] text-[#8BA3C4] mt-1">Strength: {getPasswordStrength(watchEdit('newPassword')).label}</p>
                    </div>
                  )}
                </div>
                <div><label className={lbl}>Confirm New Password</label><input {...registerEdit('confirmPassword')} type="password" placeholder="Confirm new password" className={inp} /></div>
                {pwError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">⚠️ {pwError}</p>}
              </div>
            </div>
            <Button type="submit" loading={updateMutation.isPending || resetPasswordMutation.isPending} className="w-full">Save Changes</Button>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteUser && (
        <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Deactivate User" size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Deactivate {deleteUser.name}?</p>
                <p className="text-xs text-[#8BA3C4] mt-1">This will prevent the user from logging in. You can reactivate anytime.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => deleteMutation.mutate(deleteUser.id)} disabled={deleteMutation.isPending} className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50">
                {deleteMutation.isPending ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
              <button onClick={() => setDeleteUser(null)} className="flex-1 bg-[#12243E] text-[#B8CAE0] border border-[#2A4070] hover:bg-[#1E3559] rounded-lg py-2 text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  )
}

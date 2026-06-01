'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Table, Tr, Td, SearchInput, EmptyState, Modal } from '@/components/ui/index'
import { formatDate, formatRelativeTime, USER_ROLES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { UsersRound, Plus, Edit2, CheckCircle, XCircle, Shield } from 'lucide-react'
import api from '@/lib/api'
import { useForm } from 'react-hook-form'

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-gold/20 text-gold border-gold/30',
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

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => api.get('/api/users', { params: { search: search || undefined, role: roleFilter || undefined } }),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/api/auth/register', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); toast.success('Team member added') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add member'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/api/users/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); toast.success('User updated') },
    onError: () => toast.error('Failed to update user'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => api.put(`/api/users/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const users = data?.data?.data || []
  const { register, handleSubmit, reset } = useForm()
  const { register: registerEdit, handleSubmit: handleEditSubmit } = useForm()

  const roleSummary = USER_ROLES.map(r => ({
    ...r,
    count: users.filter((u: any) => u.role === r.value).length,
  }))

  return (
    <AppLayout
      title="Team Management"
      subtitle={`${users.length} team members`}
      actions={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>Add Member</Button>}
    >
      {/* Role summary */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {roleSummary.filter(r => r.count > 0).map(r => (
          <button
            key={r.value}
            onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${roleFilter === r.value ? ROLE_COLORS[r.value] : 'bg-navy-mid border-navy-border text-slate hover:text-white'}`}
          >
            {r.label} <span className="ml-1.5 font-medium">{r.count}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search team members..." />
        </div>
      </div>

      <Card>
        <Table headers={['Member', 'Role', 'Phone', 'Status', 'Last Login', 'Joined', 'Actions']}>
          {isLoading ? (
            <tr><td colSpan={7} className="py-12 text-center text-slate text-sm">Loading team...</td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan={7}><EmptyState icon={<UsersRound className="w-10 h-10" />} title="No team members found" /></td></tr>
          ) : users.map((u: any) => (
            <Tr key={u.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-navy text-xs font-bold flex-shrink-0">
                    {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-[10px] text-slate">{u.email}</p>
                  </div>
                </div>
              </Td>
              <Td>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[u.role] || 'bg-slate/20 text-slate border-slate/30'}`}>
                  {u.role?.replace(/_/g, ' ')}
                </span>
              </Td>
              <Td className="text-xs text-slate">{u.phone || '—'}</Td>
              <Td>
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                  className={`flex items-center gap-1 text-xs font-medium transition-colors ${u.isActive ? 'text-green-400 hover:text-red-400' : 'text-red-400 hover:text-green-400'}`}
                >
                  {u.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {u.isActive ? 'Active' : 'Inactive'}
                </button>
              </Td>
              <Td className="text-xs text-slate">{u.lastLogin ? formatRelativeTime(u.lastLogin) : 'Never'}</Td>
              <Td className="text-xs text-slate">{formatDate(u.createdAt)}</Td>
              <Td>
                <button
                  onClick={() => setEditUser(u)}
                  className="p-1.5 text-slate hover:text-gold hover:bg-navy-light rounded transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Add Member Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Add Team Member" size="sm">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Full Name *</label>
            <input {...register('name', { required: true })} placeholder="Full name" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Email *</label>
            <input {...register('email', { required: true })} type="email" placeholder="email@aarovia.co.in" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Phone</label>
            <input {...register('phone')} placeholder="+91 XXXXX XXXXX" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Role *</label>
            <select {...register('role', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              <option value="">Select role</option>
              {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Password *</label>
            <input {...register('password', { required: true, minLength: 8 })} type="password" placeholder="Min 8 characters" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <Button type="submit" loading={createMutation.isPending} className="w-full">Add Team Member</Button>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {editUser && (
        <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit — ${editUser.name}`} size="sm">
          <form onSubmit={handleEditSubmit(d => updateMutation.mutate({ id: editUser.id, ...d }))} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Full Name</label>
              <input {...registerEdit('name')} defaultValue={editUser.name} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Phone</label>
              <input {...registerEdit('phone')} defaultValue={editUser.phone} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Role</label>
              <select {...registerEdit('role')} defaultValue={editUser.role} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <Button type="submit" loading={updateMutation.isPending} className="w-full">Save Changes</Button>
          </form>
        </Modal>
      )}
    </AppLayout>
  )
}

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Table, Tr, Td, SearchInput, EmptyState } from '@/components/ui/index'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { ClipboardList, FileText, CheckCircle, Clock, AlertCircle, User, Building2, Coins, RefreshCw } from 'lucide-react'
import api from '@/lib/api'

const AGMT_CONFIG: Record<string, { label: string; color: string; nextStatus?: string }> = {
  PENDING: { label: 'Pending', color: 'bg-slate/20 text-slate border-slate/30', nextStatus: 'INITIATED' },
  INITIATED: { label: 'Initiated', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', nextStatus: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', nextStatus: 'COMPLETED' },
  COMPLETED: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30', nextStatus: 'REGISTERED' },
  REGISTERED: { label: 'Registered', color: 'bg-gold/20 text-gold border-gold/30' },
}

export default function PostSalesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [agmtFilter, setAgmtFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'bookings' | 'due'>('bookings')

  const { data, isLoading } = useQuery({
    queryKey: ['post-sales-bookings', search, agmtFilter],
    queryFn: () => api.get('/api/bookings', { params: { search: search || undefined, agreementStatus: agmtFilter || undefined, limit: 50 } }),
  })

  const { data: dueData } = useQuery({
    queryKey: ['due-collections'],
    queryFn: () => api.get('/api/collections/due'),
    enabled: activeTab === 'due',
  })

  const updateAgmtMutation = useMutation({
    mutationFn: ({ id, agreementStatus }: any) => api.put(`/api/bookings/${id}`, { agreementStatus }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['post-sales-bookings'] }); toast.success('Agreement status updated') },
    onError: () => toast.error('Failed to update status'),
  })

  const bookings = data?.data?.data || []
  const dueBookings = dueData?.data?.data || []

  const summary = {
    pending: bookings.filter((b: any) => b.agreementStatus === 'PENDING').length,
    inProgress: bookings.filter((b: any) => ['INITIATED', 'IN_PROGRESS'].includes(b.agreementStatus)).length,
    completed: bookings.filter((b: any) => b.agreementStatus === 'COMPLETED').length,
    registered: bookings.filter((b: any) => b.agreementStatus === 'REGISTERED').length,
  }

  return (
    <AppLayout
      title="Post Sales"
      subtitle="Agreement tracking, KYC & documentation management"
    >
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Agreement Pending', count: summary.pending, color: 'text-slate', icon: Clock },
          { label: 'In Progress', count: summary.inProgress, color: 'text-yellow-400', icon: RefreshCw },
          { label: 'Completed', count: summary.completed, color: 'text-green-400', icon: CheckCircle },
          { label: 'Registered', count: summary.registered, color: 'text-gold', icon: FileText },
        ].map(s => (
          <div key={s.label} className="bg-navy-mid border border-navy-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-display font-medium ${s.color}`}>{s.count}</div>
            <div className="text-[10px] text-slate mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-navy-mid border border-navy-border rounded-lg p-1 w-full sm:w-fit overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'bookings' ? 'bg-gold/20 text-gold' : 'text-slate hover:text-white'}`}
        >
          Agreement Tracking
        </button>
        <button
          onClick={() => setActiveTab('due')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'due' ? 'bg-red-500/20 text-red-400' : 'text-slate hover:text-white'}`}
        >
          Payment Due ({dueBookings.length})
        </button>
      </div>

      {activeTab === 'bookings' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex-1 min-w-0 sm:min-w-[200px]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search bookings, customers..." />
            </div>
            <select
              value={agmtFilter}
              onChange={e => setAgmtFilter(e.target.value)}
              className="w-full sm:w-auto bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
            >
              <option value="">All Agreement Status</option>
              {Object.entries(AGMT_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <Card>
            <Table headers={['Booking', 'Customer', 'Unit', 'Total', 'Collected', 'Due', 'Agreement Status', 'KYC', 'Actions']}>
              {isLoading ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate text-sm">Loading...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon={<ClipboardList className="w-10 h-10" />} title="No bookings found" /></td></tr>
              ) : bookings.map((b: any) => {
                const config = AGMT_CONFIG[b.agreementStatus]
                const nextStatus = config?.nextStatus
                return (
                  <Tr key={b.id}>
                    <Td className="font-mono text-xs text-white">{b.bookingNumber}</Td>
                    <Td>
                      <div>
                        <p className="text-white text-xs font-medium">{b.customer?.name}</p>
                        <p className="text-slate text-[10px]">{b.customer?.mobile}</p>
                      </div>
                    </Td>
                    <Td className="text-xs text-slate">{b.inventory?.unitNumber}</Td>
                    <Td className="text-gold text-xs font-medium">{formatCurrency(b.totalAmount)}</Td>
                    <Td className="text-green-400 text-xs">{formatCurrency(b.collectedAmount)}</Td>
                    <Td className={`text-xs font-medium ${b.dueAmount > 0 ? 'text-red-400' : 'text-slate'}`}>{formatCurrency(b.dueAmount)}</Td>
                    <Td>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${config?.color}`}>
                        {config?.label}
                      </span>
                    </Td>
                    <Td>
                      {b.customer?.isKycVerified ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-400">
                          <CheckCircle className="w-3 h-3" />Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-orange-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />Pending
                        </span>
                      )}
                    </Td>
                    <Td>
                      {nextStatus && (
                        <button
                          onClick={() => updateAgmtMutation.mutate({ id: b.id, agreementStatus: nextStatus })}
                          className="text-[10px] px-2 py-1 bg-gold/10 text-gold border border-gold/20 rounded hover:bg-gold/20 transition-colors whitespace-nowrap"
                        >
                          → {AGMT_CONFIG[nextStatus]?.label}
                        </button>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </Table>
          </Card>
        </>
      ) : (
        <div className="space-y-3">
          {dueBookings.length === 0 ? (
            <Card>
              <div className="py-16 text-center">
                <CheckCircle className="w-10 h-10 text-green-500/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-light">No overdue payments</p>
              </div>
            </Card>
          ) : dueBookings.map((b: any) => {
            const pct = Math.round((b.collectedAmount / b.totalAmount) * 100)
            return (
              <Card key={b.id} className="hover:border-red-500/30 transition-colors">
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-sm font-bold text-red-400">
                        {b.customer?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{b.customer?.name}</p>
                        <p className="text-xs text-slate">{b.customer?.mobile} · {b.customer?.email}</p>
                        <p className="text-[10px] text-slate mt-0.5 font-mono">{b.bookingNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate mb-0.5">Due Amount</p>
                      <p className="text-xl font-display font-semibold text-red-400">{formatCurrency(b.dueAmount)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 text-xs">
                    <div className="bg-navy rounded-lg p-2 text-center">
                      <p className="text-gold font-medium">{formatCurrency(b.totalAmount)}</p>
                      <p className="text-slate text-[9px] mt-0.5">Total</p>
                    </div>
                    <div className="bg-navy rounded-lg p-2 text-center">
                      <p className="text-green-400 font-medium">{formatCurrency(b.collectedAmount)}</p>
                      <p className="text-slate text-[9px] mt-0.5">Collected</p>
                    </div>
                    <div className="bg-navy rounded-lg p-2 text-center">
                      <p className="text-white font-medium">{b.inventory?.unitNumber}</p>
                      <p className="text-slate text-[9px] mt-0.5">Unit</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate mb-1">
                      <span>Collection</span>
                      <span className={pct >= 75 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-navy rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button variant="secondary" size="sm" icon={<Coins className="w-3 h-3" />} className="text-[10px] flex-1">Record Payment</Button>
                    <Button variant="ghost" size="sm" className="text-[10px]">Send Reminder</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}

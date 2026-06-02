'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Table, Tr, Td, SearchInput, EmptyState, Modal } from '@/components/ui/index'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Receipt, Plus, Eye, Send, Download, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { useForm } from 'react-hook-form'

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate/20 text-slate border-slate/30',
  SENT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PAID: 'bg-green-500/20 text-green-400 border-green-500/30',
  PARTIAL_PAID: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  OVERDUE: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, statusFilter],
    queryFn: () => api.get('/api/invoices', { params: { search: search || undefined, status: statusFilter || undefined } }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/api/invoices/${id}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice updated') },
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/api/invoices', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setShowCreate(false); toast.success('Invoice created') },
    onError: () => toast.error('Failed to create invoice'),
  })

  const invoices = data?.data?.data || []
  const { register, handleSubmit, reset } = useForm()

  return (
    <AppLayout
      title="Invoices"
      subtitle={`${invoices.length} invoices`}
      actions={
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>New Invoice</Button>
      }
    >
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-0 sm:min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
        >
          <option value="">All Status</option>
          {['DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { label: 'Draft', status: 'DRAFT', color: 'text-slate' },
          { label: 'Sent', status: 'SENT', color: 'text-blue-400' },
          { label: 'Paid', status: 'PAID', color: 'text-green-400' },
          { label: 'Partial', status: 'PARTIAL_PAID', color: 'text-yellow-400' },
          { label: 'Overdue', status: 'OVERDUE', color: 'text-red-400' },
        ].map(s => {
          const count = invoices.filter((i: any) => i.status === s.status).length
          return (
            <button
              key={s.status}
              onClick={() => setStatusFilter(statusFilter === s.status ? '' : s.status)}
              className={`bg-navy-mid border rounded-lg p-3 text-center transition-colors hover:border-gold/30 ${statusFilter === s.status ? 'border-gold/40' : 'border-navy-border'}`}
            >
              <div className={`text-lg font-display font-medium ${s.color}`}>{count}</div>
              <div className="text-[10px] text-slate mt-0.5">{s.label}</div>
            </button>
          )
        })}
      </div>

      <Card>
        <Table headers={['Invoice No.', 'Customer', 'Amount', 'GST', 'Total', 'Due Date', 'Status', 'Actions']}>
          {isLoading ? (
            <tr><td colSpan={8} className="py-12 text-center text-slate text-sm">Loading invoices...</td></tr>
          ) : invoices.length === 0 ? (
            <tr><td colSpan={8}>
              <EmptyState icon={<Receipt className="w-10 h-10" />} title="No invoices found" description="Create invoices for bookings to track payments." />
            </td></tr>
          ) : invoices.map((inv: any) => (
            <Tr key={inv.id}>
              <Td className="font-medium text-white font-mono text-xs">{inv.invoiceNumber}</Td>
              <Td>
                <div>
                  <p className="text-white text-xs">{inv.booking?.customer?.name}</p>
                  <p className="text-slate text-[10px]">{inv.booking?.customer?.mobile}</p>
                </div>
              </Td>
              <Td>{formatCurrency(inv.amount)}</Td>
              <Td className="text-slate text-xs">{formatCurrency(inv.gstAmount)}</Td>
              <Td className="text-gold font-semibold">{formatCurrency(inv.totalAmount)}</Td>
              <Td className={`text-xs ${inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? 'text-red-400' : 'text-slate'}`}>
                {inv.dueDate ? formatDate(inv.dueDate) : '—'}
              </Td>
              <Td>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[inv.status]}`}>
                  {inv.status.replace(/_/g, ' ')}
                </span>
              </Td>
              <Td>
                <div className="flex gap-1">
                  {inv.status !== 'PAID' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'PAID' })}
                      title="Mark as Paid"
                      className="p-1.5 text-slate hover:text-green-400 hover:bg-navy-light rounded transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button className="p-1.5 text-slate hover:text-blue-400 hover:bg-navy-light rounded transition-colors" title="Send Invoice">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-slate hover:text-gold hover:bg-navy-light rounded transition-colors" title="Download PDF">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Create Invoice" size="sm">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Booking ID</label>
            <input {...register('bookingId', { required: true })} placeholder="Booking ID" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Amount (₹)</label>
            <input {...register('amount', { required: true })} type="number" placeholder="Invoice amount" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">GST Rate (%)</label>
            <select {...register('gstRate')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              <option value="5">5% (Affordable Housing)</option>
              <option value="12">12% (Other Properties)</option>
              <option value="18">18% (Commercial)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Due Date</label>
            <input {...register('dueDate')} type="date" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <Button type="submit" loading={createMutation.isPending} className="w-full">Create Invoice</Button>
        </form>
      </Modal>
    </AppLayout>
  )
}

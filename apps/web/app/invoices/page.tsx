'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Table, Tr, Td, SearchInput, EmptyState, Modal } from '@/components/ui/index'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Receipt, Plus, Eye, Download, CheckCircle, Pencil, Trash2 } from 'lucide-react'
import api, { bookingApi, quotationApi } from '@/lib/api'
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
  const [editingInvoice, setEditingInvoice] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, statusFilter],
    queryFn: () => api.get('/invoices', { params: { search: search || undefined, status: statusFilter || undefined } }),
  })

  const { data: bookingsData, isLoading: bookingsLoading, isError: bookingsError } = useQuery({
    queryKey: ['bookings-for-invoice'],
    queryFn: () => bookingApi.getAll({ limit: 1000 }),
    enabled: showCreate,
  })

  const { data: quotationsData, isLoading: quotationsLoading } = useQuery({
    queryKey: ['quotations-for-invoice'],
    queryFn: () => quotationApi.getAll({ limit: 1000 }),
    enabled: showCreate,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/invoices/${id}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice updated') },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update invoice'),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/invoices', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setShowCreate(false); reset(); toast.success('Invoice created') },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create invoice'),
  })

  const editMutation = useMutation({
    mutationFn: (data: any) => api.put(`/invoices/${editingInvoice.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowCreate(false)
      setEditingInvoice(null)
      reset()
      toast.success('Invoice updated')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update invoice'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice deleted')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete invoice'),
  })

  const invoices = data?.data?.data || []
  const { register, handleSubmit, reset, watch, setValue } = useForm<any>({
    defaultValues: { bookingId: '', amount: '', gstRate: '5', dueDate: '', notes: '' },
  })
  const selectedBookingId = watch('bookingId')
  const selectedBooking = (bookingsData?.data?.data || []).find((booking: any) => booking.id === selectedBookingId)
  const quotations = quotationsData?.data?.data || []

  const applyBookingDefaults = (bookingId: string) => {
    const booking = (bookingsData?.data?.data || []).find((item: any) => item.id === bookingId)
    if (booking) {
      setValue('amount', String(booking.quotation ? booking.quotation.totalAmount - (booking.quotation.gstAmount || 0) : booking.totalAmount || ''))
      setValue('gstRate', String(booking.quotation?.gstRate || 5))
    }
  }

  const applyQuotationDefaults = (quotationId: string) => {
    const quotation = quotations.find((item: any) => item.id === quotationId)
    const booking = (bookingsData?.data?.data || []).find((item: any) => item.quotation?.id === quotationId)
    if (booking) setValue('bookingId', booking.id)
    if (quotation) {
      setValue('amount', String(quotation.totalAmount - (quotation.gstAmount || 0) || ''))
      setValue('gstRate', String(quotation.gstRate || 5))
    }
  }

  const openInvoiceDocument = async (invoiceId: string, print = false) => {
    const documentWindow = window.open('', '_blank')
    if (!documentWindow) {
      toast.error('Allow pop-ups to view or download the invoice')
      return
    }
    documentWindow.document.write('<p style="font:14px Arial,sans-serif;padding:24px">Preparing invoice…</p>')
    try {
      const response = await api.get(`/invoices/${invoiceId}/document`, {
        responseType: 'blob',
        params: print ? { print: 1 } : undefined,
      })
      const url = URL.createObjectURL(response.data)
      documentWindow.location.href = url
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error: any) {
      documentWindow.close()
      toast.error(error.response?.data?.message || 'Failed to open invoice document')
    }
  }

  const startCreate = () => {
    setEditingInvoice(null)
    reset({ bookingId: '', amount: '', gstRate: '5', dueDate: '', notes: '' })
    setShowCreate(true)
  }

  const startEdit = (invoice: any) => {
    setEditingInvoice(invoice)
    reset({
      amount: String(invoice.amount),
      gstRate: String(invoice.gstRate ?? (invoice.amount ? invoice.gstAmount / invoice.amount * 100 : 0)),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : '',
      notes: invoice.notes || '',
    })
    setShowCreate(true)
  }

  const submitInvoice = (formData: any) => {
    const payload = {
      ...formData,
      amount: Number(formData.amount),
      gstRate: Number(formData.gstRate),
      dueDate: formData.dueDate || null,
    }
    if (editingInvoice) editMutation.mutate(payload)
    else createMutation.mutate(payload)
  }

  return (
    <AppLayout
      title="Invoices"
      subtitle={`${invoices.length} invoices`}
      actions={
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={startCreate}>New Invoice</Button>
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
                      disabled={updateStatusMutation.isPending}
                      title="Mark as Paid"
                      className="p-1.5 text-slate hover:text-green-400 hover:bg-navy-light rounded transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => openInvoiceDocument(inv.id)} className="p-1.5 text-slate hover:text-blue-400 hover:bg-navy-light rounded transition-colors" title="View invoice" aria-label="View invoice">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openInvoiceDocument(inv.id, true)} className="p-1.5 text-slate hover:text-gold hover:bg-navy-light rounded transition-colors" title="Print or save as PDF" aria-label="Print or save invoice as PDF">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {inv.status !== 'PAID' && inv.status !== 'PARTIAL_PAID' && (
                    <>
                      <button onClick={() => startEdit(inv)} className="p-1.5 text-slate hover:text-gold hover:bg-navy-light rounded transition-colors" title="Edit invoice" aria-label="Edit invoice">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete invoice ${inv.invoiceNumber}? This cannot be undone.`)) deleteMutation.mutate(inv.id)
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-slate hover:text-red-400 hover:bg-navy-light rounded transition-colors"
                        title="Delete invoice"
                        aria-label="Delete invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditingInvoice(null); reset() }} title={editingInvoice ? `Edit ${editingInvoice.invoiceNumber}` : 'Create Invoice'} size="lg">
        <form onSubmit={handleSubmit(submitInvoice)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {editingInvoice && (
            <div className="rounded-lg border border-navy-border bg-navy-light p-3 text-xs text-slate">
              Editing invoice for <strong className="text-slate-light">{editingInvoice.booking?.customer?.name}</strong> · {editingInvoice.booking?.bookingNumber} · {editingInvoice.booking?.inventory?.project?.name || editingInvoice.booking?.quotation?.project?.name || 'Property'}
            </div>
          )}
          {!editingInvoice && <>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Quotation (optional)</label>
            <select onChange={e => applyQuotationDefaults(e.target.value)} disabled={quotationsLoading} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50 disabled:opacity-60">
              <option value="">{quotationsLoading ? 'Loading quotations...' : 'Select quotation to prefill'}</option>
              {quotations.map((quotation: any) => (
                <option key={quotation.id} value={quotation.id}>
                  {quotation.quotationNumber} — {quotation.lead?.name || 'Customer'} — ₹{quotation.totalAmount?.toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Booking</label>
            <select {...register('bookingId', { required: true, onChange: e => applyBookingDefaults(e.target.value) })} disabled={bookingsLoading || bookingsError} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50 disabled:opacity-60">
              <option value="">{bookingsLoading ? 'Loading bookings...' : bookingsError ? 'Unable to load bookings' : bookingsData?.data?.data?.length ? 'Select booking' : 'No bookings available'}</option>
              {(bookingsData?.data?.data || []).map((booking: any) => (
                <option key={booking.id} value={booking.id}>
                  {booking.bookingNumber} — {booking.customer?.name || booking.lead?.name || 'Customer'}
                </option>
              ))}
            </select>
            {!bookingsLoading && !bookingsError && !bookingsData?.data?.data?.length && <p className="text-[10px] text-yellow-400 mt-1.5">Create a booking first, then it will appear here.</p>}
            {selectedBooking?.quotation && <p className="text-[10px] text-gold mt-1.5">Linked quotation: {selectedBooking.quotation.quotationNumber}</p>}
          </div>
          </>}
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Amount (₹)</label>
            <input {...register('amount', { required: true, valueAsNumber: false, min: 0.01 })} type="number" min="0.01" step="0.01" placeholder="Invoice amount before GST" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
            {selectedBooking?.quotation && <p className="text-[10px] text-slate mt-1.5">Prefilled from {selectedBooking.quotation.quotationNumber}; you can adjust the invoice amount.</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">GST Rate (%)</label>
            <select {...register('gstRate', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              <option value="0">0% — No GST</option>
              <option value="5">5% (Affordable Housing)</option>
              <option value="12">12% (Other Properties)</option>
              <option value="18">18% (Commercial)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Due Date</label>
            <input {...register('dueDate')} type="date" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Notes / Payment Terms</label>
            <textarea {...register('notes')} rows={3} placeholder="Payment instructions or invoice notes" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-y" />
          </div>
          <Button type="submit" loading={createMutation.isPending || editMutation.isPending} className="w-full">{editingInvoice ? 'Save Invoice Changes' : 'Create Invoice'}</Button>
        </form>
      </Modal>
    </AppLayout>
  )
}

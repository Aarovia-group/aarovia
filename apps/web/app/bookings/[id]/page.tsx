'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Modal, Table, Tr, Td } from '@/components/ui/index'
import { bookingApi } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { ArrowLeft, Coins, FileText, User, Building2, Calendar, CheckCircle, Plus, Download, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

const AGMT_STEPS = ['PENDING', 'INITIATED', 'IN_PROGRESS', 'COMPLETED', 'REGISTERED']
const AGMT_LABELS: Record<string, string> = {
  PENDING: 'Pending', INITIATED: 'Initiated', IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed', REGISTERED: 'Registered',
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.getById(id),
    enabled: !!id,
  })

  const addPaymentMutation = useMutation({
    mutationFn: (d: any) => bookingApi.addPayment(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      setShowPaymentModal(false)
      toast.success('Payment recorded successfully')
    },
    onError: () => toast.error('Failed to record payment'),
  })

  const updateBookingMutation = useMutation({
    mutationFn: (d: any) => bookingApi.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['booking', id] }); toast.success('Booking updated') },
  })

  const b = data?.data?.data
  const { register, handleSubmit, reset } = useForm()

  if (isLoading) return <AppLayout title="Booking"><div className="py-16 text-center text-slate">Loading...</div></AppLayout>
  if (!b) return <AppLayout title="Not Found"><div className="py-16 text-center text-slate">Booking not found</div></AppLayout>

  const collectionPct = b.totalAmount > 0 ? Math.round((b.collectedAmount / b.totalAmount) * 100) : 0
  const currentAgmtStep = AGMT_STEPS.indexOf(b.agreementStatus)
  const nextAgmtStatus = AGMT_STEPS[currentAgmtStep + 1]

  return (
    <AppLayout
      title={b.bookingNumber}
      subtitle={`${b.customer?.name} · ${b.inventory?.unitNumber}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>Back</Button>
          <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowPaymentModal(true)}>Record Payment</Button>
          {nextAgmtStatus && (
            <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} loading={updateBookingMutation.isPending}
              onClick={() => updateBookingMutation.mutate({ agreementStatus: nextAgmtStatus })}>
              → {AGMT_LABELS[nextAgmtStatus]}
            </Button>
          )}
        </div>
      }
    >
      {/* Agreement Progress */}
      <Card className="mb-5">
        <CardContent className="py-4">
          <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Agreement Progress</p>
          <div className="flex items-center justify-between">
            {AGMT_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${i <= currentAgmtStep ? 'border-gold bg-gold/20' : 'border-navy-border bg-navy'}`}>
                    {i < currentAgmtStep ? <CheckCircle className="w-3.5 h-3.5 text-gold" /> : <div className={`w-2 h-2 rounded-full ${i === currentAgmtStep ? 'bg-gold' : 'bg-navy-border'}`} />}
                  </div>
                  <span className={`text-[10px] mt-1.5 whitespace-nowrap ${i === currentAgmtStep ? 'text-gold font-medium' : i < currentAgmtStep ? 'text-slate-light' : 'text-slate'}`}>
                    {AGMT_LABELS[step]}
                  </span>
                </div>
                {i < AGMT_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < currentAgmtStep ? 'bg-gold' : 'bg-navy-border'}`} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-4">

          {/* Collection Overview */}
          <Card>
            <CardHeader>
              <CardTitle><Coins className="w-4 h-4 text-gold" />Collection Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-navy rounded-lg p-3 border border-navy-border text-center">
                  <p className="text-xl font-display font-semibold text-gold">{formatCurrency(b.totalAmount)}</p>
                  <p className="text-[10px] text-slate mt-1">Total Amount</p>
                </div>
                <div className="bg-navy rounded-lg p-3 border border-green-500/20 text-center">
                  <p className="text-xl font-display font-semibold text-green-400">{formatCurrency(b.collectedAmount)}</p>
                  <p className="text-[10px] text-slate mt-1">Collected</p>
                </div>
                <div className={`bg-navy rounded-lg p-3 border text-center ${b.dueAmount > 0 ? 'border-red-500/20' : 'border-navy-border'}`}>
                  <p className={`text-xl font-display font-semibold ${b.dueAmount > 0 ? 'text-red-400' : 'text-slate'}`}>{formatCurrency(b.dueAmount)}</p>
                  <p className="text-[10px] text-slate mt-1">Due Amount</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate mb-1.5">
                  <span>Collection Progress</span>
                  <span className={collectionPct >= 75 ? 'text-green-400' : collectionPct >= 40 ? 'text-yellow-400' : 'text-red-400'}>{collectionPct}%</span>
                </div>
                <div className="h-2 bg-navy rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${collectionPct >= 75 ? 'bg-green-500' : collectionPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${collectionPct}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle><Coins className="w-4 h-4 text-gold" />Payment History ({b.payments?.length || 0})</CardTitle>
              <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowPaymentModal(true)}>Add Payment</Button>
            </CardHeader>
            <CardContent className="p-0">
              {b.payments?.length === 0 ? (
                <div className="py-8 text-center text-slate text-sm">No payments recorded yet</div>
              ) : (
                <Table headers={['Amount', 'Mode', 'Transaction ID', 'Notes', 'Date']}>
                  {b.payments?.map((p: any) => (
                    <Tr key={p.id}>
                      <Td className="text-gold font-semibold">{formatCurrency(p.amount)}</Td>
                      <Td><span className="text-xs text-blue-400">{p.paymentMode}</span></Td>
                      <Td className="text-xs font-mono text-slate">{p.transactionId || '—'}</Td>
                      <Td className="text-xs text-slate max-w-[150px] truncate">{p.notes || '—'}</Td>
                      <Td className="text-xs text-slate">{formatDateTime(p.paymentDate)}</Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          {b.invoices?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><FileText className="w-4 h-4 text-gold" />Invoices ({b.invoices.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table headers={['Invoice No.', 'Amount', 'Total', 'Status', 'Due Date']}>
                  {b.invoices.map((inv: any) => (
                    <Tr key={inv.id}>
                      <Td className="font-mono text-xs text-white">{inv.invoiceNumber}</Td>
                      <Td>{formatCurrency(inv.amount)}</Td>
                      <Td className="text-gold font-medium">{formatCurrency(inv.totalAmount)}</Td>
                      <Td><span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.status === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{inv.status}</span></Td>
                      <Td className="text-xs text-slate">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</Td>
                    </Tr>
                  ))}
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Payment Milestones */}
          {b.milestones?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><Calendar className="w-4 h-4 text-gold" />Payment Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {b.milestones.map((m: any, i: number) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-navy rounded-lg border border-navy-border">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${m.isPaid ? 'border-green-500 bg-green-500/20' : 'border-navy-border'}`}>
                        {m.isPaid && <CheckCircle className="w-3 h-3 text-green-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{m.name}</p>
                        {m.dueDate && <p className="text-[10px] text-slate">Due: {formatDate(m.dueDate)}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gold">{formatCurrency(m.amount)}</p>
                        <p className="text-[10px] text-slate">{m.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Info Cards */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle><User className="w-4 h-4 text-gold" />Customer</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-navy font-bold">
                  {b.customer?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-white">{b.customer?.name}</p>
                  <p className="text-xs text-slate">{b.customer?.mobile}</p>
                  {b.customer?.email && <p className="text-xs text-slate">{b.customer?.email}</p>}
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {b.customer?.panNumber && (
                  <div className="flex justify-between"><span className="text-slate">PAN</span><span className="text-slate-light font-mono">{b.customer.panNumber}</span></div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate">KYC</span>
                  <span className={b.customer?.isKycVerified ? 'text-green-400' : 'text-orange-400'}>
                    {b.customer?.isKycVerified ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
              </div>
              <Link href={`/customers/${b.customerId}`}>
                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">View Customer Profile →</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Property */}
          <Card>
            <CardHeader><CardTitle><Building2 className="w-4 h-4 text-gold" />Property Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {[
                ['Project', b.inventory?.project?.name],
                ['Unit', b.inventory?.unitNumber],
                ['Tower', b.inventory?.tower || '—'],
                ['Floor', b.inventory?.floor || '—'],
                ['Area', b.inventory?.area ? `${b.inventory.area} sq.ft` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate">{k}</span>
                  <span className="text-slate-light">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Booking Info */}
          <Card>
            <CardContent className="space-y-2 text-xs">
              <p className="text-[10px] text-slate uppercase tracking-wide mb-2">Booking Info</p>
              <div className="flex justify-between"><span className="text-slate">Booking No.</span><span className="text-white font-mono">{b.bookingNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate">Booking Date</span><span className="text-slate-light">{formatDate(b.bookingDate)}</span></div>
              {b.quotation && (
                <div className="flex justify-between">
                  <span className="text-slate">Quotation</span>
                  <Link href={`/quotations/${b.quotationId}`} className="text-gold hover:text-gold-light">{b.quotation.quotationNumber}</Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => { setShowPaymentModal(false); reset() }} title="Record Payment" size="sm">
        <form onSubmit={handleSubmit(d => addPaymentMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Amount (₹) *</label>
            <input {...register('amount', { required: true })} type="number" placeholder="Payment amount" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Payment Mode *</label>
            <select {...register('paymentMode', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              <option value="">Select mode</option>
              {['CHEQUE', 'NEFT', 'RTGS', 'UPI', 'CASH', 'DD', 'BOOKING'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Transaction ID / Cheque No.</label>
            <input {...register('transactionId')} placeholder="Reference number" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Payment notes..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <Button type="submit" loading={addPaymentMutation.isPending} className="w-full">Record Payment</Button>
        </form>
      </Modal>
    </AppLayout>
  )
}

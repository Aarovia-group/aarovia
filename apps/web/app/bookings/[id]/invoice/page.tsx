'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { bookingApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Receipt, Send, Download } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

type InvoiceFormValues = {
  amount: string
  gstRate: string
  dueDate: string
  notes: string
}

export default function CreateInvoicePage() {
  const { id: bookingId } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getById(bookingId),
    enabled: !!bookingId,
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/api/invoices', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created successfully')
      router.push(`/bookings/${bookingId}`)
    },
    onError: () => toast.error('Failed to create invoice'),
  })

  const { register, handleSubmit, watch } = useForm<InvoiceFormValues>({
    defaultValues: { gstRate: '5', amount: '', dueDate: '', notes: '' } as InvoiceFormValues,
  })

  const watchedAmount = parseFloat(watch('amount') || '0')
  const watchedGst = parseFloat(watch('gstRate') || '5')
  const gstAmount = watchedAmount * (watchedGst / 100)
  const total = watchedAmount + gstAmount

  const b = data?.data?.data

  if (isLoading) return <AppLayout title="Create Invoice"><div className="py-16 text-center text-slate">Loading...</div></AppLayout>
  if (!b) return <AppLayout title="Not Found"><div className="py-16 text-center text-slate">Booking not found</div></AppLayout>

  const onSubmit = (data: any) => {
    createMutation.mutate({ ...data, bookingId, amount: parseFloat(data.amount) })
  }

  return (
    <AppLayout
      title="Create Invoice"
      subtitle={`Booking ${b.bookingNumber}`}
      actions={
        <Link href={`/bookings/${bookingId}`}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Back to Booking</Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-4xl">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle><Receipt className="w-4 h-4 text-gold" />Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Booking summary */}
                <div className="bg-navy rounded-lg border border-navy-border p-4 mb-2">
                  <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Booking Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      ['Customer', b.customer?.name],
                      ['Unit', b.inventory?.unitNumber],
                      ['Total Amount', formatCurrency(b.totalAmount)],
                      ['Collected', formatCurrency(b.collectedAmount)],
                      ['Due Amount', formatCurrency(b.dueAmount)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate">{k}: </span>
                        <span className="text-slate-light font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Invoice Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                    <input
                      {...register('amount', { required: true, min: 1 })}
                      type="number"
                      step="0.01"
                      placeholder={`Max: ${formatCurrency(b.dueAmount)}`}
                      className="w-full bg-navy border border-navy-border rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">GST Rate</label>
                  <select {...register('gstRate')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                    <option value="5">5% — Affordable Housing / Under Construction</option>
                    <option value="12">12% — Other Residential Properties</option>
                    <option value="18">18% — Commercial Properties</option>
                    <option value="0">0% — No GST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Due Date</label>
                  <input {...register('dueDate' as const)} type="date" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Notes</label>
                  <textarea {...register('notes')} rows={3} placeholder="Payment instructions or invoice notes..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
                </div>

                <Button type="submit" loading={createMutation.isPending} icon={<Receipt className="w-3.5 h-3.5" />} className="w-full">
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right: Live preview */}
        <div>
          <Card>
            <CardHeader><CardTitle>Invoice Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-navy-border/50">
                  <span className="text-slate text-xs">Base Amount</span>
                  <span className="text-slate-light text-xs">{formatCurrency(watchedAmount)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-navy-border/50">
                  <span className="text-slate text-xs">GST ({watchedGst}%)</span>
                  <span className="text-slate-light text-xs">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-medium text-white">Total</span>
                  <span className="text-gold font-display font-semibold text-lg">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-navy-border space-y-2 text-xs text-slate">
                <p>Auto-generated invoice number will be assigned.</p>
                <p>Invoice will be in <strong className="text-slate-light">DRAFT</strong> status until sent.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

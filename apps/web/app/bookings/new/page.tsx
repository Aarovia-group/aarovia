'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { bookingApi, leadApi, inventoryApi, customerApi, quotationApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useForm } from 'react-hook-form'
import { ArrowLeft, BookOpen, User, Building2, FileText, CheckCircle } from 'lucide-react'

type NewBookingFormValues = {
  leadId: string
  customerId: string
  inventoryId: string
  quotationId: string
  totalAmount: string
  bookingAmount: string
  notes: string
}

export default function NewBookingPage() {
  const router = useRouter()
  const [quotationIdParam, setQuotationIdParam] = useState('')
  const [leadIdParam, setLeadIdParam] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<NewBookingFormValues>({
    defaultValues: {
      leadId: '',
      customerId: '',
      inventoryId: '',
      quotationId: '',
      totalAmount: '',
      bookingAmount: '',
      notes: '',
    } as NewBookingFormValues,
  })

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const qId = params.get('quotationId')
    const lId = params.get('leadId')
    if (qId) { setQuotationIdParam(qId); setValue('quotationId', qId) }
    if (lId) { setLeadIdParam(lId); setValue('leadId', lId) }
  }, [setValue])

  const watchedLeadId = watch('leadId')
  const watchedQuotationId = watch('quotationId')
  const watchedTotal = watch('totalAmount')
  const watchedBooking = watch('bookingAmount')

  // Auto-fill from quotation
  const { data: quotationData } = useQuery({
    queryKey: ['quotation-prefill', watchedQuotationId],
    queryFn: () => quotationApi.getById(watchedQuotationId),
    enabled: !!watchedQuotationId,
  })

  useEffect(() => {
    const q = quotationData?.data?.data
    if (q) {
      setValue('totalAmount', q.totalAmount.toString())
      setValue('bookingAmount', q.bookingAmount?.toString() || '')
      if (q.inventoryId) setValue('inventoryId', q.inventoryId)
      if (q.leadId) setValue('leadId', q.leadId)
    }
  }, [quotationData, setValue])

  const { data: leadsData } = useQuery({
    queryKey: ['leads-for-booking'],
    queryFn: () => leadApi.getAll({ limit: 100 }),
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-booking'],
    queryFn: () => customerApi.getAll({ limit: 100 }),
  })

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-available-booking'],
    queryFn: () => inventoryApi.getAll({ status: 'AVAILABLE', limit: 200 }),
  })

  const { data: quotationsData } = useQuery({
    queryKey: ['quotations-approved'],
    queryFn: () => quotationApi.getAll({ status: 'APPROVED', limit: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => bookingApi.create(data),
    onSuccess: (res) => {
      toast.success('Booking created successfully!')
      router.push(`/bookings/${res.data.data.id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create booking'),
  })

  const leads = leadsData?.data?.data || []
  const customers = customersData?.data?.data || []
  const inventory = inventoryData?.data?.data || []
  const quotations = quotationsData?.data?.data || []

  const balance = parseFloat(watchedTotal || '0') - parseFloat(watchedBooking || '0')
  const selectedInventory = inventory.find((i: any) => i.id === watch('inventoryId'))
  const q = quotationData?.data?.data

  const onSubmit = (data: any) => createMutation.mutate(data)

  return (
    <AppLayout
      title="Create Booking"
      subtitle="Convert a lead and quotation into a confirmed booking"
      actions={
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>
          Back
        </Button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-4">

            {/* Lead & Quotation */}
            <Card>
              <CardHeader>
                <CardTitle><FileText className="w-4 h-4 text-gold" />Lead & Quotation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <select {...register('leadId', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                      <option value="">Select lead</option>
                      {leads.map((l: any) => (
                        <option key={l.id} value={l.id}>{l.name} — {l.mobile}</option>
                      ))}
                    </select>
                    {errors.leadId && <p className="text-[11px] text-red-400 mt-1">Lead is required</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Approved Quotation</label>
                    <select {...register('quotationId')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                      <option value="">Select quotation (auto-fills)</option>
                      {quotations.map((q: any) => (
                        <option key={q.id} value={q.id}>{q.quotationNumber} — {formatCurrency(q.totalAmount)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {q && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <p className="text-xs font-medium text-green-400">Quotation loaded: {q.quotationNumber}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div><span className="text-slate">Type</span><p className="text-slate-light">{q.propertyType}</p></div>
                      <div><span className="text-slate">Area</span><p className="text-slate-light">{q.area} sq.ft</p></div>
                      <div><span className="text-slate">Total</span><p className="text-gold font-medium">{formatCurrency(q.totalAmount)}</p></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle><User className="w-4 h-4 text-gold" />Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Customer *</label>
                  <select {...register('customerId', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                    <option value="">Select existing customer</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.mobile} {c.isKycVerified ? '✓ KYC' : ''}</option>
                    ))}
                  </select>
                  {errors.customerId && <p className="text-[11px] text-red-400 mt-1">Customer is required</p>}
                </div>
                <p className="text-[11px] text-slate">
                  Don't see the customer?{' '}
                  <a href="/customers" className="text-gold hover:text-gold-light">Create a new customer profile first →</a>
                </p>
              </CardContent>
            </Card>

            {/* Unit/Inventory */}
            <Card>
              <CardHeader>
                <CardTitle><Building2 className="w-4 h-4 text-gold" />Property Unit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Unit *</label>
                  <select {...register('inventoryId', { required: true })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                    <option value="">Select available unit</option>
                    {inventory.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.unitNumber} {i.tower ? `· ${i.tower}` : ''} — {i.area} sq.ft @ {formatCurrency(i.baseRate * i.area)}
                      </option>
                    ))}
                  </select>
                  {errors.inventoryId && <p className="text-[11px] text-red-400 mt-1">Unit selection is required</p>}
                </div>

                {selectedInventory && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {[
                      ['Floor', selectedInventory.floor || '—'],
                      ['Area', `${selectedInventory.area} sq.ft`],
                      ['Value', formatCurrency(selectedInventory.baseRate * selectedInventory.area)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-navy rounded-lg p-2.5 border border-navy-border text-center">
                        <p className="text-slate text-[9px] mb-0.5">{k}</p>
                        <p className="text-white font-medium">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card>
              <CardHeader>
                <CardTitle><BookOpen className="w-4 h-4 text-gold" />Booking Amount</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('totalAmount', { required: true })} type="number" placeholder="Total amount" className="w-full bg-navy border border-navy-border rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                    </div>
                    {errors.totalAmount && <p className="text-[11px] text-red-400 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Booking Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('bookingAmount')} type="number" placeholder="Initial payment" className="w-full bg-navy border border-navy-border rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Notes</label>
                  <textarea {...register('notes')} rows={3} placeholder="Any special terms or notes..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle><CheckCircle className="w-4 h-4 text-gold" />Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Total Sale Value', value: formatCurrency(parseFloat(watchedTotal || '0')), highlight: true },
                    { label: 'Booking Amount', value: formatCurrency(parseFloat(watchedBooking || '0')), color: 'text-green-400' },
                    { label: 'Balance Due', value: formatCurrency(Math.max(0, balance)), color: balance > 0 ? 'text-orange-400' : 'text-slate' },
                  ].map(item => (
                    <div key={item.label} className={`flex justify-between py-2 border-b border-navy-border/50 ${item.highlight ? 'border-navy-border' : ''}`}>
                      <span className="text-slate text-xs">{item.label}</span>
                      <span className={`font-medium text-xs ${item.highlight ? 'text-gold text-base font-semibold' : item.color || 'text-slate-light'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-navy-light/30 rounded-lg p-3 mt-2">
                  <p className="text-[10px] text-slate mb-2">On booking creation:</p>
                  <div className="space-y-1.5 text-[10px] text-slate-light">
                    {[
                      'Lead status → BOOKED',
                      'Unit status → SOLD',
                      'Booking number auto-generated',
                      'Initial payment recorded',
                      'Activity logged',
                    ].map(step => (
                      <div key={step} className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-green-500/60 flex-shrink-0" />
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
                  loading={createMutation.isPending}
                  icon={<BookOpen className="w-4 h-4" />}
                >
                  Confirm Booking
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}

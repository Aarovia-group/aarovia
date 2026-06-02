'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { quotationApi, leadApi, inventoryApi, projectApi } from '@/lib/api'
import { formatCurrency, PROPERTY_TYPES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useForm, useWatch } from 'react-hook-form'
import { ArrowLeft, Calculator, FileText, Send, Save } from 'lucide-react'

type NewQuotationFormValues = {
  leadId: string
  inventoryId: string
  propertyType: string
  notes: string
  baseRate: string
  area: string
  floorRise: string
  plcCharges: string
  maintenanceCharges: string
  parkingCharges: string
  clubhouseCharges: string
  legalCharges: string
  gstRate: string
  discount: string
  bookingAmount: string
  validDays: string
  projectId: string
}

export default function NewQuotationPage() {
  const router = useRouter()
  const [leadIdParam, setLeadIdParam] = useState('')

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<NewQuotationFormValues>({
    defaultValues: {
      leadId: '',
      propertyType: 'APARTMENT',
      baseRate: '',
      area: '',
      floorRise: '0',
      plcCharges: '0',
      maintenanceCharges: '0',
      parkingCharges: '0',
      clubhouseCharges: '0',
      legalCharges: '0',
      gstRate: '5',
      discount: '0',
      bookingAmount: '0',
      validDays: '30',
      projectId: '', // Added projectId to default values
    } as NewQuotationFormValues,
  })

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const id = params.get('leadId')
    if (id) {
      setLeadIdParam(id)
      setValue('leadId', id)
    }
  }, [setValue])

  const watched = useWatch({ control })
  const [calculated, setCalculated] = useState({
    baseAmount: 0, subtotal: 0, gstAmount: 0, totalAmount: 0, discountedAmount: 0,
  })

  // Recalculate on every field change
  useEffect(() => {
    const baseRate = parseFloat(watched.baseRate as string) || 0
    const area = parseFloat(watched.area as string) || 0
    const baseAmount = baseRate * area
    const charges =
      parseFloat(watched.floorRise as string || '0') +
      parseFloat(watched.plcCharges as string || '0') +
      parseFloat(watched.maintenanceCharges as string || '0') +
      parseFloat(watched.parkingCharges as string || '0') +
      parseFloat(watched.clubhouseCharges as string || '0') +
      parseFloat(watched.legalCharges as string || '0')
    const subtotal = baseAmount + charges
    const discount = parseFloat(watched.discount as string || '0')
    const discountedAmount = subtotal - discount
    const gstRate = parseFloat(watched.gstRate as string || '5')
    const gstAmount = discountedAmount * (gstRate / 100)
    const totalAmount = discountedAmount + gstAmount
    setCalculated({ baseAmount, subtotal, gstAmount, totalAmount, discountedAmount })
  }, [watched])

  const { data: leadsData } = useQuery({
    queryKey: ['leads-dropdown'],
    queryFn: () => leadApi.getAll({ limit: 100, status: 'QUALIFIED' }),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll(),
  })

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-available'],
    queryFn: () => inventoryApi.getAll({ status: 'AVAILABLE', limit: 200 }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => quotationApi.create(data),
    onSuccess: (res) => {
      toast.success('Quotation created successfully')
      router.push(`/quotations/${res.data.data.id}`)
    },
    onError: () => toast.error('Failed to create quotation'),
  })

  const onSubmit = (data: any) => {
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + parseInt(data.validDays || '30'))
    createMutation.mutate({ ...data, validUntil: validUntil.toISOString(), projectId: data.projectId || null })
  }

  const leads = leadsData?.data?.data || []
  const projects = projectsData?.data?.data || []
  // ensure projects list is present for the project select
  const inventory = inventoryData?.data?.data || []

  const FieldRow = ({ label, name, type = 'number', placeholder = '0' }: any) => (
    <div className="flex items-center gap-3">
      <label className="text-xs text-slate w-40 flex-shrink-0">{label}</label>
      <div className="flex-1 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
        <input
          {...register(name)}
          type={type}
          placeholder={placeholder}
          className="w-full bg-navy border border-navy-border rounded-lg pl-7 pr-3 py-1.5 text-sm text-white placeholder:text-slate/30 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50"
        />
      </div>
      <div className="w-28 text-right text-xs text-gold">
        {watched[name as keyof typeof watched] ? formatCurrency(parseFloat(watched[name as keyof typeof watched] as string) || 0) : '—'}
      </div>
    </div>
  )

  return (
    <AppLayout
      title="New Quotation"
      subtitle="Create a detailed property quotation"
      actions={
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>
          Back
        </Button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT: Form inputs */}
          <div className="lg:col-span-2 space-y-4">

            {/* Lead & Property Details */}
            <Card>
              <CardHeader>
                <CardTitle><FileText className="w-4 h-4 text-gold" />Quotation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <select
                      {...register('leadId' as const)}
                      className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
                    >
                      <option value="">Select lead</option>
                      {leads.map((l: any) => (
                        <option key={l.id} value={l.id}>{l.name} — {l.mobile}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Project</label>
                      <select
                        {...register('projectId' as const)}
                        className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
                      >
                        <option value="">Select project</option>
                        {projects.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Unit / Inventory</label>
                    <select
                      {...register('inventoryId')}
                      onChange={(e) => {
                        const unit = inventory.find((i: any) => i.id === e.target.value)
                        if (unit) {
                          setValue('baseRate', unit.baseRate.toString())
                          setValue('area', unit.area.toString())
                        }
                      }}
                      className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
                    >
                      <option value="">Select unit (auto-fills rate)</option>
                      {inventory.map((i: any) => (
                        <option key={i.id} value={i.id}>
                          {i.unitNumber} {i.tower ? `· ${i.tower}` : ''} — {i.area} sq.ft @ ₹{i.baseRate?.toLocaleString('en-IN')}/sq.ft
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle><Calculator className="w-4 h-4 text-gold" />Pricing Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Base Rate and Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-navy-border">
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input
                        {...register('baseRate', { required: true })}
                        type="number"
                        placeholder="Rate per sq.ft"
                        className="w-full bg-navy border border-navy-border rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Area (sq.ft) *</label>
                    <input
                      {...register('area', { required: true })}
                      type="number"
                      placeholder="Area in sq.ft"
                      className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                    />
                  </div>
                </div>

                {/* Charges */}
                <div className="space-y-2.5 py-2">
                  <p className="text-[10px] text-slate uppercase tracking-wider font-medium mb-3">Additional Charges</p>
                  <FieldRow label="Floor Rise Charges" name="floorRise" />
                  <FieldRow label="PLC Charges" name="plcCharges" />
                  <FieldRow label="Maintenance Charges" name="maintenanceCharges" />
                  <FieldRow label="Parking Charges" name="parkingCharges" />
                  <FieldRow label="Clubhouse Charges" name="clubhouseCharges" />
                  <FieldRow label="Legal Charges" name="legalCharges" />
                </div>

                {/* Discount & GST */}
                <div className="space-y-2.5 pt-3 border-t border-navy-border">
                  <p className="text-[10px] text-slate uppercase tracking-wider font-medium mb-3">Discount & GST</p>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate w-40 flex-shrink-0">Discount</label>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('discount')} type="number" placeholder="0" className="w-full bg-navy border border-navy-border rounded-lg pl-7 pr-3 py-1.5 text-sm text-white placeholder:text-slate/30 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                    </div>
                    <div className="w-28 text-right text-xs text-red-400">
                      {watched.discount ? `- ${formatCurrency(parseFloat(watched.discount as string) || 0)}` : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate w-40 flex-shrink-0">GST Rate</label>
                    <select {...register('gstRate')} className="flex-1 bg-navy border border-navy-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                      <option value="5">5% (Affordable Housing / Under Construction)</option>
                      <option value="12">12% (Other Residential)</option>
                      <option value="18">18% (Commercial)</option>
                    </select>
                    <div className="w-28 text-right text-xs text-slate">{formatCurrency(calculated.gstAmount)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardHeader>
                <CardTitle><FileText className="w-4 h-4 text-gold" />Payment Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('bookingAmount')} type="number" placeholder="Booking amount" className="w-full bg-navy border border-navy-border rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Valid For (Days)</label>
                    <select {...register('validDays')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                      <option value="7">7 Days</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Notes / Terms</label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      placeholder="Additional notes or payment terms..."
                      className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Live Summary */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle><Calculator className="w-4 h-4 text-gold" />Live Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {[
                  { label: 'Base Amount', value: calculated.baseAmount, sub: watched.baseRate && watched.area ? `${watched.baseRate} × ${watched.area} sq.ft` : undefined },
                  { label: 'Floor Rise', value: parseFloat(watched.floorRise as string || '0') },
                  { label: 'PLC Charges', value: parseFloat(watched.plcCharges as string || '0') },
                  { label: 'Maintenance', value: parseFloat(watched.maintenanceCharges as string || '0') },
                  { label: 'Parking', value: parseFloat(watched.parkingCharges as string || '0') },
                  { label: 'Clubhouse', value: parseFloat(watched.clubhouseCharges as string || '0') },
                  { label: 'Legal Charges', value: parseFloat(watched.legalCharges as string || '0') },
                ].map(({ label, value, sub }) => value > 0 ? (
                  <div key={label} className="flex justify-between py-2 border-b border-navy-border/50 text-xs">
                    <div>
                      <span className="text-slate">{label}</span>
                      {sub && <p className="text-[10px] text-slate/60 mt-0.5">{sub}</p>}
                    </div>
                    <span className="text-slate-light">{formatCurrency(value)}</span>
                  </div>
                ) : null)}

                <div className="flex justify-between py-2 border-b border-navy-border text-xs">
                  <span className="text-slate-light font-medium">Subtotal</span>
                  <span className="text-white font-medium">{formatCurrency(calculated.subtotal)}</span>
                </div>

                {parseFloat(watched.discount as string || '0') > 0 && (
                  <div className="flex justify-between py-2 border-b border-navy-border/50 text-xs">
                    <span className="text-slate">Discount</span>
                    <span className="text-red-400">- {formatCurrency(parseFloat(watched.discount as string) || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-navy-border/50 text-xs">
                  <span className="text-slate">GST ({watched.gstRate}%)</span>
                  <span className="text-slate-light">{formatCurrency(calculated.gstAmount)}</span>
                </div>

                <div className="flex justify-between py-3 mt-1">
                  <span className="text-sm font-semibold text-white">Total Amount</span>
                  <span className="text-xl font-display font-semibold text-gold">{formatCurrency(calculated.totalAmount)}</span>
                </div>

                {parseFloat(watched.bookingAmount as string || '0') > 0 && (
                  <div className="bg-gold/5 border border-gold/20 rounded-lg p-3 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate">Booking Amount</span>
                      <span className="text-gold font-medium">{formatCurrency(parseFloat(watched.bookingAmount as string) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate">Balance on Possession</span>
                      <span className="text-slate-light">{formatCurrency(calculated.totalAmount - (parseFloat(watched.bookingAmount as string) || 0))}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4">
                  <Button type="submit" loading={createMutation.isPending} className="w-full" icon={<Save className="w-3.5 h-3.5" />}>
                    Save Quotation
                  </Button>
                  <Button type="button" variant="secondary" className="w-full" icon={<Send className="w-3.5 h-3.5" />} onClick={() => toast.info('Save first, then share')}>
                    Save & Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}

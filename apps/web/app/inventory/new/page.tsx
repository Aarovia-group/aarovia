'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { inventoryApi, projectApi } from '@/lib/api'
import { PROPERTY_TYPES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Building2, Plus } from 'lucide-react'
import Link from 'next/link'

type InventoryFormValues = {
  projectId: string
  unitNumber: string
  tower: string
  floor: string
  propertyType: string
  facing: string
  area: string
  bedrooms: string
  bathrooms: string
  status: string
  baseRate: string
  finalRate: string
  notes: string
}

const FACINGS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']

export default function NewInventoryPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Unit created successfully')
      router.push(`/inventory/${res.data.data.id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create unit'),
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<InventoryFormValues>({
    defaultValues: {
      projectId: '',
      unitNumber: '',
      tower: '',
      floor: '',
      propertyType: 'APARTMENT',
      facing: '',
      area: '',
      bedrooms: '',
      bathrooms: '',
      status: 'AVAILABLE',
      baseRate: '',
      finalRate: '',
      notes: '',
    } as InventoryFormValues,
  })

  const watchedRate = watch('baseRate' as const)
  const watchedArea = watch('area' as const)
  const totalValue = (parseFloat(watchedRate) || 0) * (parseFloat(watchedArea) || 0)

  const onSubmit = (data: any) => {
    createMutation.mutate({
      ...data,
      area: parseFloat(data.area),
      baseRate: parseFloat(data.baseRate),
      finalRate: data.finalRate ? parseFloat(data.finalRate) : null,
      floor: data.floor ? parseInt(data.floor) : null,
      bedrooms: data.bedrooms ? parseInt(data.bedrooms) : null,
      bathrooms: data.bathrooms ? parseInt(data.bathrooms) : null,
    })
  }

  const projects = projectsData?.data?.data || []
  const inp = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
  const sel = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
  const lbl = "block text-xs font-medium text-slate-light mb-1.5"
  const err = "text-[11px] text-red-400 mt-1"

  return (
    <AppLayout
      title="Add Inventory Unit"
      subtitle="Add a new unit to your project inventory"
      actions={
        <div className="flex gap-2">
          <Link href="/inventory">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Back</Button>
          </Link>
          <Button type="submit" form="inv-form" loading={createMutation.isPending} icon={<Save className="w-3.5 h-3.5" />}>
            Create Unit
          </Button>
        </div>
      }
    >
      <form id="inv-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">

            {/* Project & Unit ID */}
            <Card>
              <CardHeader>
                <CardTitle><Building2 className="w-4 h-4 text-gold" />Unit Identification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <select {...register('projectId', { required: 'Project is required' })} className={sel}>
                      <option value="">Select project</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {errors.projectId && <p className={err}>{errors.projectId.message as string}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Unit Number *</label>
                    <input {...register('unitNumber', { required: 'Unit number is required' })} placeholder="e.g. A-101, B-204" className={inp} />
                    {errors.unitNumber && <p className={err}>{errors.unitNumber.message as string}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Tower / Block</label>
                    <input {...register('tower')} placeholder="Tower A, Block B" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Floor Number</label>
                    <input {...register('floor')} type="number" min="0" placeholder="Floor level" className={inp} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Specs */}
            <Card>
              <CardHeader>
                <CardTitle>Property Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <select {...register('propertyType', { required: true })} className={sel}>
                      {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Facing Direction</label>
                    <select {...register('facing')} className={sel}>
                      <option value="">Not specified</option>
                      {FACINGS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Area (sq.ft) *</label>
                    <input {...register('area', { required: 'Area is required' })} type="number" step="0.01" placeholder="Built-up area" className={inp} />
                    {errors.area && <p className={err}>{errors.area.message as string}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Bedrooms</label>
                    <select {...register('bedrooms')} className={sel}>
                      <option value="">N/A</option>
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} BHK</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Bathrooms</label>
                    <select {...register('bathrooms')} className={sel}>
                      <option value="">N/A</option>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Initial Status</label>
                    <select {...register('status')} className={sel}>
                      {['AVAILABLE', 'BLOCKED', 'RESERVED'].map(s => (
                        <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('baseRate', { required: 'Base rate is required' })} type="number" step="0.01" placeholder="Rate per sq.ft" className={`${inp} pl-7`} />
                    </div>
                    {errors.baseRate && <p className={err}>{errors.baseRate.message as string}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Negotiated / Final Rate (optional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('finalRate')} type="number" step="0.01" placeholder="Override rate" className={`${inp} pl-7`} />
                    </div>
                  </div>
                </div>

                {totalValue > 0 && (
                  <div className="mt-4 bg-gold/5 border border-gold/20 rounded-lg p-3 flex items-center justify-between">
                    <p className="text-xs text-slate">Estimated Total Value</p>
                    <p className="text-lg font-display font-semibold text-gold">
                      ₹{totalValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Special features, views, additional notes about this unit..."
                  className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Unit Checklist</p>
                <div className="space-y-2 text-xs text-slate">
                  {[
                    ['Project', 'Required for inventory management'],
                    ['Unit Number', 'Unique identifier per project'],
                    ['Area', 'Used in all calculations'],
                    ['Base Rate', 'Price per sq.ft for quotations'],
                    ['Property Type', 'For filtering and reports'],
                  ].map(([f, d]) => (
                    <div key={f} className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1.5 flex-shrink-0" />
                      <div><span className="text-slate-light font-medium">{f}</span> — {d}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Bulk Upload</p>
                <p className="text-xs text-slate mb-3">Need to add many units at once? Use the inventory import tool on the main inventory page.</p>
                <Link href="/inventory">
                  <Button variant="ghost" size="sm" className="w-full text-xs">Go to Inventory →</Button>
                </Link>
              </CardContent>
            </Card>

            <Button type="submit" form="inv-form" loading={createMutation.isPending} icon={<Plus className="w-4 h-4" />} className="w-full">
              Create Unit
            </Button>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}

'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { quotationApi } from '@/lib/api'
import { PROPERTY_TYPES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function EditQuotationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.getById(id),
    enabled: !!id,
  })

  const q = data?.data?.data

  const { register, handleSubmit, reset, watch } = useForm()

  useEffect(() => {
    if (q) {
      reset({
        propertyType: q.propertyType,
        baseRate: q.baseRate,
        area: q.area,
        floorRise: q.floorRise,
        plcCharges: q.plcCharges,
        maintenanceCharges: q.maintenanceCharges,
        parkingCharges: q.parkingCharges,
        clubhouseCharges: q.clubhouseCharges,
        legalCharges: q.legalCharges,
        gstRate: q.gstRate,
        discount: q.discount,
        bookingAmount: q.bookingAmount,
        notes: q.notes,
        validUntil: q.validUntil ? new Date(q.validUntil).toISOString().slice(0, 10) : '',
      })
    }
  }, [q, reset])

  const updateMutation = useMutation({
    mutationFn: (data: any) => quotationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      toast.success('Quotation updated')
      router.push(`/quotations/${id}`)
    },
    onError: () => toast.error('Failed to update quotation'),
  })

  const onSubmit = (data: any) => {
    const nums = ['baseRate', 'area', 'floorRise', 'plcCharges', 'maintenanceCharges', 'parkingCharges', 'clubhouseCharges', 'legalCharges', 'gstRate', 'discount', 'bookingAmount']
    const payload: any = { ...data }
    nums.forEach(f => { payload[f] = parseFloat(payload[f]) || 0 })
    if (payload.validUntil) payload.validUntil = new Date(payload.validUntil).toISOString()
    updateMutation.mutate(payload)
  }

  if (isLoading) return <AppLayout title="Edit Quotation"><div className="py-16 text-center text-slate">Loading...</div></AppLayout>
  if (!q) return <AppLayout title="Not Found"><div className="py-16 text-center text-slate">Quotation not found</div></AppLayout>

  const inp = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
  const inpAmt = `${inp} pl-7`
  const sel = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
  const lbl = "block text-xs font-medium text-slate-light mb-1.5"

  const ChargeField = ({ label, name }: { label: string; name: string }) => (
    <div>
      <label className={lbl}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
        <input {...register(name)} type="number" step="0.01" className={inpAmt} />
      </div>
    </div>
  )

  return (
    <AppLayout
      title={`Edit — ${q.quotationNumber}`}
      subtitle="Update quotation details and pricing"
      actions={
        <div className="flex gap-2">
          <Link href={`/quotations/${id}`}>
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Cancel</Button>
          </Link>
          <Button type="submit" form="edit-qt-form" loading={updateMutation.isPending} icon={<Save className="w-3.5 h-3.5" />}>
            Save Changes
          </Button>
        </div>
      }
    >
      <form id="edit-qt-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <Card>
            <CardHeader><CardTitle>Property & Base Pricing</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={lbl}>Property Type</label>
                  <select {...register('propertyType')} className={sel}>
                    {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('baseRate')} type="number" step="0.01" className={inpAmt} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Area (sq.ft)</label>
                    <input {...register('area')} type="number" step="0.01" className={inp} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Additional Charges</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChargeField label="Floor Rise" name="floorRise" />
                <ChargeField label="PLC Charges" name="plcCharges" />
                <ChargeField label="Maintenance" name="maintenanceCharges" />
                <ChargeField label="Parking" name="parkingCharges" />
                <ChargeField label="Clubhouse" name="clubhouseCharges" />
                <ChargeField label="Legal Charges" name="legalCharges" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>GST, Discount & Booking</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <select {...register('gstRate')} className={sel}>
                    <option value="5">5% (Under Construction)</option>
                    <option value="12">12% (Ready to Move)</option>
                    <option value="18">18% (Commercial)</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Discount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                    <input {...register('discount')} type="number" step="0.01" className={inpAmt} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Booking Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                    <input {...register('bookingAmount')} type="number" step="0.01" className={inpAmt} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Valid Until</label>
                  <input {...register('validUntil')} type="date" className={inp} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes & Terms</CardTitle></CardHeader>
            <CardContent>
              <textarea
                {...register('notes')}
                rows={6}
                placeholder="Additional notes or payment terms..."
                className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </AppLayout>
  )
}

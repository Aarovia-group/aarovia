'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui/index'
import { inventoryApi } from '@/lib/api'
import { formatCurrency, formatDate, getInventoryStatusColor } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { ArrowLeft, Building2, Home, Coins, User, Calendar, Edit2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS = ['AVAILABLE', 'BLOCKED', 'RESERVED', 'SOLD']

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-unit', id],
    queryFn: () => inventoryApi.getById(id),
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => inventoryApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-unit', id] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const unit = data?.data?.data

  if (isLoading) return (
    <AppLayout title="Unit Detail">
      <div className="flex items-center justify-center h-64 text-slate text-sm">Loading...</div>
    </AppLayout>
  )

  if (!unit) return (
    <AppLayout title="Not Found">
      <div className="text-center py-16 text-slate">Unit not found</div>
    </AppLayout>
  )

  const totalValue = unit.area * unit.baseRate

  return (
    <AppLayout
      title={`Unit ${unit.unitNumber}`}
      subtitle={`${unit.project?.name} · ${unit.propertyType}`}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>
            Back
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Unit Info */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-navy border border-navy-border flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Unit {unit.unitNumber}</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getInventoryStatusColor(unit.status)}`}>
                    {unit.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {[
                  { label: 'Project', value: unit.project?.name, icon: Building2 },
                  { label: 'Tower', value: unit.tower || '—', icon: Building2 },
                  { label: 'Floor', value: unit.floor ? `Floor ${unit.floor}` : '—', icon: Home },
                  { label: 'Area', value: `${unit.area} sq.ft`, icon: Home },
                  { label: 'Facing', value: unit.facing || '—', icon: Home },
                  { label: 'Type', value: unit.propertyType, icon: Building2 },
                  { label: 'Bedrooms', value: unit.bedrooms ? `${unit.bedrooms} BHK` : '—', icon: Home },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <item.icon className="w-3.5 h-3.5 text-slate flex-shrink-0" />
                    <div className="flex justify-between flex-1">
                      <span className="text-slate text-xs">{item.label}</span>
                      <span className="text-slate-light text-xs">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle><Coins className="w-4 h-4 text-gold" />Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Base Rate', value: `₹${unit.baseRate?.toLocaleString('en-IN')}/sq.ft` },
                { label: 'Area', value: `${unit.area} sq.ft` },
                { label: 'Total Value', value: formatCurrency(totalValue), highlight: true },
                ...(unit.finalRate ? [{ label: 'Negotiated Rate', value: `₹${unit.finalRate?.toLocaleString('en-IN')}/sq.ft` }] : []),
              ].map(item => (
                <div key={item.label} className={`flex justify-between text-sm pb-2 border-b border-navy-border/40 ${item === undefined ? '' : ''}`}>
                  <span className="text-slate text-xs">{item.label}</span>
                  <span className={(item as any).highlight ? 'text-gold font-semibold text-base' : 'text-slate-light text-xs'}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Status & Booking */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Change */}
          <Card>
            <CardHeader>
              <CardTitle>Unit Status</CardTitle>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium ${getInventoryStatusColor(unit.status)}`}>
                Current: {unit.status}
              </span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {STATUS_LABELS.map(s => (
                  <button
                    key={s}
                    onClick={() => s !== unit.status && updateStatusMutation.mutate(s)}
                    disabled={s === unit.status || updateStatusMutation.isPending}
                    className={`py-3 rounded-xl text-xs font-medium border transition-all ${
                      s === unit.status
                        ? 'bg-gold/20 text-gold border-gold/40 cursor-default'
                        : 'bg-navy border-navy-border text-slate hover:text-white hover:border-slate/60 cursor-pointer disabled:opacity-40'
                    }`}
                  >
                    {s === 'AVAILABLE' ? '🟢' : s === 'BLOCKED' ? '🟠' : s === 'RESERVED' ? '🔴' : '🔵'} {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate mt-3">
                Click a status to update. Sold units are auto-updated when a booking is created.
              </p>
            </CardContent>
          </Card>

          {/* Current Booking */}
          {unit.booking && (
            <Card>
              <CardHeader>
                <CardTitle><User className="w-4 h-4 text-gold" />Current Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-navy font-bold text-sm">
                    {unit.booking.customer?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{unit.booking.customer?.name}</p>
                    <p className="text-xs text-slate">{unit.booking.customer?.mobile}</p>
                  </div>
                  <Link href={`/bookings/${unit.booking.id}`} className="ml-auto">
                    <Button variant="secondary" size="sm">View Booking</Button>
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-navy rounded-lg p-2.5 border border-navy-border text-center">
                    <p className="text-gold font-medium">{formatCurrency(unit.booking.totalAmount)}</p>
                    <p className="text-slate text-[9px] mt-0.5">Total</p>
                  </div>
                  <div className="bg-navy rounded-lg p-2.5 border border-green-500/20 text-center">
                    <p className="text-green-400 font-medium">{formatCurrency(unit.booking.collectedAmount)}</p>
                    <p className="text-slate text-[9px] mt-0.5">Collected</p>
                  </div>
                  <div className="bg-navy rounded-lg p-2.5 border border-navy-border text-center">
                    <p className={unit.booking.dueAmount > 0 ? 'text-red-400 font-medium' : 'text-slate'}>{formatCurrency(unit.booking.dueAmount)}</p>
                    <p className="text-slate text-[9px] mt-0.5">Due</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quotation History */}
          {unit.quotations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quotation History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unit.quotations.map((q: any) => (
                  <Link key={q.id} href={`/quotations/${q.id}`}>
                    <div className="flex items-center justify-between p-3 bg-navy rounded-lg border border-navy-border hover:border-gold/30 transition-colors cursor-pointer">
                      <div>
                        <p className="text-xs font-medium text-white">{q.quotationNumber}</p>
                        <p className="text-[10px] text-slate mt-0.5">{formatDate(q.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gold font-medium">{formatCurrency(q.totalAmount)}</p>
                        <span className="text-[9px] text-slate">{q.status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {unit.status === 'AVAILABLE' && (
            <Card>
              <CardContent>
                <p className="text-xs font-medium text-white mb-3">Quick Actions</p>
                <div className="flex gap-3">
                  <Link href={`/quotations/new?inventoryId=${id}`}>
                    <Button variant="secondary" icon={<Coins className="w-3.5 h-3.5" />}>Create Quotation</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={() => updateStatusMutation.mutate('BLOCKED')}
                    loading={updateStatusMutation.isPending}
                  >
                    Block Unit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {unit.notes && (
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-slate-light leading-relaxed">{unit.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

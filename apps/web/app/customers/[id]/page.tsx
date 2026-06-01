'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { customerApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { ArrowLeft, CheckCircle, User, Phone, Mail, MapPin, FileText, BookOpen, Coins, Shield } from 'lucide-react'
import Link from 'next/link'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerApi.getById(id),
    enabled: !!id,
  })

  const verifyKycMutation = useMutation({
    mutationFn: () => customerApi.verifyKyc(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer', id] }); toast.success('KYC verified') },
    onError: () => toast.error('Failed to verify KYC'),
  })

  const c = data?.data?.data

  if (isLoading) return <AppLayout title="Customer"><div className="py-16 text-center text-slate">Loading...</div></AppLayout>
  if (!c) return <AppLayout title="Not Found"><div className="py-16 text-center text-slate">Customer not found</div></AppLayout>

  const totalPaid = c.payments?.reduce((s: number, p: any) => s + p.amount, 0) || 0

  return (
    <AppLayout
      title={c.name}
      subtitle={`${c.mobile} · ${c.bookings?.length || 0} booking(s)`}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>Back</Button>
          {!c.isKycVerified && (
            <Button size="sm" icon={<Shield className="w-3.5 h-3.5" />} loading={verifyKycMutation.isPending} onClick={() => verifyKycMutation.mutate()}>
              Verify KYC
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center text-navy text-xl font-bold">
                  {c.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">{c.name}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    {c.isKycVerified
                      ? <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />KYC Verified</span>
                      : <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">KYC Pending</span>
                    }
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Phone, label: 'Mobile', value: c.mobile },
                  { icon: Phone, label: 'Alternate', value: c.alternatePhone || '—' },
                  { icon: Mail, label: 'Email', value: c.email || '—' },
                  { icon: MapPin, label: 'City', value: c.city ? `${c.city}, ${c.state || ''}` : '—' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <item.icon className="w-3.5 h-3.5 text-slate flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate">{item.label}</p>
                      <p className="text-xs text-slate-light">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* KYC Details */}
          <Card>
            <CardHeader><CardTitle><Shield className="w-4 h-4 text-gold" />KYC Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate">PAN Number</span><span className="text-slate-light font-mono">{c.panNumber || 'Not provided'}</span></div>
              <div className="flex justify-between"><span className="text-slate">Aadhaar</span><span className="text-slate-light font-mono">{c.aadhaarNumber ? `XXXX-XXXX-${c.aadhaarNumber.slice(-4)}` : 'Not provided'}</span></div>
              <div className="flex justify-between"><span className="text-slate">Status</span>
                <span className={c.isKycVerified ? 'text-green-400' : 'text-orange-400'}>{c.isKycVerified ? 'Verified' : 'Pending'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader><CardTitle><Coins className="w-4 h-4 text-gold" />Financial Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total Payments', value: formatCurrency(totalPaid), color: 'text-green-400' },
                { label: 'Bookings', value: c.bookings?.length || 0, color: 'text-gold' },
                { label: 'Documents', value: c.documents?.length || 0, color: 'text-blue-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-slate text-xs">{item.label}</span>
                  <span className={`font-medium ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bookings */}
          <Card>
            <CardHeader><CardTitle><BookOpen className="w-4 h-4 text-gold" />Bookings ({c.bookings?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-0">
              {c.bookings?.length === 0 ? (
                <div className="py-8 text-center text-slate text-sm">No bookings yet</div>
              ) : c.bookings?.map((booking: any) => (
                <Link key={booking.id} href={`/bookings/${booking.id}`}>
                  <div className="flex items-center justify-between p-4 hover:bg-navy-light/30 transition-colors border-b border-navy-border/50 last:border-0 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-navy border border-navy-border flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{booking.bookingNumber}</p>
                        <p className="text-xs text-slate">{booking.inventory?.project?.name} · Unit {booking.inventory?.unitNumber}</p>
                        <p className="text-[10px] text-slate mt-0.5">{formatDate(booking.bookingDate)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gold">{formatCurrency(booking.totalAmount)}</p>
                      <p className={`text-xs mt-0.5 ${booking.dueAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {booking.dueAmount > 0 ? `Due: ${formatCurrency(booking.dueAmount)}` : 'Fully Paid'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader><CardTitle><Coins className="w-4 h-4 text-gold" />Recent Payments</CardTitle></CardHeader>
            <CardContent className="space-y-0 p-0">
              {c.payments?.length === 0 ? (
                <div className="py-8 text-center text-slate text-sm">No payments recorded</div>
              ) : c.payments?.slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-4 border-b border-navy-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-slate">{p.paymentMode} {p.transactionId ? `· ${p.transactionId}` : ''}</p>
                    {p.notes && <p className="text-[10px] text-slate/70 mt-0.5">{p.notes}</p>}
                  </div>
                  <p className="text-xs text-slate">{formatDate(p.paymentDate)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle><FileText className="w-4 h-4 text-gold" />Documents ({c.documents?.length || 0})</CardTitle>
              <Button size="sm" variant="secondary">Upload</Button>
            </CardHeader>
            <CardContent>
              {c.documents?.length === 0 ? (
                <div className="py-6 text-center text-slate text-sm">No documents uploaded</div>
              ) : (
                <div className="space-y-2">
                  {c.documents?.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-navy rounded-lg border border-navy-border">
                      <FileText className="w-4 h-4 text-gold flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate">{doc.category} · {formatDate(doc.createdAt)}</p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">View</Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

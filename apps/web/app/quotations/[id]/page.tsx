'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui/index'
import { quotationApi, emailApi, whatsappApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { ArrowLeft, Mail, MessageSquare, Download, Edit2, CheckCircle, FileText, Building2, User, Calendar } from 'lucide-react'
import Link from 'next/link'

const STATUS_FLOW = ['DRAFT', 'SHARED', 'NEGOTIATION', 'APPROVED', 'CONVERTED']
const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate/20 text-slate border-slate/30',
  SHARED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NEGOTIATION: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
  CONVERTED: 'bg-gold/20 text-gold border-gold/30',
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.getById(id),
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => quotationApi.updateStatus(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotation', id] }); toast.success('Status updated') },
  })

  const sendEmailMutation = useMutation({
    mutationFn: () => emailApi.sendQuotation({ quotationId: id }),
    onSuccess: () => toast.success('Quotation emailed successfully'),
    onError: () => toast.error('Failed to send email'),
  })

  const sendWAMutation = useMutation({
    mutationFn: () => whatsappApi.sendProjectDetails({ leadId: q?.leadId }),
    onSuccess: () => toast.success('WhatsApp sent'),
    onError: () => toast.error('Failed to send WhatsApp'),
  })

  const q = data?.data?.data

  if (isLoading) return <AppLayout title="Quotation"><div className="py-16 text-center text-slate">Loading...</div></AppLayout>
  if (!q) return <AppLayout title="Not Found"><div className="py-16 text-center text-slate">Quotation not found</div></AppLayout>

  const currentStep = STATUS_FLOW.indexOf(q.status)
  const nextStatus = STATUS_FLOW[currentStep + 1]

  const LineItem = ({ label, value, highlight = false, negative = false }: any) => (
    <div className={`flex justify-between py-2.5 text-sm border-b border-navy-border/40 ${highlight ? 'border-navy-border' : ''}`}>
      <span className={highlight ? 'text-white font-medium' : 'text-slate'}>{label}</span>
      <span className={highlight ? 'text-gold font-semibold' : negative ? 'text-red-400' : 'text-slate-light'}>
        {negative && value > 0 ? '- ' : ''}{formatCurrency(value)}
      </span>
    </div>
  )

  return (
    <AppLayout
      title={q.quotationNumber}
      subtitle={`${q.propertyType} · ${q.area} sq.ft`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>Back</Button>
          <Button variant="secondary" size="sm" icon={<Mail className="w-3.5 h-3.5" />} loading={sendEmailMutation.isPending} onClick={() => sendEmailMutation.mutate()}>Email</Button>
          <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} loading={sendWAMutation.isPending} onClick={() => sendWAMutation.mutate()}>WhatsApp</Button>
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Download PDF</Button>
          {nextStatus && (
            <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} loading={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate(nextStatus)}>
              Mark as {nextStatus.charAt(0) + nextStatus.slice(1).toLowerCase()}
            </Button>
          )}
        </div>
      }
    >
      {/* Status Progress Bar */}
      <Card className="mb-5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {STATUS_FLOW.map((status, i) => (
              <div key={status} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${i <= currentStep ? 'border-gold bg-gold/20' : 'border-navy-border bg-navy'}`}>
                    {i < currentStep ? (
                      <CheckCircle className="w-3.5 h-3.5 text-gold" />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-gold' : 'bg-navy-border'}`} />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1.5 whitespace-nowrap ${i === currentStep ? 'text-gold font-medium' : i < currentStep ? 'text-slate-light' : 'text-slate'}`}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < currentStep ? 'bg-gold' : 'bg-navy-border'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Full breakdown */}
        <div className="lg:col-span-2 space-y-4">

          {/* Lead & Project Info */}
          <Card>
            <CardHeader>
              <CardTitle><User className="w-4 h-4 text-gold" />Customer & Property</CardTitle>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[q.status]}`}>{q.status}</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Lead / Customer', value: q.lead?.name || '—', icon: User },
                  { label: 'Project', value: q.project?.name || '—', icon: Building2 },
                  { label: 'Unit / Block', value: q.inventory ? `${q.inventory.unitNumber}${q.inventory.tower ? ' · ' + q.inventory.tower : ''}` : '—', icon: Building2 },
                  { label: 'Property Type', value: q.propertyType, icon: FileText },
                  { label: 'Valid Until', value: q.validUntil ? formatDate(q.validUntil) : '30 days from issue', icon: Calendar },
                  { label: 'Created', value: formatDate(q.createdAt), icon: Calendar },
                ].map(item => (
                  <div key={item.label} className="flex gap-2.5 items-start">
                    <item.icon className="w-3.5 h-3.5 text-slate mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate">{item.label}</p>
                      <p className="text-slate-light text-xs mt-0.5">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle><FileText className="w-4 h-4 text-gold" />Pricing Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <LineItem label={`Base Amount (${q.baseRate?.toLocaleString('en-IN')}/sq.ft × ${q.area} sq.ft)`} value={q.baseAmount} />
              {q.floorRise > 0 && <LineItem label="Floor Rise Charges" value={q.floorRise} />}
              {q.plcCharges > 0 && <LineItem label="PLC Charges" value={q.plcCharges} />}
              {q.maintenanceCharges > 0 && <LineItem label="Maintenance Charges" value={q.maintenanceCharges} />}
              {q.parkingCharges > 0 && <LineItem label="Parking Charges" value={q.parkingCharges} />}
              {q.clubhouseCharges > 0 && <LineItem label="Clubhouse Charges" value={q.clubhouseCharges} />}
              {q.legalCharges > 0 && <LineItem label="Legal Charges" value={q.legalCharges} />}
              {q.discount > 0 && <LineItem label="Discount" value={q.discount} negative />}
              <LineItem label={`GST @ ${q.gstRate}%`} value={q.gstAmount} />
              <div className="flex justify-between pt-4 mt-2">
                <span className="text-base font-semibold text-white">Total Amount</span>
                <span className="text-2xl font-display font-semibold text-gold">{formatCurrency(q.totalAmount)}</span>
              </div>
              {q.bookingAmount > 0 && (
                <div className="mt-4 bg-gold/5 border border-gold/20 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate">Booking Amount</span>
                    <span className="text-gold font-medium">{formatCurrency(q.bookingAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate">Balance on Possession</span>
                    <span className="text-slate-light">{formatCurrency(q.totalAmount - q.bookingAmount)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Milestones */}
          {q.paymentMilestones?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><Calendar className="w-4 h-4 text-gold" />Payment Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {q.paymentMilestones.map((m: any, i: number) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-navy rounded-lg border border-navy-border">
                      <div className="w-6 h-6 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-[10px] font-bold text-gold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{m.name}</p>
                        {m.dueDate && <p className="text-[10px] text-slate mt-0.5">Due: {formatDate(m.dueDate)}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gold">{formatCurrency(m.amount)}</p>
                        <p className="text-[10px] text-slate">{m.percentage}%</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.isPaid ? 'bg-green-500' : 'bg-navy-border'}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {q.notes && (
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-2">Notes & Terms</p>
                <p className="text-sm text-slate-light leading-relaxed">{q.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Actions & Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Property Type', value: q.propertyType },
                { label: 'Area', value: `${q.area} sq.ft` },
                { label: 'Base Rate', value: `₹${q.baseRate?.toLocaleString('en-IN')}/sq.ft` },
                { label: 'GST Rate', value: `${q.gstRate}%` },
                { label: 'Discount', value: q.discount > 0 ? formatCurrency(q.discount) : 'None' },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-xs">
                  <span className="text-slate">{item.label}</span>
                  <span className="text-slate-light">{item.value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-navy-border">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-white">Total</span>
                  <span className="text-lg font-display font-semibold text-gold">{formatCurrency(q.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="space-y-2">
              <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Actions</p>
              <Button variant="secondary" className="w-full justify-start" size="sm" icon={<Mail className="w-3.5 h-3.5" />} loading={sendEmailMutation.isPending} onClick={() => sendEmailMutation.mutate()}>
                Send via Email
              </Button>
              <Button variant="secondary" className="w-full justify-start" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} loading={sendWAMutation.isPending} onClick={() => sendWAMutation.mutate()}>
                Share on WhatsApp
              </Button>
              <Button variant="secondary" className="w-full justify-start" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
                Download PDF
              </Button>
              {q.status === 'APPROVED' && (
                <Link href={`/bookings/new?quotationId=${id}&leadId=${q.leadId}`} className="block">
                  <Button className="w-full justify-start" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}>
                    Convert to Booking
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {q.lead && (
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Lead Details</p>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-navy text-xs font-bold">
                    {q.lead.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{q.lead.name}</p>
                    <p className="text-xs text-slate">{q.lead.mobile}</p>
                  </div>
                </div>
                <Link href={`/leads/${q.lead.id}`}>
                  <Button variant="ghost" size="sm" className="w-full text-xs">View Lead Profile →</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

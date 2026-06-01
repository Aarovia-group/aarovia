'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Modal } from '@/components/ui/index'
import { leadApi, emailApi, whatsappApi } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime, getLeadStatusColor, getLeadStatusLabel, getSourceLabel, LEAD_STATUSES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Phone, Mail, MessageSquare, MapPin, Calendar, Edit2, ArrowLeft, Plus, FileText, Activity, Clock, User, Building2, Banknote, Send, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'activity' | 'calls' | 'notes' | 'quotations' | 'visits'>('activity')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadApi.getById(id),
    enabled: !!id,
  })

  const lead = data?.data?.data

  const updateStatusMutation = useMutation({
    mutationFn: (data: any) => leadApi.updateStatus(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lead', id] }); setShowStatusModal(false); toast.success('Status updated') },
    onError: () => toast.error('Failed to update status'),
  })

  const addCallMutation = useMutation({
    mutationFn: (data: any) => leadApi.addCallLog(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lead', id] }); setShowCallModal(false); toast.success('Call logged') },
  })

  const addNoteMutation = useMutation({
    mutationFn: (data: any) => leadApi.addNote(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lead', id] }); setShowNoteModal(false); toast.success('Note added') },
  })

  const sendEmailMutation = useMutation({
    mutationFn: (data: any) => emailApi.sendProjectDetails({ leadId: id, ...data }),
    onSuccess: () => { setShowEmailModal(false); toast.success('Email sent successfully') },
    onError: () => toast.error('Failed to send email'),
  })

  const sendWAMutation = useMutation({
    mutationFn: () => whatsappApi.sendProjectDetails({ leadId: id, projectId: lead?.projectId }),
    onSuccess: () => toast.success('WhatsApp message sent'),
    onError: () => toast.error('Failed to send WhatsApp'),
  })

  const { register, handleSubmit, reset } = useForm()

  if (isLoading) return <AppLayout title="Lead Detail"><div className="flex items-center justify-center h-64"><div className="text-slate">Loading...</div></div></AppLayout>
  if (!lead) return <AppLayout title="Lead Not Found"><div className="text-slate text-center py-16">Lead not found</div></AppLayout>

  const activityIcons: Record<string, any> = {
    LEAD_CREATED: <Plus className="w-3.5 h-3.5 text-green-400" />,
    STATUS_CHANGED: <Activity className="w-3.5 h-3.5 text-blue-400" />,
    CALL_LOGGED: <Phone className="w-3.5 h-3.5 text-orange-400" />,
    EMAIL_SENT: <Mail className="w-3.5 h-3.5 text-green-400" />,
    WHATSAPP_SENT: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
    NOTE_ADDED: <FileText className="w-3.5 h-3.5 text-purple-400" />,
    LEAD_ASSIGNED: <User className="w-3.5 h-3.5 text-gold" />,
    BOOKING_CREATED: <CheckCircle className="w-3.5 h-3.5 text-gold" />,
  }

  return (
    <AppLayout
      title={lead.name}
      subtitle={`${getSourceLabel(lead.source)} · ${lead.mobile}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>Back</Button>
          <Button variant="secondary" size="sm" icon={<Phone className="w-3.5 h-3.5" />} onClick={() => setShowCallModal(true)}>Log Call</Button>
          <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => sendWAMutation.mutate()} loading={sendWAMutation.isPending}>WhatsApp</Button>
          <Button variant="secondary" size="sm" icon={<Mail className="w-3.5 h-3.5" />} onClick={() => setShowEmailModal(true)}>Send Email</Button>
          <Button size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => setShowStatusModal(true)}>Update Status</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Lead Info */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-navy border border-navy-border flex items-center justify-center text-lg font-bold text-gold">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-medium text-white">{lead.name}</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLeadStatusColor(lead.status)}`}>
                    {getLeadStatusLabel(lead.status)}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: <Phone className="w-3.5 h-3.5" />, label: 'Mobile', value: lead.mobile },
                  { icon: <Mail className="w-3.5 h-3.5" />, label: 'Email', value: lead.email || '—' },
                  { icon: <MapPin className="w-3.5 h-3.5" />, label: 'City', value: lead.city || '—' },
                  { icon: <Banknote className="w-3.5 h-3.5" />, label: 'Budget', value: lead.budget ? formatCurrency(lead.budget) : '—' },
                  { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Property Type', value: lead.propertyType || '—' },
                  { icon: <User className="w-3.5 h-3.5" />, label: 'Source', value: getSourceLabel(lead.source) },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <div className="text-slate flex-shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-slate block">{item.label}</span>
                      <span className="text-xs text-slate-light">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Followup */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-white">Next Followup</span>
              </div>
              {lead.nextFollowupDate ? (
                <p className={`text-sm ${new Date(lead.nextFollowupDate) < new Date() ? 'text-red-400' : 'text-green-400'}`}>
                  {formatDate(lead.nextFollowupDate)}
                </p>
              ) : (
                <p className="text-xs text-slate">No followup scheduled</p>
              )}
            </CardContent>
          </Card>

          {/* Assigned To */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-white">Assigned To</span>
              </div>
              {lead.assignedTo ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-navy-light border border-navy-border flex items-center justify-center text-[10px] font-bold text-gold">
                    {lead.assignedTo.name.charAt(0)}
                  </div>
                  <span className="text-sm text-slate-light">{lead.assignedTo.name}</span>
                </div>
              ) : <p className="text-xs text-slate">Unassigned</p>}
            </CardContent>
          </Card>

          {/* Remarks */}
          {lead.remarks && (
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1.5">Remarks</p>
                <p className="text-sm text-slate-light leading-relaxed">{lead.remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Timeline & Tabs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Activities', value: lead._count?.activities || 0, color: 'text-blue-400' },
              { label: 'Calls', value: lead._count?.callLogs || 0, color: 'text-orange-400' },
              { label: 'Quotations', value: lead.quotations?.length || 0, color: 'text-gold' },
              { label: 'Tasks', value: lead._count?.tasks || 0, color: 'text-purple-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-navy-mid border border-navy-border rounded-lg p-3 text-center">
                <div className={`text-xl font-display font-medium ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          <Card>
            {/* Tabs */}
            <div className="flex border-b border-navy-border overflow-x-auto scrollbar-hide">
              {[
                { key: 'activity', label: 'Timeline' },
                { key: 'calls', label: 'Call Logs' },
                { key: 'notes', label: 'Notes' },
                { key: 'quotations', label: 'Quotations' },
                { key: 'visits', label: 'Site Visits' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? 'border-gold text-gold' : 'border-transparent text-slate hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={() => setShowNoteModal(true)} className="px-3 py-2 text-xs text-gold hover:text-gold-light transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />Add Note
              </button>
            </div>

            <CardContent>
              {/* Activity Timeline */}
              {activeTab === 'activity' && (
                <div className="space-y-0">
                  {lead.activities?.length === 0 && <p className="text-sm text-slate text-center py-8">No activity yet</p>}
                  {lead.activities?.map((act: any, i: number) => (
                    <div key={act.id} className="flex gap-3 pb-4 relative">
                      {i < lead.activities.length - 1 && <div className="absolute left-[13px] top-7 bottom-0 w-px bg-navy-border" />}
                      <div className="w-7 h-7 rounded-full bg-navy border border-navy-border flex items-center justify-center flex-shrink-0 z-10">
                        {activityIcons[act.type] || <Activity className="w-3.5 h-3.5 text-slate" />}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-slate-light">{act.description}</p>
                        <p className="text-[10px] text-slate mt-0.5">{formatRelativeTime(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Call Logs */}
              {activeTab === 'calls' && (
                <div className="space-y-3">
                  {lead.callLogs?.length === 0 && <p className="text-sm text-slate text-center py-8">No calls logged yet</p>}
                  {lead.callLogs?.map((call: any) => (
                    <div key={call.id} className="bg-navy rounded-lg p-3 border border-navy-border">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-medium text-white">{call.outcome || 'Call logged'}</span>
                          {call.notes && <p className="text-xs text-slate mt-1">{call.notes}</p>}
                        </div>
                        <span className="text-[10px] text-slate">{formatRelativeTime(call.calledAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate">By: {call.user?.name}</span>
                        {call.duration && <span className="text-[10px] text-slate">Duration: {call.duration}s</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  {lead.notes?.length === 0 && <p className="text-sm text-slate text-center py-8">No notes yet</p>}
                  {lead.notes?.map((note: any) => (
                    <div key={note.id} className="bg-navy rounded-lg p-3 border border-navy-border">
                      <p className="text-sm text-slate-light">{note.content}</p>
                      <p className="text-[10px] text-slate mt-2">{formatDateTime(note.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quotations */}
              {activeTab === 'quotations' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate">{lead.quotations?.length || 0} quotations</span>
                    <Link href={`/quotations/new?leadId=${id}`}><Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}>New Quotation</Button></Link>
                  </div>
                  {lead.quotations?.map((q: any) => (
                    <Link key={q.id} href={`/quotations/${q.id}`}>
                      <div className="bg-navy rounded-lg p-3 border border-navy-border hover:border-gold/30 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white">{q.quotationNumber}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${q.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-navy-light text-slate'}`}>{q.status}</span>
                        </div>
                        <p className="text-sm text-gold font-medium mt-1">{formatCurrency(q.totalAmount)}</p>
                        <p className="text-[10px] text-slate mt-0.5">{formatDate(q.createdAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Site Visits */}
              {activeTab === 'visits' && (
                <div className="space-y-3">
                  {lead.siteVisits?.length === 0 && <p className="text-sm text-slate text-center py-8">No site visits scheduled</p>}
                  {lead.siteVisits?.map((v: any) => (
                    <div key={v.id} className="bg-navy rounded-lg p-3 border border-navy-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">{formatDateTime(v.scheduledAt)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {v.isCompleted ? 'Completed' : 'Scheduled'}
                        </span>
                      </div>
                      {v.feedback && <p className="text-xs text-slate mt-1">Feedback: {v.feedback}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Lead Status" size="sm">
        <form onSubmit={handleSubmit((d) => updateStatusMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">New Status</label>
            <select {...register('status')} defaultValue={lead.status} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Remarks</label>
            <textarea {...register('remarks')} rows={3} placeholder="Add remarks..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <Button type="submit" loading={updateStatusMutation.isPending} className="w-full">Update Status</Button>
        </form>
      </Modal>

      {/* Log Call Modal */}
      <Modal open={showCallModal} onClose={() => setShowCallModal(false)} title="Log Call" size="sm">
        <form onSubmit={handleSubmit((d) => addCallMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Call Outcome</label>
            <select {...register('outcome')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              <option value="">Select outcome</option>
              {['Connected', 'Not Answered', 'Busy', 'Wrong Number', 'Call Back Later', 'Interested', 'Not Interested'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Duration (seconds)</label>
            <input {...register('duration')} type="number" placeholder="Call duration in seconds" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Notes</label>
            <textarea {...register('notes')} rows={3} placeholder="Call notes..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <Button type="submit" loading={addCallMutation.isPending} className="w-full">Save Call Log</Button>
        </form>
      </Modal>

      {/* Add Note Modal */}
      <Modal open={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note" size="sm">
        <form onSubmit={handleSubmit((d) => addNoteMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Note</label>
            <textarea {...register('content', { required: true })} rows={4} placeholder="Write your note..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <Button type="submit" loading={addNoteMutation.isPending} className="w-full">Save Note</Button>
        </form>
      </Modal>

      {/* Send Email Modal */}
      <Modal open={showEmailModal} onClose={() => setShowEmailModal(false)} title="Send Project Details" size="sm">
        <form onSubmit={handleSubmit((d) => sendEmailMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">To Email</label>
            <input {...register('toEmail')} type="email" defaultValue={lead.email || ''} placeholder="recipient@email.com" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Template Type</label>
            <select {...register('templateType')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
              {['villa', 'apartment', 'plot', 'farmland', 'commercial'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-light mb-1.5">Custom Message (optional)</label>
            <textarea {...register('customMessage')} rows={3} placeholder="Add a personal message..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
          </div>
          <Button type="submit" icon={<Send className="w-3.5 h-3.5" />} loading={sendEmailMutation.isPending} className="w-full">Send Email</Button>
        </form>
      </Modal>
    </AppLayout>
  )
}

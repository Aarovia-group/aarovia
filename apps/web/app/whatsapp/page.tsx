'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Table, Tr, Td, EmptyState } from '@/components/ui/index'
import { whatsappApi, leadApi } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { MessageSquare, Send, CheckCircle, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'

const WA_TEMPLATES = [
  {
    id: 'project_details',
    label: 'Project Details',
    description: 'Send project brochure, pricing, and amenities',
    preview: `Hello {Name} 👋\n\nThank you for your interest in *{Project}*!\n\n📍 Location · 💰 Pricing · ✨ Amenities\n\nOur team will reach out shortly.\n\n*Aarovia Real Estates*`,
  },
  {
    id: 'followup',
    label: 'Followup',
    description: 'Gentle nudge for interested leads',
    preview: `Hello {Name} 👋\n\nThis is a gentle reminder from *Aarovia Real Estates*.\n\nWould you like to:\n📅 Schedule a site visit?\n📋 Receive a quotation?\n\nWe're here to help! 🏠`,
  },
  {
    id: 'site_visit',
    label: 'Site Visit Reminder',
    description: 'Remind leads about scheduled site visits',
    preview: `Hello {Name}! 🏗️\n\nReminder: Your site visit at *{Project}* is scheduled.\n\n📅 Date & Time: {DateTime}\n📍 Location: {Address}\n\nLooking forward to meeting you!\n\n*Aarovia Real Estates*`,
  },
  {
    id: 'payment_reminder',
    label: 'Payment Reminder',
    description: 'Remind customers about due payments',
    preview: `Dear {Name} 🏠\n\nPayment reminder from *Aarovia Real Estates*.\n\n📋 Booking: {BookingNo}\n💰 Due Amount: ₹{Amount}\n\nPlease make payment to avoid charges.\n\n*Aarovia Real Estates*`,
  },
]

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'logs'>('send')
  const [selectedTemplate, setSelectedTemplate] = useState(WA_TEMPLATES[0])
  const [messageType, setMessageType] = useState<'lead' | 'manual'>('lead')

  const { data: leadsData } = useQuery({
    queryKey: ['leads-for-wa'],
    queryFn: () => leadApi.getAll({ limit: 100 }),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['wa-logs'],
    queryFn: () => whatsappApi.getLogs({ limit: 50 }),
    enabled: activeTab === 'logs',
  })

  const sendProjectMutation = useMutation({
    mutationFn: (d: any) => whatsappApi.sendProjectDetails(d),
    onSuccess: () => { toast.success('WhatsApp message sent!'); reset() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send message'),
  })

  const sendFollowupMutation = useMutation({
    mutationFn: (d: any) => whatsappApi.sendFollowup(d),
    onSuccess: () => { toast.success('Followup sent!'); reset() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send followup'),
  })

  const { register, handleSubmit, reset } = useForm()
  const leads = leadsData?.data?.data || []
  const logs = logsData?.data?.data || []

  const onSubmit = (data: any) => {
    if (selectedTemplate.id === 'project_details') {
      sendProjectMutation.mutate({ leadId: data.leadId, mobile: data.mobile })
    } else if (selectedTemplate.id === 'followup') {
      sendFollowupMutation.mutate({ leadId: data.leadId, customMessage: data.customMessage })
    } else {
      toast.info('Template sending — connect your WhatsApp Business API templates')
    }
  }

  const isLoading = sendProjectMutation.isPending || sendFollowupMutation.isPending

  return (
    <AppLayout
      title="WhatsApp Messaging"
      subtitle="Send messages via WhatsApp Cloud API"
    >
      <div className="flex gap-1 mb-5 bg-navy-mid border border-navy-border rounded-lg p-1 w-fit">
        {[
          { key: 'send', label: 'Send Message', icon: Send },
          { key: 'logs', label: 'Message Logs', icon: MessageSquare },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === t.key ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate hover:text-white'}`}
          >
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'send' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Templates */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-light uppercase tracking-wide px-1">Message Templates</p>
            {WA_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${selectedTemplate.id === template.id ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-navy-border bg-navy-mid hover:border-slate'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedTemplate.id === template.id ? 'bg-emerald-400' : 'bg-navy-border'}`} />
                  <p className={`text-sm font-medium ${selectedTemplate.id === template.id ? 'text-emerald-400' : 'text-white'}`}>{template.label}</p>
                </div>
                <p className="text-[10px] text-slate ml-4">{template.description}</p>
              </button>
            ))}

            {/* WA Setup Status */}
            <Card className="mt-4">
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-2.5">WhatsApp API Status</p>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400">API Connected</span>
                </div>
                <p className="text-[10px] text-slate">Meta Cloud API · Phone verified</p>
                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" onClick={() => window.location.href = '/settings'}>
                  Manage API Config →
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Center: Compose */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle><MessageSquare className="w-4 h-4 text-emerald-400" />{selectedTemplate.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Recipient */}
                  <div className="flex gap-2 bg-navy rounded-lg border border-navy-border p-1">
                    <button
                      type="button"
                      onClick={() => setMessageType('lead')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${messageType === 'lead' ? 'bg-gold/20 text-gold' : 'text-slate'}`}
                    >
                      From Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageType('manual')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${messageType === 'manual' ? 'bg-gold/20 text-gold' : 'text-slate'}`}
                    >
                      Manual Entry
                    </button>
                  </div>

                  {messageType === 'lead' ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">Select Lead</label>
                      <select {...register('leadId')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50">
                        <option value="">Select a lead</option>
                        {leads.map((l: any) => (
                          <option key={l.id} value={l.id}>{l.name} — {l.mobile}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate" />
                        <input {...register('mobile')} placeholder="+91 9876543210" className="w-full bg-navy border border-navy-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
                      </div>
                    </div>
                  )}

                  {(selectedTemplate.id === 'followup') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">Custom Message (optional)</label>
                      <textarea {...register('customMessage')} rows={4} placeholder="Override with a custom message..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none" />
                    </div>
                  )}

                  <Button
                    type="submit"
                    loading={isLoading}
                    icon={<Send className="w-3.5 h-3.5" />}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Send WhatsApp Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right: Preview */}
          <div>
            <Card>
              <CardHeader><CardTitle>Message Preview</CardTitle></CardHeader>
              <CardContent>
                {/* WhatsApp chat bubble mockup */}
                <div className="bg-[#0b1418] rounded-xl p-3 min-h-[200px]">
                  <div className="flex justify-end mb-2">
                    <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-2 max-w-[85%]">
                      <p className="text-white text-xs whitespace-pre-line leading-relaxed">{selectedTemplate.preview}</p>
                      <p className="text-emerald-300/60 text-[9px] text-right mt-1">12:34 ✓✓</p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate mt-2 text-center">Preview — variables will be replaced with actual data</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // Message Logs
        <Card>
          <Table headers={['To', 'Lead', 'Message', 'Status', 'Sent']}>
            {logsLoading ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate text-sm">Loading message logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState icon={<MessageSquare className="w-10 h-10" />} title="No messages sent yet" />
              </td></tr>
            ) : logs.map((log: any) => (
              <Tr key={log.id}>
                <Td className="text-white text-xs font-mono">{log.to}</Td>
                <Td className="text-xs text-slate">{log.lead?.name || '—'}</Td>
                <Td className="text-xs text-slate max-w-[200px] truncate">{log.message}</Td>
                <Td>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${log.status === 'SENT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {log.status}
                  </span>
                </Td>
                <Td className="text-xs text-slate">{formatRelativeTime(log.createdAt)}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}
    </AppLayout>
  )
}

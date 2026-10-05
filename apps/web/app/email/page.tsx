'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Table, Tr, Td, EmptyState } from '@/components/ui/index'
import { emailApi, leadApi, uploadApi } from '@/lib/api'
import { formatRelativeTime, PROPERTY_TYPES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Mail, Send, CheckCircle, Eye, Clock, AlertCircle, Pencil, X } from 'lucide-react'
import { useForm } from 'react-hook-form'

type EmailFormValues = {
  toEmail: string
  toName: string
  leadId: string
  templateType: string
  customTemplateName: string
  templateIntro: string
  subject: string
  customMessage: string
  brochures: FileList
}

const TEMPLATE_PREVIEWS: Record<string, string> = {
  VILLA: 'Luxury villa with private garden, premium fittings, and world-class amenities...',
  APARTMENT: 'Modern apartments with stunning views, gymnasium, swimming pool, and 24/7 security...',
  PLOT: 'Prime plotted development in a gated community with excellent connectivity...',
  FARMLAND: 'Serene farmland plots with agricultural potential and eco-friendly surroundings...',
  COMMERCIAL: 'Grade-A commercial spaces with high foot traffic and excellent ROI potential...',
}

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<'compose' | 'logs'>('compose')
  const [selectedTemplate, setSelectedTemplate] = useState('APARTMENT')
  const [previewMode, setPreviewMode] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(false)

  const { data: leadsData } = useQuery({
    queryKey: ['leads-for-email'],
    queryFn: () => leadApi.getAll({ limit: 100, status: 'NEW' }),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => emailApi.getLogs({ limit: 50 }),
    enabled: activeTab === 'logs',
  })

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      const brochures = Array.from(data.brochures || []) as File[]
      if (brochures.length === 0) return emailApi.sendProjectDetails(data)

      const uploadedFiles = await Promise.all(brochures.map(async (brochure) => {
        const uploadResponse = await uploadApi.uploadDocument(brochure)
        const uploaded = uploadResponse.data?.data
        if (!uploaded?.url) throw new Error('File upload failed')
        return { url: uploaded.url, name: uploaded.name }
      }))

      return emailApi.sendProjectDetails({
        ...data,
        brochureUrl: uploadedFiles[0].url,
        attachments: uploadedFiles,
      })
    },
    onSuccess: () => {
      toast.success('Email sent successfully!')
      reset()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send email'),
  })

  const { register, handleSubmit, reset, watch } = useForm<EmailFormValues>({
    defaultValues: {
      toEmail: '',
      toName: '',
      leadId: '',
      templateType: 'APARTMENT',
      customTemplateName: '',
      templateIntro: '',
      subject: '',
      customMessage: '',
    } as EmailFormValues,
  })

  const watchedTemplate = watch('templateType') as string

  const leads = leadsData?.data?.data || []
  const logs = logsData?.data?.data || []

  const onSubmit = (data: any) => sendMutation.mutate(data)

  return (
    <AppLayout
      title="Email — Send Project Details"
      subtitle="Quick action email with project brochures and details"
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-navy-mid border border-navy-border rounded-lg p-1 w-full sm:w-fit overflow-x-auto scrollbar-hide">
        {[
          { key: 'compose', label: 'Compose & Send', icon: Send },
          { key: 'logs', label: 'Email History', icon: Mail },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === t.key ? 'bg-gold/20 text-gold' : 'text-slate hover:text-white'}`}
          >
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Compose Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle><Send className="w-4 h-4 text-gold" />Recipient Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <select
                        {...register('leadId')}
                        className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
                      >
                        <option value="">Manual entry below</option>
                        {leads.map((l: any) => (
                          <option key={l.id} value={l.id}>{l.name} — {l.mobile}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">Recipient Name</label>
                      <input
                        {...register('toName')}
                        placeholder="Recipient name"
                        className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-light mb-1.5">Email Address *</label>
                      <input
                        {...register('toEmail', { required: true })}
                        type="email"
                        placeholder="recipient@email.com"
                        className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle><Mail className="w-4 h-4 text-gold" />Template Selection</CardTitle>
                    <button type="button" onClick={() => setEditingTemplate(!editingTemplate)} className="flex items-center gap-1.5 text-xs text-gold hover:text-white">
                      {editingTemplate ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      {editingTemplate ? 'Close Editor' : 'Edit Template'}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {PROPERTY_TYPES.map(pt => (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(pt.value)
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${watchedTemplate === pt.value || selectedTemplate === pt.value ? 'bg-gold/20 text-gold border-gold/40' : 'bg-navy border-navy-border text-slate hover:text-white hover:border-slate'}`}
                      >
                        {pt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('CUSTOM')}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${selectedTemplate === 'CUSTOM' ? 'bg-gold/20 text-gold border-gold/40' : 'bg-navy border-navy-border text-slate hover:text-white hover:border-slate'}`}
                    >
                      Custom
                    </button>
                  </div>
                  <input type="hidden" {...register('templateType')} value={selectedTemplate} />

                  {editingTemplate && (
                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gold/30 bg-gold/5 p-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Template Name</label>
                        <input {...register('customTemplateName')} placeholder={`${selectedTemplate.toLowerCase()} project details`} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Template Introduction</label>
                        <textarea {...register('templateIntro')} rows={3} placeholder="Write the introduction that should appear in the email..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
                      </div>
                    </div>
                  )}

                  <div className="bg-navy rounded-lg border border-navy-border p-4">
                    <p className="text-[10px] text-slate uppercase tracking-wide mb-2">Template Preview</p>
                    <p className="text-xs text-slate-light leading-relaxed">{TEMPLATE_PREVIEWS[selectedTemplate] || TEMPLATE_PREVIEWS.APARTMENT}</p>
                    <div className="flex gap-3 mt-3 text-[10px] text-slate">
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />Project images</span>
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />Pricing</span>
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />Amenities</span>
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />Location map</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
                    <label className="block text-xs font-medium text-gold mb-1.5">Attach Files (optional)</label>
                    <input
                      {...register('brochures')}
                      type="file"
                      multiple
                      accept="application/pdf,.doc,.docx,.xls,.xlsx,image/*"
                      className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate file:mr-3 file:rounded-md file:border-0 file:bg-gold/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gold hover:file:bg-gold/30"
                    />
                    <p className="text-[10px] text-slate mt-1.5">Attach brochures, PDFs, or images. Each file can be up to 10MB.</p>
                  </div>
                  <div>
                    {selectedTemplate === 'CUSTOM' && (
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Custom Template Name</label>
                        <input
                          {...register('customTemplateName')}
                          placeholder="Your project announcement"
                          className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                        />
                      </div>
                    )}
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Custom Subject (optional)</label>
                    <input
                      {...register('subject')}
                      placeholder="Project details from Aarovia Real Estates"
                      className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Custom Message (optional)</label>
                    <textarea
                      {...register('customMessage')}
                      rows={4}
                      placeholder="Add a personalised message to the email..."
                      className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full"
                loading={sendMutation.isPending}
                icon={<Send className="w-4 h-4" />}
              >
                Send Project Details Email
              </Button>
            </form>
          </div>

          {/* Right: Tips */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Email Tips</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { tip: 'Always personalise with the recipient\'s name for better open rates.', icon: '👤' },
                  { tip: 'Send between 10 AM – 12 PM or 4 PM – 6 PM for higher engagement.', icon: '⏰' },
                  { tip: 'Follow up with a WhatsApp message 2 hours after the email.', icon: '💬' },
                  { tip: 'Include a specific CTA like "Reply to schedule a site visit".', icon: '📅' },
                  { tip: 'Track opens – if not opened in 24h, call the lead directly.', icon: '📞' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5 text-xs">
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <p className="text-slate leading-relaxed">{item.tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Zoho SMTP Status</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 text-xs">Connected & Active</span>
                </div>
                <p className="text-[10px] text-slate mt-2">Configured via Zoho SMTP</p>
                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" onClick={() => window.location.href = '/settings'}>
                  Configure SMTP →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // Email Logs
        <Card>
          <Table headers={['Recipient', 'Lead', 'Subject', 'Status', 'Opened', 'Sent']}>
            {logsLoading ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate text-sm">Loading email logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState icon={<Mail className="w-10 h-10" />} title="No emails sent yet" description="Send your first project details email to see logs here." />
              </td></tr>
            ) : logs.map((log: any) => (
              <Tr key={log.id}>
                <Td className="text-white text-xs">{log.to}</Td>
                <Td className="text-xs text-slate">{log.lead?.name || '—'}</Td>
                <Td className="text-xs text-slate-light max-w-[200px] truncate">{log.subject}</Td>
                <Td>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${log.status === 'SENT' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                    {log.status}
                  </span>
                </Td>
                <Td>
                  {log.openedAt
                    ? <span className="text-[10px] flex items-center gap-1 text-green-400"><Eye className="w-3 h-3" />{formatRelativeTime(log.openedAt)}</span>
                    : <span className="text-[10px] text-slate flex items-center gap-1"><Clock className="w-3 h-3" />Not opened</span>
                  }
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

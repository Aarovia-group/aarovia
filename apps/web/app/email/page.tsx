'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Table, Tr, Td, EmptyState } from '@/components/ui/index'
import { emailApi, leadApi, uploadApi } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Mail, Send, Eye, Clock, Pencil, X, Trash2, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/lib/store/auth.store'

type EmailFormValues = {
  toEmail: string
  toName: string
  leadId: string
  templateId: string
  templateType: string
  customTemplateName: string
  templateIntro: string
  subject: string
  customMessage: string
  brochures: FileList
}

type EmailTemplate = {
  id: string
  name: string
  subject: string
  body: string
  propertyType: string | null
}

type TemplateDraft = {
  name: string
  subject: string
  body: string
  propertyType: string
}

export default function EmailPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'compose' | 'logs'>('compose')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null)
  const [templateDraftId, setTemplateDraftId] = useState<string | null>(null)
  const canManageTemplates = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const { register, handleSubmit, reset, watch, setValue } = useForm<EmailFormValues>({
    defaultValues: {
      toEmail: '',
      toName: '',
      leadId: '',
      templateId: '',
      templateType: 'APARTMENT',
      customTemplateName: '',
      templateIntro: '',
      subject: '',
      customMessage: '',
    } as EmailFormValues,
  })

  const { data: leadsData } = useQuery({
    queryKey: ['leads-for-email'],
    queryFn: () => leadApi.getAll({ limit: 100, status: 'NEW' }),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => emailApi.getLogs({ limit: 50 }),
    enabled: activeTab === 'logs',
  })
  const { data: templatesData, isLoading: templatesLoading, isError: templatesError } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailApi.getTemplates(),
  })
  const templates: EmailTemplate[] = templatesData?.data?.data || []

  const selectTemplate = useCallback((template: EmailTemplate) => {
    setSelectedTemplateId(template.id)
    setValue('templateId', template.id)
    setValue('templateType', template.propertyType || 'CUSTOM')
    setValue('customTemplateName', '')
    setValue('subject', template.subject)
    setValue('templateIntro', '')
  }, [setValue])

  const refreshTemplates = (template?: EmailTemplate) => {
    queryClient.invalidateQueries({ queryKey: ['email-templates'] })
    if (template) {
      selectTemplate(template)
      setTemplateDraft(null)
      setTemplateDraftId(null)
      toast.success('Email template saved')
    }
  }

  const createTemplateMutation = useMutation({
    mutationFn: (draft: TemplateDraft) => emailApi.createTemplate({
      ...draft,
      propertyType: draft.propertyType || null,
    }),
    onSuccess: (response) => refreshTemplates(response.data?.data),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create email template'),
  })
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: TemplateDraft }) => emailApi.updateTemplate(id, {
      ...draft,
      propertyType: draft.propertyType || null,
    }),
    onSuccess: (response) => refreshTemplates(response.data?.data),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update email template'),
  })
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => emailApi.deleteTemplate(id),
    onSuccess: () => {
      setSelectedTemplateId('')
      setValue('templateId', '')
      setValue('templateType', 'CUSTOM')
      setValue('customTemplateName', '')
      setValue('subject', '')
      setTemplateDraft(null)
      setTemplateDraftId(null)
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      toast.success('Email template deleted')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete email template'),
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
      if (selectedTemplate) selectTemplate(selectedTemplate)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send email'),
  })

  const watchedTemplate = watch('templateType') as string
  const watchedSubject = watch('subject')
  const watchedMessage = watch('customMessage')
  const watchedTemplateName = watch('customTemplateName')
  const selectedTemplate = templates.find(template => template.id === selectedTemplateId)

  const leads = leadsData?.data?.data || []
  const logs = logsData?.data?.data || []
  const previewSubject = templateDraft
    ? templateDraft.subject.replace(/{{\s*projectName\s*}}/gi, 'Project name')
    : watchedSubject?.trim() || `${watchedTemplateName?.trim() || 'Premium Property'} - Project Details from Aarovia Real Estates`
  const previewBody = (templateDraft?.body || selectedTemplate?.body || '')
    .replace(/{{\s*leadName\s*}}/gi, watch('toName') || 'Recipient name')
    .replace(/{{\s*projectName\s*}}/gi, watchedTemplateName || 'Project name')
    .replace(/{{\s*customMessage\s*}}/gi, watchedMessage || 'Custom message')
    .replace(/{{\s*location\s*}}/gi, 'Project location')
    .replace(/{{\s*city\s*}}/gi, 'City')

  const removeSelectedTemplate = () => {
    if (!selectedTemplate) return
    if (window.confirm(`Delete the "${selectedTemplate.name}" email template? This cannot be undone.`)) {
      deleteTemplateMutation.mutate(selectedTemplate.id)
    }
  }

  useEffect(() => {
    if (templatesLoading || templatesError || !templates.length) return
    const activeTemplate = templates.find(template => template.id === selectedTemplateId)
    if (!activeTemplate) selectTemplate(templates[0])
  }, [templates, templatesLoading, templatesError, selectedTemplateId, selectTemplate])

  const startTemplateEdit = (template?: EmailTemplate) => {
    setTemplateDraftId(template?.id || null)
    setTemplateDraft(template
      ? {
          name: template.name,
          subject: template.subject,
          body: template.body,
          propertyType: template.propertyType || '',
        }
      : { name: '', subject: '', body: '', propertyType: '' })
  }

  const saveTemplateDraft = () => {
    if (!templateDraft) return
    if (templateDraftId) {
      updateTemplateMutation.mutate({ id: templateDraftId, draft: templateDraft })
    } else {
      createTemplateMutation.mutate(templateDraft)
    }
  }

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
                    {canManageTemplates && (
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => startTemplateEdit()} className="flex items-center gap-1.5 text-xs text-gold hover:text-white">
                          <Plus className="w-3.5 h-3.5" />New Template
                        </button>
                        <button type="button" disabled={!selectedTemplate} onClick={() => selectedTemplate && startTemplateEdit(selectedTemplate)} className="flex items-center gap-1.5 text-xs text-gold hover:text-white disabled:opacity-40">
                          <Pencil className="w-3.5 h-3.5" />Edit
                        </button>
                        <button type="button" disabled={!selectedTemplate || deleteTemplateMutation.isPending} onClick={removeSelectedTemplate} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />Delete
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {templatesError && <p className="text-xs text-red-400">Could not load email templates. Refresh the page or contact an administrator.</p>}
                  {templatesLoading && <p className="text-xs text-slate">Loading email templates...</p>}
                  {!templatesLoading && !templatesError && templates.length === 0 && (
                    <p className="text-xs text-slate">No email templates are available. An administrator can create one.</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => selectTemplate(template)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${selectedTemplateId === template.id ? 'bg-gold/20 text-gold border-gold/40' : 'bg-navy border-navy-border text-slate hover:text-white hover:border-slate'}`}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" {...register('templateType')} />
                  <input type="hidden" {...register('templateId')} />

                  {templateDraft && canManageTemplates && (
                    <div className="space-y-3 rounded-lg border border-gold/30 bg-gold/5 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white">{templateDraftId ? 'Edit Email Template' : 'Create Email Template'}</h3>
                        <button type="button" aria-label="Close template editor" onClick={() => { setTemplateDraft(null); setTemplateDraftId(null) }} className="text-slate hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Template Name</label>
                        <input value={templateDraft.name} onChange={event => setTemplateDraft({ ...templateDraft, name: event.target.value })} maxLength={120} required placeholder="Template name" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Property Type</label>
                        <select value={templateDraft.propertyType} onChange={event => setTemplateDraft({ ...templateDraft, propertyType: event.target.value })} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
                          <option value="">Custom / no property type</option>
                          {['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL'].map(type => <option key={type} value={type}>{type === 'FARMLAND' ? 'Farm Land' : type.charAt(0) + type.slice(1).toLowerCase()}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Email Subject</label>
                        <input value={templateDraft.subject} onChange={event => setTemplateDraft({ ...templateDraft, subject: event.target.value })} maxLength={300} required placeholder="Use {{projectName}} to insert the project name" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Email Body</label>
                        <textarea value={templateDraft.body} onChange={event => setTemplateDraft({ ...templateDraft, body: event.target.value })} maxLength={12000} required rows={6} placeholder="Write the full editable email body. Use {{leadName}}, {{projectName}}, {{location}}, {{city}}, and {{customMessage}} as placeholders." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-y" />
                        <p className="text-[10px] text-slate mt-1">Available placeholders: {'{{leadName}}'}, {'{{projectName}}'}, {'{{location}}'}, {'{{city}}'}, {'{{customMessage}}'}.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending} loading={createTemplateMutation.isPending || updateTemplateMutation.isPending} onClick={saveTemplateDraft}>
                          {templateDraftId ? 'Save Template' : 'Create Template'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => { setTemplateDraft(null); setTemplateDraftId(null) }}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-navy rounded-lg border border-navy-border p-4">
                    <p className="text-[10px] text-slate uppercase tracking-wide mb-2">Template Preview</p>
                    <p className="text-xs text-gold mb-2"><span className="text-slate">Subject: </span>{previewSubject}</p>
                    <p className="text-xs text-slate-light leading-relaxed whitespace-pre-line">{previewBody || 'Select a template to preview its email body.'}</p>
                    {watchedMessage?.trim() && <p className="text-xs text-slate-light leading-relaxed mt-2">{watchedMessage}</p>}
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
                    {watchedTemplate === 'CUSTOM' && (
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

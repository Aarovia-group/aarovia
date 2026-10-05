'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Textarea, Modal } from '@/components/ui/index'
import { FileUploadZone } from '@/components/shared'
import { toast } from '@/components/ui/toaster'
import { Settings, Mail, MessageSquare, Smartphone, Building2, Shield, User, Palette, Save, Eye, EyeOff, CheckCircle, Pencil, Trash2, RotateCcw, Megaphone, PhoneCall } from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth.store'
import { useForm } from 'react-hook-form'
import api, { projectApi } from '@/lib/api'

type ProfileFormValues = { name: string; phone: string }
type PasswordFormValues = { currentPassword: string; newPassword: string; confirmPassword: string }
type EmailFormValues = { smtpUser: string; smtpPassword: string; fromName: string }
type WAFormValues = { phoneId: string; accessToken: string; businessId: string; templateName: string; allowRawText: boolean }
type TwilioWAFormValues = { accountSid: string; authToken: string; apiKeySid: string; apiKeySecret: string; phoneNumber: string; templateSid: string }
type SmsFormValues = { accountSid: string; authToken: string; apiKeySid: string; apiKeySecret: string; phoneNumber: string; messagingServiceSid: string }
type VoiceFormValues = { apiToken: string; agentNumber: string; url: string; tokenField: string; tokenPrefix: string; agentField: string; customerField: string; didField: string; refurlField: string; refurl: string; incomingRoutesText: string; outgoingDidsText: string }
type AdsFormValues = {
  metaAppId: string; metaAppSecret: string; metaLeadVerifyToken: string; metaLeadAccessToken: string; metaAdsAccessToken: string; metaAdAccountId: string
  googleLeadWebhookKey: string; googleAdsClientId: string; googleAdsClientSecret: string; googleAdsRefreshToken: string
  googleAdsDeveloperToken: string; googleAdsCustomerId: string; googleAdsLoginCustomerId: string
}
type BrandingFormValues = { companyName: string; domain: string; accentColor: string }
type ProjectFormValues = { name: string; location: string; city: string; state: string; description: string; reraNumber: string }

const TABS = [
  { key: 'profile', label: 'My Profile', icon: User },
  { key: 'email', label: 'Email Config', icon: Mail },
  { key: 'whatsapp', label: 'Meta WhatsApp API', icon: MessageSquare },
  { key: 'twilio-whatsapp', label: 'Twilio WhatsApp', icon: MessageSquare },
  { key: 'sms', label: 'SMS (Twilio)', icon: Smartphone },
  { key: 'voice', label: 'Call API', icon: PhoneCall },
  { key: 'ads', label: 'Meta & Google Ads', icon: Megaphone },
  { key: 'projects', label: 'Projects', icon: Building2 },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'branding', label: 'Branding', icon: Palette },
]

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [showPass, setShowPass] = useState(false)
  const [testEmailSent, setTestEmailSent] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ProfileFormValues>({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' } as ProfileFormValues,
  })

  const { register: regPw, handleSubmit: handlePw } = useForm<PasswordFormValues>()
  const { register: regEmail, handleSubmit: handleEmail } = useForm<EmailFormValues>()
  const { register: regWA, handleSubmit: handleWA, reset: resetWA } = useForm<WAFormValues>()
  const { register: regTwilioWA, handleSubmit: handleTwilioWA, reset: resetTwilioWA } = useForm<TwilioWAFormValues>()
  const { register: regSms, handleSubmit: handleSms, reset: resetSms } = useForm<SmsFormValues>()
  const { register: regVoice, handleSubmit: handleVoice, reset: resetVoice } = useForm<VoiceFormValues>()
  const { register: regAds, handleSubmit: handleAds, reset: resetAds } = useForm<AdsFormValues>()
  const { register: regBranding, handleSubmit: handleBranding, setValue: setBrandingValue, watch: watchBranding } = useForm<BrandingFormValues>({
    defaultValues: { companyName: 'Aarovia Real Estates', domain: 'aarovia.co.in', accentColor: '#C9A84C' },
  })
  const { register: regProject, handleSubmit: handleProject, reset: resetProject } = useForm<ProjectFormValues>()
  const { data: projectsData, isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll(),
    enabled: activeTab === 'projects',
  })
  const { data: adsSettingsData } = useQuery({
    queryKey: ['ads-settings'],
    queryFn: () => api.get('/settings/ads'),
    enabled: activeTab === 'ads',
  })
  const { data: waSettingsData } = useQuery({
    queryKey: ['whatsapp-settings'],
    queryFn: () => api.get('/settings/whatsapp'),
    enabled: activeTab === 'whatsapp',
  })
  const { data: twilioWhatsAppSettingsData } = useQuery({
    queryKey: ['twilio-whatsapp-settings'],
    queryFn: () => api.get('/settings/whatsapp/twilio'),
    enabled: activeTab === 'twilio-whatsapp',
  })
  const { data: smsSettingsData } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: () => api.get('/settings/sms/twilio'),
    enabled: activeTab === 'sms',
  })
  const { data: voiceSettingsData } = useQuery({
    queryKey: ['voice-settings'],
    queryFn: () => api.get('/settings/voice'),
    enabled: activeTab === 'voice',
  })

  const [hasSavedWAToken, setHasSavedWAToken] = useState(false)
  const [hasSavedTwilioAuthToken, setHasSavedTwilioAuthToken] = useState(false)
  const [hasSavedTwilioApiKeySecret, setHasSavedTwilioApiKeySecret] = useState(false)
  const [hasSavedSmsAuthToken, setHasSavedSmsAuthToken] = useState(false)
  const [hasSavedSmsApiKeySecret, setHasSavedSmsApiKeySecret] = useState(false)
  const [hasSavedVoiceToken, setHasSavedVoiceToken] = useState(false)

  useEffect(() => {
    const settings = waSettingsData?.data?.data
    if (!settings) return
    setHasSavedWAToken(Boolean(settings.hasAccessToken))
    resetWA({
      phoneId: settings.phoneId || '',
      accessToken: '',
      businessId: settings.businessId || '',
      templateName: settings.templateName || '',
      allowRawText: Boolean(settings.allowRawText),
    })
  }, [waSettingsData, resetWA])

  useEffect(() => {
    const settings = twilioWhatsAppSettingsData?.data?.data
    if (!settings) return
    setHasSavedTwilioAuthToken(Boolean(settings.authTokenConfigured))
    setHasSavedTwilioApiKeySecret(Boolean(settings.apiKeySecretConfigured))
    resetTwilioWA({
      accountSid: settings.accountSid || '',
      authToken: '',
      apiKeySid: settings.apiKeySid || '',
      apiKeySecret: '',
      phoneNumber: settings.phoneNumber || '',
      templateSid: settings.templateSid || '',
    })
  }, [twilioWhatsAppSettingsData, resetTwilioWA])

  useEffect(() => {
    const settings = smsSettingsData?.data?.data
    if (!settings) return
    setHasSavedSmsAuthToken(Boolean(settings.authTokenConfigured))
    setHasSavedSmsApiKeySecret(Boolean(settings.apiKeySecretConfigured))
    resetSms({
      accountSid: settings.accountSid || '',
      authToken: '',
      apiKeySid: settings.apiKeySid || '',
      apiKeySecret: '',
      phoneNumber: settings.phoneNumber || '',
      messagingServiceSid: settings.messagingServiceSid || '',
    })
  }, [smsSettingsData, resetSms])

  useEffect(() => {
    const settings = voiceSettingsData?.data?.data
    if (!settings) return
    setHasSavedVoiceToken(Boolean(settings.hasApiToken))
    resetVoice({
      apiToken: '',
      agentNumber: settings.agentNumber || '',
      url: settings.url || '',
      tokenField: settings.tokenField || '',
      tokenPrefix: settings.tokenPrefix || '',
      agentField: settings.agentField || '',
      customerField: settings.customerField || '',
      didField: settings.didField || 'did',
      refurlField: settings.refurlField || '',
      refurl: settings.refurl || '',
      incomingRoutesText: Array.isArray(settings.incomingRoutes)
        ? settings.incomingRoutes.map((route: { incomingNumber: string; agentPhone: string; agentName: string }) =>
          `${route.incomingNumber}, ${route.agentPhone}, ${route.agentName}`,
        ).join('\n')
        : '',
      outgoingDidsText: Array.isArray(settings.outgoingDids)
        ? settings.outgoingDids.map((route: { agentName: string; outgoingDid: string }) => `${route.agentName}, ${route.outgoingDid}`).join('\n')
        : '',
    })
  }, [voiceSettingsData, resetVoice])

  useEffect(() => {
    const settings = adsSettingsData?.data?.data
    if (!settings) return
    resetAds({
      metaAppId: settings.meta_app_id || '',
      metaAppSecret: settings.meta_app_secret || '',
      metaLeadVerifyToken: settings.meta_lead_verify_token || '',
      metaLeadAccessToken: settings.meta_lead_access_token || '',
      metaAdsAccessToken: settings.meta_ads_access_token || '',
      metaAdAccountId: settings.meta_ad_account_id || '',
      googleLeadWebhookKey: settings.google_lead_webhook_key || '',
      googleAdsClientId: settings.google_ads_client_id || '',
      googleAdsClientSecret: settings.google_ads_client_secret || '',
      googleAdsRefreshToken: settings.google_ads_refresh_token || '',
      googleAdsDeveloperToken: settings.google_ads_developer_token || '',
      googleAdsCustomerId: settings.google_ads_customer_id || '',
      googleAdsLoginCustomerId: settings.google_ads_login_customer_id || '',
    })
  }, [adsSettingsData, resetAds])
  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectFormValues) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowProjectForm(false)
      resetProject()
      toast.success('Project created successfully')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create project'),
  })
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectFormValues }) => projectApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowProjectForm(false)
      setEditingProject(null)
      resetProject()
      toast.success('Project updated successfully')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update project'),
  })
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project deactivated successfully')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to deactivate project'),
  })
  const restoreProjectMutation = useMutation({
    mutationFn: (id: string) => projectApi.update(id, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project reactivated successfully')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to reactivate project'),
  })

  const onProfileSave = async (data: any) => {
    try {
      const res = await api.put('/auth/profile', data)
      updateUser(res.data.data)
      toast.success('Profile updated successfully')
    } catch { toast.error('Failed to update profile') }
  }

  const onPasswordChange = async (data: any) => {
    try {
      await api.put('/auth/change-password', data)
      toast.success('Password changed successfully')
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to change password') }
  }

  const onEmailSave = async (data: any) => {
    try {
      await api.post('/settings/email', data)
      toast.success('Email configuration saved')
    } catch { toast.error('Failed to save email config') }
  }

  const onWASave = async (data: any) => {
    try {
      const response = await api.post('/settings/whatsapp', data)
      setHasSavedWAToken(Boolean(response.data?.data?.hasAccessToken))
      resetWA({ ...data, accessToken: '' })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] })
      toast.success('Meta WhatsApp API settings saved and selected')
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to save Meta WhatsApp API settings') }
  }

  const onTwilioWhatsAppSave = async (data: TwilioWAFormValues) => {
    try {
      await api.post('/settings/whatsapp/twilio', data)
      resetTwilioWA({ ...data, authToken: '', apiKeySecret: '' })
      queryClient.invalidateQueries({ queryKey: ['twilio-whatsapp-settings'] })
      toast.success('Twilio WhatsApp settings saved and selected')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save Twilio WhatsApp settings')
    }
  }

  const onSmsSave = async (data: SmsFormValues) => {
    try {
      await api.post('/settings/sms/twilio', data)
      resetSms({ ...data, authToken: '', apiKeySecret: '' })
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] })
      toast.success('Twilio SMS settings saved')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save Twilio SMS settings')
    }
  }

  const onVoiceSave = async (data: VoiceFormValues) => {
    try {
      const incomingRoutes = data.incomingRoutesText.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
        const [incomingNumber, agentPhone, ...agentNameParts] = line.split(',').map(value => value.trim())
        const agentName = agentNameParts.join(', ')
        if (!incomingNumber || !agentPhone || !agentName) {
          throw new Error(`Routing line ${index + 1} must be: incoming number, agent phone, CRM agent name`)
        }
        return { incomingNumber, agentPhone, agentName }
      })
      const outgoingDids = data.outgoingDidsText.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
        const [agentName, outgoingDid] = line.split(',').map(value => value.trim())
        if (!agentName || !outgoingDid) {
          throw new Error(`Outgoing DID line ${index + 1} must be: CRM agent name, outgoing DID`)
        }
        return { agentName, outgoingDid }
      })
      const response = await api.post('/settings/voice', { ...data, incomingRoutes, outgoingDids })
      setHasSavedVoiceToken(Boolean(response.data?.data?.hasApiToken))
      resetVoice({ ...data, apiToken: '' })
      queryClient.invalidateQueries({ queryKey: ['voice-settings'] })
      toast.success('Call API settings saved')
    } catch (error: any) {
      toast.error(error.message || error.response?.data?.message || 'Failed to save call API settings')
    }
  }

  const onAdsSave = async (data: AdsFormValues) => {
    try {
      await api.post('/settings/ads', {
        meta_app_id: data.metaAppId,
        meta_app_secret: data.metaAppSecret,
        meta_lead_verify_token: data.metaLeadVerifyToken,
        meta_lead_access_token: data.metaLeadAccessToken,
        meta_ads_access_token: data.metaAdsAccessToken,
        meta_ad_account_id: data.metaAdAccountId,
        google_lead_webhook_key: data.googleLeadWebhookKey,
        google_ads_client_id: data.googleAdsClientId,
        google_ads_client_secret: data.googleAdsClientSecret,
        google_ads_refresh_token: data.googleAdsRefreshToken,
        google_ads_developer_token: data.googleAdsDeveloperToken,
        google_ads_customer_id: data.googleAdsCustomerId,
        google_ads_login_customer_id: data.googleAdsLoginCustomerId,
      })
      queryClient.invalidateQueries({ queryKey: ['ads-settings'] })
      toast.success('Ads credentials saved and integrations activated')
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to save Ads credentials') }
  }

  const connectAds = async (provider: 'meta' | 'google') => {
    try {
      const response = await api.get(`/ad-integrations/${provider}/connect`)
      window.location.href = response.data.data.url
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Unable to connect ${provider === 'meta' ? 'Meta' : 'Google Ads'}`)
    }
  }

  const sendTestEmail = async () => {
    try {
      await api.post('/email/send-project-details', { toEmail: user?.email, templateType: 'villa' })
      setTestEmailSent(true)
      toast.success('Test email sent to ' + user?.email)
    } catch { toast.error('Test email failed') }
  }

  const uploadLogo = async (file: File) => {
    try {
      setLogoUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/upload/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setLogoUrl(res.data.data.url)
      window.dispatchEvent(new CustomEvent('branding-updated', { detail: { logoUrl: res.data.data.url } }))
      toast.success('Logo uploaded')
    } catch (e: any) { toast.error(e.response?.data?.message || 'Logo upload failed') }
    finally { setLogoUploading(false) }
  }

  const onBrandingSave = async (data: BrandingFormValues) => {
    try {
      await api.post('/settings/branding', { ...data, logoUrl })
      window.dispatchEvent(new CustomEvent('branding-updated', { detail: { logoUrl, accentColor: data.accentColor } }))
      toast.success('Branding saved successfully')
    } catch { toast.error('Failed to save branding') }
  }

  return (
    <AppLayout title="Settings" subtitle="Configure your CRM preferences and integrations">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar nav */}
        <div className="w-full max-w-[220px] flex-shrink-0">
          <Card>
            <CardContent className="p-1.5">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeTab === tab.key ? 'bg-gold/15 text-gold font-medium' : 'text-slate hover:text-white hover:bg-navy-light'}`}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Profile */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle><User className="w-4 h-4 text-gold" />My Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-navy-border">
                  <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center text-navy text-xl font-bold">
                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">{user?.name}</p>
                    <p className="text-sm text-slate">{user?.email}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-medium mt-1 inline-block">
                      {user?.role?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <form onSubmit={handleSubmit(onProfileSave)} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Full Name</label>
                    <input {...register('name')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Phone Number</label>
                    <input {...register('phone')} placeholder="+91 XXXXX XXXXX" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Email (read-only)</label>
                    <input value={user?.email || ''} disabled className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate opacity-60 cursor-not-allowed" />
                  </div>
                  <Button type="submit" loading={isSubmitting} icon={<Save className="w-3.5 h-3.5" />}>Save Profile</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Email Config */}
          {activeTab === 'email' && (
            <Card>
              <CardHeader>
                <CardTitle><Mail className="w-4 h-4 text-gold" />Zoho SMTP Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 mb-5 text-xs text-blue-400">
                  <strong>Setup:</strong> Use your Zoho mailbox credentials. Server: smtppro.zoho.in, port 587, secured with TLS.
                </div>
                <form onSubmit={handleEmail(onEmailSave)} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Zoho Email Address</label>
                    <input {...regEmail('smtpUser')} type="email" placeholder="connect@aaroviagroup.com" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Zoho Mail Password</label>
                    <div className="relative">
                      <input {...regEmail('smtpPassword')} type={showPass ? 'text' : 'password'} placeholder="Enter Zoho mailbox password" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 font-mono" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-white">
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">From Name</label>
                    <input {...regEmail('fromName')} placeholder="Aarovia Real Estates" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save Config</Button>
                    <Button
                      type="button"
                      variant="secondary"
                      icon={testEmailSent ? <CheckCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      onClick={sendTestEmail}
                    >
                      {testEmailSent ? 'Test Sent!' : 'Send Test Email'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* WhatsApp Config */}
          {activeTab === 'whatsapp' && (
            <Card>
              <CardHeader>
                <CardTitle><MessageSquare className="w-4 h-4 text-gold" />Meta WhatsApp API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-lg border px-4 py-3 mb-5 text-xs ${waSettingsData?.data?.data?.configured && waSettingsData?.data?.data?.provider === 'META' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                  {waSettingsData?.data?.data?.configured
                    ? waSettingsData?.data?.data?.provider === 'META'
                      ? 'Meta WhatsApp API is configured and selected. Secret values are never displayed.'
                      : `Meta credentials are configured, but ${waSettingsData?.data?.data?.provider || 'another provider'} is selected.`
                    : 'Add a Meta Phone Number ID and Access Token to configure this sender.'}
                </div>
                {waSettingsData?.data?.data?.providerLocked && (
                  <p className="text-xs text-amber-300 mb-4">The active provider is locked to {waSettingsData?.data?.data?.provider} by the WHATSAPP_PROVIDER environment variable.</p>
                )}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mb-5 text-xs text-emerald-400">
                  <strong>Setup:</strong> Create a Meta Developer account → Create App → Add WhatsApp product → Get Phone Number ID and Access Token.
                </div>
                <form onSubmit={handleWA(onWASave)} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">WhatsApp Phone Number ID</label>
                    <input {...regWA('phoneId')} placeholder="From Meta Developer Console" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Access Token</label>
                    <input {...regWA('accessToken')} type="password" autoComplete="new-password" placeholder={hasSavedWAToken ? '******** (saved; blank keeps current token)' : 'EAAxxxxxx...'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Business Account ID</label>
                    <input {...regWA('businessId')} placeholder="WABA ID" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Approved WhatsApp Template Name / SID</label>
                    <input {...regWA('templateName')} placeholder="hello_world or HX123..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <label className="flex items-center gap-3 text-sm text-slate-light">
                    <input type="checkbox" {...regWA('allowRawText')} className="h-4 w-4 rounded border-navy-border bg-navy" />
                    Allow raw WhatsApp text only for opted-in recipients
                  </label>
                  <Button type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save Meta WhatsApp API Settings</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Twilio WhatsApp Config */}
          {activeTab === 'twilio-whatsapp' && (
            <Card>
              <CardHeader>
                <CardTitle><MessageSquare className="w-4 h-4 text-gold" />Twilio WhatsApp Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-lg border px-4 py-3 mb-5 text-xs ${twilioWhatsAppSettingsData?.data?.data?.configured ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                  {twilioWhatsAppSettingsData?.data?.data?.configured
                    ? `${twilioWhatsAppSettingsData?.data?.data?.provider === 'TWILIO' ? 'Twilio WhatsApp is configured and selected.' : `Twilio credentials are configured, but ${twilioWhatsAppSettingsData?.data?.data?.provider || 'another provider'} is selected.`} Secret values are never displayed.`
                    : 'Add Twilio credentials and an approved WhatsApp Content Template SID to configure this sender.'}
                </div>
                {twilioWhatsAppSettingsData?.data?.data?.providerLocked && (
                  <p className="text-xs text-amber-300 mb-4">The active provider is locked to {twilioWhatsAppSettingsData?.data?.data?.provider} by the WHATSAPP_PROVIDER environment variable.</p>
                )}
                <form onSubmit={handleTwilioWA(onTwilioWhatsAppSave)} className="space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Twilio WhatsApp Credentials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Account SID</label><input {...regTwilioWA('accountSid')} placeholder="AC..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Auth Token</label><input {...regTwilioWA('authToken')} type="password" autoComplete="new-password" placeholder={hasSavedTwilioAuthToken ? 'Saved; blank keeps current token' : 'Twilio Auth Token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">API Key SID (alternative)</label><input {...regTwilioWA('apiKeySid')} placeholder="SK..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">API Key Secret</label><input {...regTwilioWA('apiKeySecret')} type="password" autoComplete="new-password" placeholder={hasSavedTwilioApiKeySecret ? 'Saved; blank keeps current secret' : 'Twilio API Key Secret'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">WhatsApp Sender Number</label><input {...regTwilioWA('phoneNumber')} placeholder="+1... or whatsapp:+1..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Approved Content Template SID</label><input {...regTwilioWA('templateSid')} placeholder="HX..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    </div>
                    <p className="text-[11px] text-slate mt-3">Vercel environment variables override values saved here. Use an approved Content Template SID for business-initiated messages.</p>
                  </div>
                  <Button type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save Twilio WhatsApp Setup</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* SMS Config */}
          {activeTab === 'sms' && (
            <Card>
              <CardHeader>
                <CardTitle><Smartphone className="w-4 h-4 text-gold" />Twilio SMS Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-lg border px-4 py-3 mb-5 text-xs ${smsSettingsData?.data?.data?.configured ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                  {smsSettingsData?.data?.data?.configured
                    ? 'Twilio SMS is configured. Secret values are never displayed.'
                    : 'Add Twilio credentials and either a sender number or Messaging Service SID to enable SMS messages.'}
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 mb-5 text-xs text-blue-300">
                  <strong>Setup:</strong> Use your Twilio Account SID and either an Auth Token or API Key SID and Secret. Choose a sender number or a Messaging Service SID from Twilio Console → Messaging → Services. A Messaging Service sends through its configured SMS-capable senders, so you do not need to enter a number here.
                </div>
                <form onSubmit={handleSms(onSmsSave)} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-slate-light mb-1.5">Account SID</label><input {...regSms('accountSid')} placeholder="AC..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    <div><label className="block text-xs font-medium text-slate-light mb-1.5">SMS Sender Number (optional)</label><input {...regSms('phoneNumber')} placeholder="+1... or +91..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    <div><label className="block text-xs font-medium text-slate-light mb-1.5">Messaging Service SID (alternative)</label><input {...regSms('messagingServiceSid')} placeholder="MG..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    <div><label className="block text-xs font-medium text-slate-light mb-1.5">Auth Token</label><input {...regSms('authToken')} type="password" autoComplete="new-password" placeholder={hasSavedSmsAuthToken ? 'Saved; blank keeps current token' : 'Twilio Auth Token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    <div><label className="block text-xs font-medium text-slate-light mb-1.5">API Key SID (alternative)</label><input {...regSms('apiKeySid')} placeholder="SK..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    <div><label className="block text-xs font-medium text-slate-light mb-1.5">API Key Secret</label><input {...regSms('apiKeySecret')} type="password" autoComplete="new-password" placeholder={hasSavedSmsApiKeySecret ? 'Saved; blank keeps current secret' : 'Twilio API Key Secret'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                  </div>
                  <p className="text-[11px] text-slate">Use an SMS-capable sender number or Messaging Service SID. If both credential types are saved, the API Key pair is used. SMS never uses the WhatsApp sender number. SMS_TWILIO_* environment variables override values saved here; generic TWILIO_* credentials can provide authentication only.</p>
                  <Button type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save Twilio SMS Setup</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Call API Config */}
          {activeTab === 'voice' && (
            <Card>
              <CardHeader>
                <CardTitle><PhoneCall className="w-4 h-4 text-gold" />MCUBE Call API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-lg border px-4 py-3 mb-5 text-xs ${voiceSettingsData?.data?.data?.configured ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                  {voiceSettingsData?.data?.data?.configured ? 'Call API is configured. Saved credentials are never displayed.' : 'Add your MCUBE API token and agent phone number to enable outbound calls.'}
                </div>
                <form onSubmit={handleVoice(onVoiceSave)} className="space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Credentials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">MCUBE API Token</label>
                        <input {...regVoice('apiToken')} type="password" autoComplete="new-password" placeholder={hasSavedVoiceToken ? 'Saved; blank keeps current token' : 'Enter MCUBE API token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Agent Phone Number</label>
                        <input {...regVoice('agentNumber')} placeholder="MCUBE executive phone number" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Click-to-Call API URL</label>
                        <input {...regVoice('url')} type="url" placeholder="https://api.mcube.com/Restmcube-api/outbound-calls" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Request Fields</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Token Field</label><input {...regVoice('tokenField')} placeholder="HTTP_AUTHORIZATION" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Token Prefix</label><input {...regVoice('tokenPrefix')} placeholder="Optional, e.g. Bearer " className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Agent Field</label><input {...regVoice('agentField')} placeholder="exenumber" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Customer Field</label><input {...regVoice('customerField')} placeholder="custnumber" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Outgoing DID Field</label><input {...regVoice('didField')} placeholder="did" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Reference URL Field</label><input {...regVoice('refurlField')} placeholder="refurl" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Reference URL Value</label><input {...regVoice('refurl')} placeholder="1" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white mb-2">Incoming Call Routing</h3>
                    <p className="text-xs text-slate mb-3">
                      Assign one CRM owner to each incoming line. This mapping records the correct owner for each incoming call.
                    </p>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Incoming number, MCUBE agent phone, CRM agent name (one route per line)</label>
                    <textarea
                      {...regVoice('incomingRoutesText')}
                      rows={6}
                      placeholder={'9071126875, 9187980598, Maruthi'}
                      className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                    />
                    <p className="text-[11px] text-slate mt-2">
                      Incoming call delivery to agent phones remains configured in MCUBE.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white mb-2">Fixed Outgoing DID by CRM User</h3>
                    <p className="text-xs text-slate mb-3">These owner-to-DID assignments are fixed in the API so stale or edited settings cannot route calls through another user’s number.</p>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">CRM agent name, outgoing DID (one mapping per line)</label>
                    <textarea
                      {...regVoice('outgoingDidsText')}
                      rows={4}
                      readOnly
                      className="w-full cursor-not-allowed bg-navy/70 border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                    <p className="text-[11px] text-slate mt-2">The API repairs the saved mapping on the next outbound call. MCUBE receives the DID using the configured field (default: did).</p>
                  </div>
                  <Button type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save Call API Settings</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Ads Integrations */}
          {activeTab === 'ads' && (
            <Card>
              <CardHeader>
                <CardTitle><Megaphone className="w-4 h-4 text-gold" />Meta & Google Ads Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                  <div className={`rounded-lg border px-4 py-3 text-xs flex items-center justify-between gap-3 ${adsSettingsData?.data?.data?.metaActive ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-navy-border bg-navy text-slate'}`}>
                    <span>Meta Ads: {adsSettingsData?.data?.data?.metaActive ? 'Active' : 'Not connected'}</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => connectAds('meta')}>Connect Meta</Button>
                  </div>
                  <div className={`rounded-lg border px-4 py-3 text-xs flex items-center justify-between gap-3 ${adsSettingsData?.data?.data?.googleActive ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-navy-border bg-navy text-slate'}`}>
                    <span>Google Ads: {adsSettingsData?.data?.data?.googleActive ? 'Active' : 'Not connected'}</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => connectAds('google')}>Connect Google Ads</Button>
                  </div>
                </div>
                <form onSubmit={handleAds(onAdsSave)} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Meta Lead Ads</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Meta App ID</label><input {...regAds('metaAppId')} placeholder="Meta Developer App ID" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Meta App Secret</label><input {...regAds('metaAppSecret')} type="password" placeholder="Meta Developer App Secret" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Webhook Verify Token</label><input {...regAds('metaLeadVerifyToken')} type="password" placeholder="Meta webhook verification token" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Ad Account ID</label><input {...regAds('metaAdAccountId')} placeholder="act_123... or 123..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Lead Page Access Token</label><textarea {...regAds('metaLeadAccessToken')} rows={2} placeholder="Meta Page access token" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Ads Reporting Access Token</label><textarea {...regAds('metaAdsAccessToken')} rows={2} placeholder="Meta Ads access token" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" /></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Google Lead Forms & Ads</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Lead Webhook Key</label><input {...regAds('googleLeadWebhookKey')} type="password" placeholder="Optional webhook key" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Customer ID</label><input {...regAds('googleAdsCustomerId')} placeholder="123-456-7890" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">OAuth Client ID</label><input {...regAds('googleAdsClientId')} placeholder="Google OAuth client ID" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">OAuth Client Secret</label><input {...regAds('googleAdsClientSecret')} type="password" placeholder="Google OAuth client secret" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">OAuth Refresh Token</label><textarea {...regAds('googleAdsRefreshToken')} rows={2} placeholder="Google Ads refresh token" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Developer Token</label><input {...regAds('googleAdsDeveloperToken')} type="password" placeholder="Google Ads developer token" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Login Customer ID (optional)</label><input {...regAds('googleAdsLoginCustomerId')} placeholder="Manager account ID" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    </div>
                  </div>
                  <Button type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save & Activate Ads Integrations</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle><Shield className="w-4 h-4 text-gold" />Security Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePw(onPasswordChange)} className="space-y-4 max-w-md">
                  <p className="text-xs text-slate mb-4">Change your account password. Use at least 8 characters with a mix of letters and numbers.</p>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Current Password</label>
                    <input {...regPw('currentPassword', { required: true })} type="password" placeholder="Current password" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">New Password</label>
                    <input {...regPw('newPassword', { required: true, minLength: 8 })} type="password" placeholder="New password (min 8 chars)" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Confirm New Password</label>
                    <input {...regPw('confirmPassword', { required: true })} type="password" placeholder="Confirm new password" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <Button type="submit" icon={<Shield className="w-3.5 h-3.5" />}>Change Password</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Branding */}
          {activeTab === 'branding' && (
            <Card>
              <CardHeader>
                <CardTitle><Palette className="w-4 h-4 text-gold" />CRM Branding</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBranding(onBrandingSave)} className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Company Name</label>
                    <input {...regBranding('companyName')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">CRM Domain</label>
                    <input {...regBranding('domain')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-3">Logo Upload</label>
                    <FileUploadZone onFile={uploadLogo} accept="image/png,image/jpeg,image/svg+xml,image/webp" maxSizeMB={2} label="Click to upload or drag & drop" loading={logoUploading} />
                    {logoUrl && <p className="text-[11px] text-green-400 mt-2">Logo uploaded and ready to save.</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-2">Accent Color</label>
                    <input type="hidden" {...regBranding('accentColor')} />
                    <div className="flex gap-2">
                      {['#C9A84C', '#E67E22', '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C'].map(color => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Select accent color ${color}`}
                          onClick={() => setBrandingValue('accentColor', color, { shouldDirty: true })}
                          className={`w-7 h-7 rounded-full border-2 transition-colors ${watchBranding('accentColor') === color ? 'border-white' : 'border-transparent hover:border-white'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save Branding</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Projects */}
          {activeTab === 'projects' && (
            <Card>
              <CardHeader>
                <CardTitle><Building2 className="w-4 h-4 text-gold" />Project Management</CardTitle>
                <Button type="button" size="sm" icon={<Building2 className="w-3.5 h-3.5" />} onClick={() => setShowProjectForm(true)}>Add Project</Button>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="text-sm text-slate text-center py-8">Loading projects...</div>
                ) : projectsError ? (
                  <div className="text-sm text-center py-8">
                    <p className="text-red-400 mb-2">Unable to load projects.</p>
                    <Button type="button" variant="secondary" size="sm" onClick={() => refetchProjects()}>Retry</Button>
                  </div>
                ) : (projectsData?.data?.data || []).length > 0 ? (
                  <div className="space-y-2">
                    {(projectsData?.data?.data || []).map((project: any) => (
                      <div key={project.id} className="flex items-center justify-between border border-navy-border rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm text-white">{project.name}</p>
                          <p className="text-xs text-slate">{project.location}, {project.city}, {project.state}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] rounded-full px-2 py-0.5 ${project.isActive ? 'bg-green-500/10 text-green-400' : 'bg-slate/10 text-slate'}`}>
                            {project.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-[11px] text-slate">{project._count?.inventory || 0} units</span>
                          <button
                            type="button"
                            title={`Edit ${project.name}`}
                            onClick={() => { setEditingProject(project); resetProject(project); setShowProjectForm(true) }}
                            className="text-slate hover:text-gold transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {project.isActive ? (
                            <button
                              type="button"
                              title={`Deactivate ${project.name}`}
                              onClick={() => {
                                if (window.confirm(`Deactivate ${project.name}?`)) deleteProjectMutation.mutate(project.id)
                              }}
                              className="text-slate hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title={`Reactivate ${project.name}`}
                              onClick={() => restoreProjectMutation.mutate(project.id)}
                              className="text-slate hover:text-green-400 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate text-center py-8">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate/30" />
                    <p>Manage your real estate projects here.</p>
                    <p className="text-xs mt-1">Projects are linked to leads, inventory, and quotations.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      <Modal open={showProjectForm} onClose={() => { setShowProjectForm(false); setEditingProject(null); resetProject() }} title={editingProject ? 'Edit Project' : 'Add Project'} size="lg">
        <form onSubmit={handleProject((data) => {
          if (editingProject) updateProjectMutation.mutate({ id: editingProject.id, data })
          else createProjectMutation.mutate(data)
        })} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Project Name" {...regProject('name', { required: 'Project name is required' })} />
            <Input label="Location" {...regProject('location', { required: 'Location is required' })} />
            <Input label="City" {...regProject('city', { required: 'City is required' })} />
            <Input label="State" {...regProject('state', { required: 'State is required' })} />
            <Input label="RERA Number" {...regProject('reraNumber')} />
          </div>
          <Textarea label="Description" rows={3} {...regProject('description')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowProjectForm(false); setEditingProject(null); resetProject() }}>Cancel</Button>
            <Button type="submit" loading={createProjectMutation.isPending || updateProjectMutation.isPending} icon={editingProject ? <Pencil className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}>
              {editingProject ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}

'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import { Settings, Mail, MessageSquare, Building2, Shield, User, Palette, Save, Eye, EyeOff, CheckCircle, Megaphone, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth.store'
import { useForm } from 'react-hook-form'
import api, { uploadApi } from '@/lib/api'

type ProfileFormValues = { name: string; phone: string }
type PasswordFormValues = { currentPassword: string; newPassword: string; confirmPassword: string }
type EmailFormValues = { gmailUser: string; gmailAppPassword: string; fromName: string }
type WAFormValues = { phoneId: string; accessToken: string; businessId: string }
type TwilioWAFormValues = { accountSid: string; authToken: string; apiKeySid: string; apiKeySecret: string; phoneNumber: string; smsPhoneNumber: string; templateSid: string }
type ProjectFormValues = { name: string; location: string; city: string; state: string; description: string; reraNumber: string }
type BrandingFormValues = { companyName: string; domain: string; logoUrl: string; accentColor: string }
type AdsFormValues = {
  metaAppId: string; metaAppSecret: string; metaLeadVerifyToken: string; metaLeadAccessToken: string; metaAdsAccessToken: string; metaAdAccountId: string
  googleLeadWebhookKey: string; googleAdsClientId: string; googleAdsClientSecret: string; googleAdsRefreshToken: string
  googleAdsDeveloperToken: string; googleAdsCustomerId: string; googleAdsLoginCustomerId: string
}

const TABS = [
  { key: 'profile', label: 'My Profile', icon: User },
  { key: 'email', label: 'Email Config', icon: Mail },
  { key: 'whatsapp', label: 'Meta WhatsApp API', icon: MessageSquare },
  { key: 'twilio-whatsapp', label: 'Twilio WhatsApp', icon: MessageSquare },
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
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ProfileFormValues>({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' } as ProfileFormValues,
  })

  const { register: regPw, handleSubmit: handlePw } = useForm<PasswordFormValues>()
  const { register: regEmail, handleSubmit: handleEmail } = useForm<EmailFormValues>()
  const { register: regWA, handleSubmit: handleWA, reset: resetWA } = useForm<WAFormValues>()
  const { register: regTwilioWA, handleSubmit: handleTwilioWA, reset: resetTwilioWA } = useForm<TwilioWAFormValues>()
  const { register: regAds, handleSubmit: handleAds, reset: resetAds } = useForm<AdsFormValues>()
  const canManageProjects = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const [hasSavedWAToken, setHasSavedWAToken] = useState(false)
  const [hasSavedTwilioAuthToken, setHasSavedTwilioAuthToken] = useState(false)
  const [hasSavedTwilioApiKeySecret, setHasSavedTwilioApiKeySecret] = useState(false)
  const [waSettings, setWaSettings] = useState<any>(null)
  const [twilioWhatsAppSettings, setTwilioWhatsAppSettings] = useState<any>(null)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const { register: regProject, handleSubmit: handleProjectSubmit, reset: resetProject } = useForm<ProjectFormValues>()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const { register: regBranding, handleSubmit: handleBrandingSubmit, reset: resetBranding, setValue: setBrandingValue, watch: watchBranding } = useForm<BrandingFormValues>({
    defaultValues: { companyName: 'Aarovia', domain: 'aarovia.co.in', logoUrl: '/aarovia-mark.png', accentColor: '#C9A84C' },
  })
  const { data: adsSettingsData, isLoading: adsSettingsLoading, isError: adsSettingsError } = useQuery({
    queryKey: ['ads-settings'],
    queryFn: () => api.get('/settings/ads'),
    enabled: activeTab === 'ads',
  })
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects', { params: { isActive: true } }),
    enabled: activeTab === 'projects',
  })
  const brandingQuery = useQuery({
    queryKey: ['branding-settings'],
    queryFn: () => api.get('/settings/branding'),
    enabled: activeTab === 'branding',
  })
  const uploadLogoMutation = useMutation({
    mutationFn: uploadApi.uploadBrandingLogo,
    onSuccess: (response) => {
      const logoUrl = response.data?.data?.url
      if (typeof logoUrl !== 'string' || !logoUrl) {
        toast.error('Logo upload did not return an image URL')
        return
      }
      setBrandingValue('logoUrl', logoUrl, { shouldDirty: true })
      toast.success('Logo uploaded. Save Branding to publish it.')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Logo upload failed'),
  })
  const saveBrandingMutation = useMutation({
    mutationFn: (data: BrandingFormValues) => api.post('/settings/branding', data),
    onSuccess: (response) => {
      resetBranding(response.data?.data)
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] })
      toast.success('Branding settings saved')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to save branding settings'),
  })
  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectFormValues) => api.post('/projects', {
      ...data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      resetProject()
      setShowProjectForm(false)
      toast.success('Project added successfully')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to add project'),
  })

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      api.get('/settings/whatsapp').then((response) => {
        const settings = response.data?.data
        if (!settings) return
        setWaSettings(settings)
        setHasSavedWAToken(Boolean(settings.hasAccessToken))
        resetWA({
          phoneId: settings.phoneId || '',
          accessToken: '',
          businessId: settings.businessId || '',
        })
      }).catch((error) => {
        toast.error(error.response?.data?.message || 'Failed to load Meta WhatsApp API settings')
      })
    }
    if (activeTab === 'twilio-whatsapp') {
      api.get('/settings/whatsapp/twilio').then((response) => {
        const settings = response.data?.data
        if (!settings) return
        setTwilioWhatsAppSettings(settings)
        setHasSavedTwilioAuthToken(Boolean(settings.authTokenConfigured))
        setHasSavedTwilioApiKeySecret(Boolean(settings.apiKeySecretConfigured))
        resetTwilioWA({
          accountSid: settings.accountSid || '',
          authToken: '',
          apiKeySid: settings.apiKeySid || '',
          apiKeySecret: '',
          phoneNumber: settings.phoneNumber || '',
          smsPhoneNumber: settings.smsPhoneNumber || '',
          templateSid: settings.templateSid || '',
        })
      }).catch((error) => {
        toast.error(error.response?.data?.message || 'Failed to load Twilio WhatsApp settings')
      })
    }
  }, [activeTab, resetWA, resetTwilioWA])

  useEffect(() => {
    const settings = adsSettingsData?.data?.data
    if (!settings) return
    resetAds({
      metaAppId: settings.meta_app_id || '',
      metaAppSecret: '',
      metaLeadVerifyToken: '',
      metaLeadAccessToken: '',
      metaAdsAccessToken: '',
      metaAdAccountId: settings.meta_ad_account_id || '',
      googleLeadWebhookKey: '',
      googleAdsClientId: settings.google_ads_client_id || '',
      googleAdsClientSecret: '',
      googleAdsRefreshToken: '',
      googleAdsDeveloperToken: '',
      googleAdsCustomerId: settings.google_ads_customer_id || '',
      googleAdsLoginCustomerId: settings.google_ads_login_customer_id || '',
    })
  }, [adsSettingsData, resetAds])

  useEffect(() => {
    const settings = brandingQuery.data?.data?.data
    if (settings) resetBranding(settings)
  }, [brandingQuery.data, resetBranding])

  const onBrandingLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Choose a PNG, JPEG, or WebP logo image')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo image must be 2 MB or smaller')
      return
    }
    uploadLogoMutation.mutate(file)
  }

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
      setWaSettings((current: any) => ({ ...current, configured: true, provider: 'META' }))
      setHasSavedWAToken(Boolean(response.data?.data?.hasAccessToken))
      resetWA({ ...data, accessToken: '' })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] })
      toast.success('Meta WhatsApp API settings saved and selected')
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to save Meta WhatsApp API settings') }
  }

  const onTwilioWhatsAppSave = async (data: TwilioWAFormValues) => {
    try {
      await api.post('/settings/whatsapp/twilio', data)
      setTwilioWhatsAppSettings((current: any) => ({ ...current, configured: true, provider: 'TWILIO' }))
      resetTwilioWA({ ...data, authToken: '', apiKeySecret: '' })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] })
      toast.success('Twilio WhatsApp settings saved and selected')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save Twilio WhatsApp settings')
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

  const sendTestEmail = async () => {
    try {
      await api.post('/email/send-project-details', { toEmail: user?.email, templateType: 'villa' })
      setTestEmailSent(true)
      toast.success('Test email sent to ' + user?.email)
    } catch { toast.error('Test email failed') }
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
                <CardTitle><Mail className="w-4 h-4 text-gold" />Gmail SMTP Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 mb-5 text-xs text-blue-400">
                  <strong>Setup:</strong> Use a Gmail account with App Password (not your account password). Enable 2FA first, then create an App Password in Google Account settings.
                </div>
                <form onSubmit={handleEmail(onEmailSave)} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Gmail Address</label>
                    <input {...regEmail('gmailUser')} type="email" placeholder="youremail@gmail.com" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">App Password</label>
                    <div className="relative">
                      <input {...regEmail('gmailAppPassword')} type={showPass ? 'text' : 'password'} placeholder="xxxx xxxx xxxx xxxx" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 font-mono" />
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
                <div className={`rounded-lg border px-4 py-3 mb-5 text-xs ${waSettings?.configured && waSettings?.provider === 'META' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                  {waSettings?.configured
                    ? waSettings?.provider === 'META'
                      ? 'Meta WhatsApp API is configured and selected. Access tokens are never displayed.'
                      : `Meta credentials are configured, but ${waSettings?.provider || 'another provider'} is selected.`
                    : 'Add the Meta Phone Number ID and Access Token to configure this sender.'}
                </div>
                {waSettings?.providerLocked && (
                  <p className="text-xs text-amber-300 mb-4">Provider selection is locked to {waSettings.provider} by the WHATSAPP_PROVIDER environment variable.</p>
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
                  <Button type="submit" disabled={Boolean(waSettings?.providerLocked && waSettings?.provider !== 'META')} icon={<Save className="w-3.5 h-3.5" />}>Save Meta WhatsApp API Settings</Button>
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
                <div className={`rounded-lg border px-4 py-3 mb-5 text-xs ${twilioWhatsAppSettings?.configured && twilioWhatsAppSettings?.provider === 'TWILIO' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                  {twilioWhatsAppSettings?.configured
                    ? twilioWhatsAppSettings?.provider === 'TWILIO'
                      ? 'Twilio WhatsApp is configured and selected. Secret values are never displayed.'
                      : `Twilio credentials are configured, but ${twilioWhatsAppSettings?.provider || 'another provider'} is selected.`
                    : 'Add your Twilio credentials and WhatsApp sender number to configure this sender.'}
                </div>
                {twilioWhatsAppSettings?.providerLocked && (
                  <p className="text-xs text-amber-300 mb-4">Provider selection is locked to {twilioWhatsAppSettings.provider} by the WHATSAPP_PROVIDER environment variable.</p>
                )}
                <form onSubmit={handleTwilioWA(onTwilioWhatsAppSave)} className="space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Twilio WhatsApp Credentials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Account SID</label>
                        <input {...regTwilioWA('accountSid')} placeholder="AC..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Auth Token</label>
                        <input {...regTwilioWA('authToken')} type="password" autoComplete="new-password" placeholder={hasSavedTwilioAuthToken ? 'Saved; blank keeps current token' : 'Twilio Auth Token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">API Key SID (alternative)</label>
                        <input {...regTwilioWA('apiKeySid')} placeholder="SK..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">API Key Secret</label>
                        <input {...regTwilioWA('apiKeySecret')} type="password" autoComplete="new-password" placeholder={hasSavedTwilioApiKeySecret ? 'Saved; blank keeps current secret' : 'Twilio API Key Secret'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">WhatsApp Sender Number</label>
                        <input {...regTwilioWA('phoneNumber')} placeholder="+12345678900" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">SMS Sender Number</label>
                        <input {...regTwilioWA('smsPhoneNumber')} placeholder="+12345678900 (SMS-enabled Twilio number)" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-light mb-1.5">Approved Content Template SID (optional)</label>
                        <input {...regTwilioWA('templateSid')} placeholder="HX..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate mt-3">The SMS sender must be SMS-enabled in Twilio. For WhatsApp template sends, use an approved Content Template SID with body variable <code>{'{{1}}'}</code>. Environment variables override values saved here.</p>
                  </div>
                  <Button type="submit" disabled={Boolean(twilioWhatsAppSettings?.providerLocked && twilioWhatsAppSettings?.provider !== 'TWILIO')} icon={<Save className="w-3.5 h-3.5" />}>Save and Select Twilio WhatsApp</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'ads' && (
            <Card>
              <CardHeader>
                <CardTitle><Megaphone className="w-4 h-4 text-gold" />Meta & Google Ads Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                {adsSettingsLoading && <p className="text-xs text-slate mb-4">Loading Ads settings...</p>}
                {adsSettingsError && <p className="text-xs text-red-400 mb-4">Could not load Ads settings. Please retry before changing saved configuration.</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                  <div className={`rounded-lg border px-4 py-3 text-xs ${adsSettingsData?.data?.data?.metaConfigured ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-navy-border bg-navy text-slate'}`}>
                    Meta Ads credentials: {adsSettingsData?.data?.data?.metaConfigured ? 'Configured' : 'Incomplete'}
                  </div>
                  <div className={`rounded-lg border px-4 py-3 text-xs ${adsSettingsData?.data?.data?.googleConfigured ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-navy-border bg-navy text-slate'}`}>
                    Google Ads credentials: {adsSettingsData?.data?.data?.googleConfigured ? 'Configured' : 'Incomplete'}
                  </div>
                </div>
                <form onSubmit={handleAds(onAdsSave)} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Meta Lead Ads</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Meta App ID</label><input {...regAds('metaAppId')} placeholder="Meta Developer App ID" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Meta App Secret</label><input {...regAds('metaAppSecret')} type="password" autoComplete="new-password" placeholder={adsSettingsData?.data?.data?.meta_app_secret_configured ? 'Saved; blank keeps current secret' : 'Meta Developer App Secret'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Webhook Verify Token</label><input {...regAds('metaLeadVerifyToken')} type="password" autoComplete="new-password" placeholder={adsSettingsData?.data?.data?.meta_lead_verify_token_configured ? 'Saved; blank keeps current secret' : 'Meta webhook verification token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Ad Account ID</label><input {...regAds('metaAdAccountId')} placeholder="act_123... or 123..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Lead Page Access Token</label><input {...regAds('metaLeadAccessToken')} type="password" autoComplete="new-password" placeholder={adsSettingsData?.data?.data?.meta_lead_access_token_configured ? 'Saved; blank keeps current token' : 'Meta Page access token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Ads Reporting Access Token</label><input {...regAds('metaAdsAccessToken')} type="password" autoComplete="new-password" placeholder={adsSettingsData?.data?.data?.meta_ads_access_token_configured ? 'Saved; blank keeps current token' : 'Meta Ads access token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Google Lead Forms & Ads</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Lead Webhook Key</label><input {...regAds('googleLeadWebhookKey')} type="password" autoComplete="new-password" placeholder={adsSettingsData?.data?.data?.google_lead_webhook_key_configured ? 'Saved; blank keeps current key' : 'Optional webhook key'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Customer ID</label><input {...regAds('googleAdsCustomerId')} placeholder="123-456-7890" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">OAuth Client ID</label><input {...regAds('googleAdsClientId')} placeholder="Google OAuth client ID" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">OAuth Client Secret</label><input {...regAds('googleAdsClientSecret')} type="password" autoComplete="new-password" placeholder={adsSettingsData?.data?.data?.google_ads_client_secret_configured ? 'Saved; blank keeps current secret' : 'Google Ads OAuth client secret'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">OAuth Refresh Token</label><input {...regAds('googleAdsRefreshToken')} type="password" autoComplete="new-password" placeholder={adsSettingsData?.data?.data?.google_ads_refresh_token_configured ? 'Saved; blank keeps current token' : 'Google Ads refresh token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
                      <div><label className="block text-xs font-medium text-slate-light mb-1.5">Developer Token</label><input {...regAds('googleAdsDeveloperToken')} type="password" autoComplete="new-password" placeholder={adsSettingsData?.data?.data?.google_ads_developer_token_configured ? 'Saved; blank keeps current token' : 'Google Ads developer token'} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" /></div>
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
                {brandingQuery.isLoading ? (
                  <p className="text-sm text-slate py-6">Loading branding settings...</p>
                ) : brandingQuery.isError ? (
                  <p className="text-sm text-red-400 py-6">Could not load branding settings. Please try again.</p>
                ) : (
                  <form onSubmit={handleBrandingSubmit((data) => saveBrandingMutation.mutate(data))} className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Company Name</label>
                    <input {...regBranding('companyName', { required: true })} required className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">CRM Domain</label>
                    <input {...regBranding('domain', { required: true })} required className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-3">Logo Upload</label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={onBrandingLogoChange}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadLogoMutation.isPending}
                      className="w-full border-2 border-dashed border-navy-border rounded-lg p-6 text-center hover:border-gold/40 transition-colors disabled:opacity-50"
                    >
                      <Image
                        src={watchBranding('logoUrl') || '/aarovia-mark.png'}
                        alt={`${watchBranding('companyName') || 'Aarovia'} logo preview`}
                        width={96}
                        height={96}
                        className="w-24 h-16 object-contain mx-auto mb-3"
                      />
                      <p className="text-xs text-slate">{uploadLogoMutation.isPending ? 'Uploading logo...' : 'Select a company logo'}</p>
                      <p className="text-[10px] text-slate/60 mt-1">PNG, JPEG, or WebP up to 2 MB</p>
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-2">Accent Color</label>
                    <div className="flex gap-2" role="group" aria-label="Accent color">
                      {['#C9A84C', '#E67E22', '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C'].map(color => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Choose accent color ${color}`}
                          aria-pressed={watchBranding('accentColor') === color}
                          onClick={() => setBrandingValue('accentColor', color, { shouldDirty: true })}
                          className={`w-7 h-7 rounded-full border-2 transition-colors ${watchBranding('accentColor') === color ? 'border-slate-900' : 'border-transparent hover:border-slate-400'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button type="submit" loading={saveBrandingMutation.isPending} disabled={uploadLogoMutation.isPending} icon={<Save className="w-3.5 h-3.5" />}>Save Branding</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Projects */}
          {activeTab === 'projects' && (
            <Card>
              <CardHeader>
                <CardTitle><Building2 className="w-4 h-4 text-gold" />Project Management</CardTitle>
                {canManageProjects && (
                  <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowProjectForm((visible) => !visible)}>
                    {showProjectForm ? 'Cancel' : 'Add Project'}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showProjectForm && canManageProjects && (
                  <form onSubmit={handleProjectSubmit((data) => createProjectMutation.mutate(data))} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 rounded-lg border border-navy-border bg-navy p-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">Project Name</label>
                      <input {...regProject('name', { required: true })} required placeholder="Project name" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">Location</label>
                      <input {...regProject('location', { required: true })} required placeholder="Area or locality" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">City</label>
                      <input {...regProject('city', { required: true })} required placeholder="City" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">State</label>
                      <input {...regProject('state', { required: true })} required placeholder="State" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">RERA Number (optional)</label>
                      <input {...regProject('reraNumber')} placeholder="RERA registration" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-light mb-1.5">Description (optional)</label>
                      <input {...regProject('description')} placeholder="Short project description" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40" />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" loading={createProjectMutation.isPending} icon={<Save className="w-3.5 h-3.5" />}>Save Project</Button>
                    </div>
                  </form>
                )}
                {projectsQuery.isLoading ? (
                  <p className="text-sm text-slate py-6 text-center">Loading projects...</p>
                ) : projectsQuery.isError ? (
                  <p className="text-sm text-red-400 py-6 text-center">Could not load projects. Please try again.</p>
                ) : (projectsQuery.data?.data?.data || []).length === 0 ? (
                  <div className="text-sm text-slate text-center py-8">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate/30" />
                    <p>No active projects found.</p>
                    <p className="text-xs mt-1">Projects can be linked to leads, inventory, and quotations.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-navy-border">
                    {(projectsQuery.data?.data?.data || []).map((project: any) => (
                      <div key={project.id} className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{project.name}</p>
                          <p className="text-xs text-slate mt-1">{[project.location, project.city, project.state].filter(Boolean).join(', ')}</p>
                        </div>
                        <div className="flex gap-4 text-xs text-slate">
                          <span>{project._count?.inventory || 0} units</span>
                          <span>{project._count?.leads || 0} leads</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </AppLayout>
  )
}

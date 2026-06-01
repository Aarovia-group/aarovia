'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import { Settings, Mail, MessageSquare, Building2, Shield, User, Palette, Save, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth.store'
import { useForm } from 'react-hook-form'
import api from '@/lib/api'

type ProfileFormValues = { name: string; phone: string }
type PasswordFormValues = { currentPassword: string; newPassword: string; confirmPassword: string }
type EmailFormValues = { gmailUser: string; gmailAppPassword: string; fromName: string }
type WAFormValues = { phoneId: string; accessToken: string; businessId: string }

const TABS = [
  { key: 'profile', label: 'My Profile', icon: User },
  { key: 'email', label: 'Email Config', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp API', icon: MessageSquare },
  { key: 'projects', label: 'Projects', icon: Building2 },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'branding', label: 'Branding', icon: Palette },
]

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [showPass, setShowPass] = useState(false)
  const [testEmailSent, setTestEmailSent] = useState(false)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ProfileFormValues>({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' } as ProfileFormValues,
  })

  const { register: regPw, handleSubmit: handlePw } = useForm<PasswordFormValues>()
  const { register: regEmail, handleSubmit: handleEmail } = useForm<EmailFormValues>()
  const { register: regWA, handleSubmit: handleWA } = useForm<WAFormValues>()

  const onProfileSave = async (data: any) => {
    try {
      const res = await api.put('/api/auth/profile', data)
      updateUser(res.data.data)
      toast.success('Profile updated successfully')
    } catch { toast.error('Failed to update profile') }
  }

  const onPasswordChange = async (data: any) => {
    try {
      await api.put('/api/auth/change-password', data)
      toast.success('Password changed successfully')
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to change password') }
  }

  const onEmailSave = async (data: any) => {
    try {
      await api.post('/api/settings/email', data)
      toast.success('Email configuration saved')
    } catch { toast.error('Failed to save email config') }
  }

  const onWASave = async (data: any) => {
    try {
      await api.post('/api/settings/whatsapp', data)
      toast.success('WhatsApp configuration saved')
    } catch { toast.error('Failed to save WhatsApp config') }
  }

  const sendTestEmail = async () => {
    try {
      await api.post('/api/email/send-project-details', { toEmail: user?.email, templateType: 'villa' })
      setTestEmailSent(true)
      toast.success('Test email sent to ' + user?.email)
    } catch { toast.error('Test email failed') }
  }

  return (
    <AppLayout title="Settings" subtitle="Configure your CRM preferences and integrations">
      <div className="flex gap-5">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0">
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
                <CardTitle><MessageSquare className="w-4 h-4 text-gold" />WhatsApp Cloud API</CardTitle>
              </CardHeader>
              <CardContent>
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
                    <textarea {...regWA('accessToken')} rows={3} placeholder="EAAxxxxxx..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Business Account ID</label>
                    <input {...regWA('businessId')} placeholder="WABA ID" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <Button type="submit" icon={<Save className="w-3.5 h-3.5" />}>Save WhatsApp Config</Button>
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
                <div className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">Company Name</label>
                    <input defaultValue="Aarovia Real Estates" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-1.5">CRM Domain</label>
                    <input defaultValue="crm.aarovia.co.in" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-3">Logo Upload</label>
                    <div className="border-2 border-dashed border-navy-border rounded-lg p-6 text-center hover:border-gold/40 transition-colors cursor-pointer">
                      <div className="w-12 h-12 rounded-xl gold-gradient mx-auto mb-3 flex items-center justify-center">
                        <span className="font-display font-bold text-navy text-lg">A</span>
                      </div>
                      <p className="text-xs text-slate">Click to upload or drag & drop</p>
                      <p className="text-[10px] text-slate/60 mt-1">PNG, SVG up to 2MB</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-light mb-2">Accent Color</label>
                    <div className="flex gap-2">
                      {['#C9A84C', '#E67E22', '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C'].map(color => (
                        <button key={color} className="w-7 h-7 rounded-full border-2 border-transparent hover:border-white transition-colors" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                  <Button icon={<Save className="w-3.5 h-3.5" />}>Save Branding</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Projects */}
          {activeTab === 'projects' && (
            <Card>
              <CardHeader>
                <CardTitle><Building2 className="w-4 h-4 text-gold" />Project Management</CardTitle>
                <Button size="sm" icon={<Building2 className="w-3.5 h-3.5" />}>Add Project</Button>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate text-center py-8">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-slate/30" />
                  <p>Manage your real estate projects here.</p>
                  <p className="text-xs mt-1">Projects are linked to leads, inventory, and quotations.</p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </AppLayout>
  )
}

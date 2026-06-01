'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { useAuthStore } from '@/lib/store/auth.store'
import api from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, User, Shield } from 'lucide-react'
import Link from 'next/link'

type ProfileFormValues = { name: string; phone: string }
type PasswordFormValues = { currentPassword: string; newPassword: string; confirmPassword: string }

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { user, updateUser } = useAuthStore()

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.put('/api/auth/profile', data),
    onSuccess: (res) => { updateUser(res.data.data); toast.success('Profile updated') },
    onError: () => toast.error('Failed to update profile'),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.put('/api/auth/change-password', data),
    onSuccess: () => { toast.success('Password changed'); resetPw() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to change password'),
  })

  const { register, handleSubmit } = useForm<ProfileFormValues>({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' } as ProfileFormValues,
  })

  const { register: regPw, handleSubmit: handlePw, reset: resetPw, watch } = useForm<PasswordFormValues>()
  const newPass = watch('newPassword')

  return (
    <AppLayout
      title="My Profile"
      subtitle="Manage your personal account settings"
      actions={
        <Link href="/settings">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Settings</Button>
        </Link>
      }
    >
      <div className="max-w-2xl space-y-5">
        {/* Avatar & Info */}
        <Card>
          <CardHeader>
            <CardTitle><User className="w-4 h-4 text-gold" />Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-navy-border">
              <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center text-navy text-xl font-bold flex-shrink-0">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{user?.name}</h3>
                <p className="text-sm text-slate">{user?.email}</p>
                <span className="text-[10px] mt-1.5 inline-block px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/25 font-medium">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit(d => profileMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Full Name</label>
                  <input {...register('name')} className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Phone Number</label>
                  <input {...register('phone')} placeholder="+91 9876543210" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-light mb-1.5">Email (cannot be changed)</label>
                <input value={user?.email || ''} disabled className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate opacity-50 cursor-not-allowed" />
              </div>
              <Button type="submit" loading={profileMutation.isPending} icon={<Save className="w-3.5 h-3.5" />}>
                Save Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle><Shield className="w-4 h-4 text-gold" />Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePw(d => passwordMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-light mb-1.5">Current Password *</label>
                <input {...regPw('currentPassword', { required: true })} type="password" placeholder="Your current password" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">New Password *</label>
                  <input {...regPw('newPassword', { required: true, minLength: { value: 8, message: 'Min 8 characters' } })} type="password" placeholder="New password (min 8 chars)" className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-light mb-1.5">Confirm New Password *</label>
                  <input
                    {...regPw('confirmPassword', {
                      required: true,
                      validate: v => v === newPass || "Passwords don't match",
                    })}
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50"
                  />
                </div>
              </div>
              <Button type="submit" loading={passwordMutation.isPending} variant="secondary" icon={<Shield className="w-3.5 h-3.5" />}>
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

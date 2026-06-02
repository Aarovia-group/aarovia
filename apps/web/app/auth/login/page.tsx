'use client'

import axios from 'axios'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth.store'
import { Eye, EyeOff, Lock, Mail, Building2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      const res = await authApi.login(data)
      setAuth(res.data.data.user, res.data.data.token)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      if (axios.isAxiosError(err) && !err.response) {
        setError('Unable to reach the API. Check your network or API URL and try again.')
      } else {
        setError(err.response?.data?.message || err.message || 'Login failed. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-navy flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 navy-gradient relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full border border-gold" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full border border-gold" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-gold" />
        </div>
        <div className="relative text-center">
          <div className="w-20 h-20 rounded-2xl gold-gradient mx-auto mb-6 flex items-center justify-center">
            <span className="font-display text-3xl font-bold text-navy">A</span>
          </div>
          <h1 className="font-display text-4xl font-semibold text-white mb-3">Aarovia</h1>
          <p className="text-gold text-sm tracking-[4px] uppercase mb-8">Real Estates</p>
          <div className="max-w-xs mx-auto space-y-4">
            {['Complete Lead Management', 'Real-time Sales Analytics', 'Inventory & Quotation System', 'WhatsApp & Email Integration'].map(f => (
              <div key={f} className="flex items-center gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-gold" />
                </div>
                <span className="text-slate-light text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <span className="font-display font-bold text-navy">A</span>
            </div>
            <div>
              <div className="font-display text-xl text-white">Aarovia</div>
              <div className="text-[10px] text-slate tracking-[2px] uppercase">Real Estates</div>
            </div>
          </div>

          <h2 className="font-display text-2xl text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate mb-8">Sign in to your CRM dashboard</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@aarovia.co.in"
                  className="w-full bg-navy-mid border border-navy-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-colors"
                />
              </div>
              {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-light mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-navy-mid border border-navy-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-white transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full gold-gradient text-navy font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-slate mt-8">
            © 2024 Aarovia Real Estates CRM. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

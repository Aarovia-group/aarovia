'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { leadApi, projectApi } from '@/lib/api'
import { LEAD_SOURCES, LEAD_STATUSES, PROPERTY_TYPES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, UserPlus } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

type NewLeadFormValues = {
  name: string
  mobile: string
  email: string
  city: string
  source: string
  status: string
  propertyType: string
  budget: string
  remarks: string
  projectId: string
  nextFollowupDate: string
  assignedToId: string
}

export default function NewLeadPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll(),
  })
  const projects = projectsData?.data?.data || []

  const { data: usersData } = useQuery({
    queryKey: ['users-exec'],
    queryFn: () => api.get('/api/users', { params: { role: 'SALES_EXECUTIVE', limit: 50 } }),
  })
  const users = usersData?.data?.data || []

  const createMutation = useMutation({
    mutationFn: (data: any) => leadApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created successfully')
      router.push(`/leads/${res.data.data.id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create lead'),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<NewLeadFormValues>({
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      city: '',
      source: 'WEBSITE',
      status: 'NEW',
      propertyType: '',
      budget: '',
      remarks: '',
      projectId: '',
      nextFollowupDate: '',
      assignedToId: '',
    } as NewLeadFormValues,
  })

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      budget: data.budget ? parseFloat(data.budget) : null,
      propertyType: data.propertyType || null,
      projectId: data.projectId || null,
      assignedToId: data.assignedToId || null,
      nextFollowupDate: data.nextFollowupDate || null,
    }
    createMutation.mutate(payload)
  }

  // projects and users are derived above from their respective queries

  const inputClass = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50"
  const selectClass = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
  const labelClass = "block text-xs font-medium text-slate-light mb-1.5"
  const errorClass = "text-[11px] text-red-400 mt-1"

  return (
    <AppLayout
      title="Add New Lead"
      subtitle="Create a new lead in the CRM pipeline"
      actions={
        <div className="flex gap-2">
          <Link href="/leads">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Cancel</Button>
          </Link>
          <Button type="submit" form="new-lead-form" loading={createMutation.isPending} icon={<Save className="w-3.5 h-3.5" />}>
            Create Lead
          </Button>
        </div>
      }
    >
      <form id="new-lead-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle><UserPlus className="w-4 h-4 text-gold" />Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input {...register('name', { required: 'Name is required' })} placeholder="Lead's full name" className={inputClass} />
                    {errors.name && <p className={errorClass}>{errors.name.message as string}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Mobile Number *</label>
                    <input {...register('mobile', { required: 'Mobile is required', minLength: { value: 10, message: 'Enter valid number' } })} placeholder="+91 9876543210" className={inputClass} />
                    {errors.mobile && <p className={errorClass}>{errors.mobile.message as string}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input {...register('email')} type="email" placeholder="lead@email.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input {...register('city')} placeholder="City" className={inputClass} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lead Details */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <select {...register('source', { required: true })} className={selectClass}>
                      {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Initial Status</label>
                    <select {...register('status')} className={selectClass}>
                      {LEAD_STATUSES.slice(0, 6).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Property Type Interested</label>
                    <select {...register('propertyType')} className={selectClass}>
                      <option value="">Not specified</option>
                      {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Budget (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('budget')} type="number" placeholder="e.g. 8500000" className={`${inputClass} pl-7`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Project Interested In</label>
                    <select {...register('projectId')} className={selectClass}>
                      <option value="">Select project</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Assign To</label>
                    <select {...register('assignedToId')} className={selectClass}>
                      <option value="">Auto-assign / Me</option>
                      {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role?.replace(/_/g, ' ')})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Next Followup Date</label>
                    <input {...register('nextFollowupDate')} type="date" className={inputClass} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card>
              <CardHeader><CardTitle>Initial Remarks</CardTitle></CardHeader>
              <CardContent>
                <textarea {...register('remarks')} rows={4} placeholder="Add any initial notes about this lead — how they enquired, their requirements, any special notes..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
              </CardContent>
            </Card>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">What Happens Next</p>
                <div className="space-y-2.5 text-xs text-slate">
                  {[
                    ['1', 'Lead is created with NEW status'],
                    ['2', 'Activity log is created automatically'],
                    ['3', 'Assigned executive receives notification'],
                    ['4', 'Duplicate check runs against existing leads'],
                    ['5', 'Followup reminder is scheduled'],
                  ].map(([n, text]) => (
                    <div key={n} className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-[9px] font-bold text-gold flex-shrink-0">{n}</div>
                      <p className="text-slate leading-tight mt-0.5">{text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Lead Sources</p>
                <div className="space-y-1.5">
                  {LEAD_SOURCES.map(s => (
                    <div key={s.value} className="flex items-center gap-2 text-xs text-slate">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
                      {s.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button type="submit" form="new-lead-form" loading={createMutation.isPending} icon={<UserPlus className="w-4 h-4" />} className="w-full">
              Create Lead
            </Button>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}

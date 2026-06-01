'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { leadApi } from '@/lib/api'
import { LEAD_SOURCES, LEAD_STATUSES, PROPERTY_TYPES } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createLeadSchema } from '@/types/schemas'
import { ArrowLeft, Save, User } from 'lucide-react'
import Link from 'next/link'

type EditLeadFormValues = {
  name: string
  mobile: string
  email: string
  budget: string
  city: string
  source: string
  status: string
  propertyType: string
  remarks: string
  nextFollowupDate: string
}

export default function LeadEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadApi.getById(id),
    enabled: !!id,
  })

  const lead = data?.data?.data

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditLeadFormValues>({
    values: lead
      ? ({
          name: lead.name,
          mobile: lead.mobile,
          email: lead.email || '',
          budget: lead.budget || '',
          city: lead.city || '',
          source: lead.source,
          status: lead.status,
          propertyType: lead.propertyType || '',
          remarks: lead.remarks || '',
          nextFollowupDate: lead.nextFollowupDate
            ? new Date(lead.nextFollowupDate).toISOString().slice(0, 10)
            : '',
        } as EditLeadFormValues)
      : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => leadApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead updated successfully')
      router.push(`/leads/${id}`)
    },
    onError: () => toast.error('Failed to update lead'),
  })

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      budget: data.budget ? parseFloat(data.budget) : null,
      nextFollowupDate: data.nextFollowupDate || null,
      propertyType: data.propertyType || null,
    }
    updateMutation.mutate(payload)
  }

  if (isLoading) return (
    <AppLayout title="Edit Lead">
      <div className="flex items-center justify-center h-64">
        <div className="text-slate text-sm">Loading lead...</div>
      </div>
    </AppLayout>
  )

  if (!lead) return (
    <AppLayout title="Lead Not Found">
      <div className="text-center py-16 text-slate">Lead not found</div>
    </AppLayout>
  )

  const Field = ({ label, required, error, children }: any) => (
    <div>
      <label className="block text-xs font-medium text-slate-light mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )

  const inputClass = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-colors"
  const selectClass = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-colors"

  return (
    <AppLayout
      title={`Edit — ${lead.name}`}
      subtitle="Update lead information"
      actions={
        <div className="flex gap-2">
          <Link href={`/leads/${id}`}>
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="lead-edit-form"
            loading={updateMutation.isPending}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <form id="lead-edit-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">

            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle><User className="w-4 h-4 text-gold" />Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name" required error={errors.name?.message as string}>
                    <input {...register('name', { required: 'Name is required' })} className={inputClass} placeholder="Full name" />
                  </Field>

                  <Field label="Mobile Number" required error={errors.mobile?.message as string}>
                    <input {...register('mobile', { required: 'Mobile is required' })} className={inputClass} placeholder="+91 XXXXX XXXXX" />
                  </Field>

                  <Field label="Email Address">
                    <input {...register('email')} type="email" className={inputClass} placeholder="email@example.com" />
                  </Field>

                  <Field label="City">
                    <input {...register('city')} className={inputClass} placeholder="City" />
                  </Field>

                  <Field label="Budget (₹)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">₹</span>
                      <input {...register('budget')} type="number" className={`${inputClass} pl-7`} placeholder="Budget amount" />
                    </div>
                  </Field>

                  <Field label="Next Followup Date">
                    <input {...register('nextFollowupDate')} type="date" className={inputClass} />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Lead Classification */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Classification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Lead Source" required error={errors.source?.message as string}>
                    <select {...register('source', { required: 'Source is required' })} className={selectClass}>
                      {LEAD_SOURCES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Lead Status">
                    <select {...register('status')} className={selectClass}>
                      {LEAD_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Property Type">
                    <select {...register('propertyType')} className={selectClass}>
                      <option value="">Not specified</option>
                      {PROPERTY_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card>
              <CardHeader>
                <CardTitle>Remarks & Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  {...register('remarks')}
                  rows={4}
                  placeholder="Add remarks about this lead..."
                  className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Lead Info</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate">Lead ID</span>
                    <span className="text-slate-light font-mono text-[10px]">{lead.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate">Duplicate</span>
                    <span className={lead.isDuplicate ? 'text-red-400' : 'text-green-400'}>
                      {lead.isDuplicate ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate">Score</span>
                    <span className="text-gold font-medium">{lead.score}/100</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Quick Actions</p>
                <div className="space-y-2">
                  <Link href={`/leads/${id}`}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                      View Lead Profile
                    </Button>
                  </Link>
                  <Link href={`/quotations/new?leadId=${id}`}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                      Create Quotation
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                type="submit"
                form="lead-edit-form"
                loading={updateMutation.isPending}
                icon={<Save className="w-3.5 h-3.5" />}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}

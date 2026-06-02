'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { customerApi } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, UserCheck, Shield } from 'lucide-react'
import Link from 'next/link'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
]

export default function NewCustomerPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: any) => customerApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer created successfully')
      router.push(`/customers/${res.data.data.id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create customer'),
  })

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      panNumber: data.panNumber?.toUpperCase() || null,
      aadhaarNumber: data.aadhaarNumber || null,
    }
    createMutation.mutate(payload)
  }

  const inputClass = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50"
  const selectClass = "w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
  const labelClass = "block text-xs font-medium text-slate-light mb-1.5"
  const errorClass = "text-[11px] text-red-400 mt-1"

  return (
    <AppLayout
      title="Add New Customer"
      subtitle="Create a customer profile for bookings"
      actions={
        <div className="flex gap-2">
          <Link href="/customers">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Cancel</Button>
          </Link>
          <Button type="submit" form="new-customer-form" loading={createMutation.isPending} icon={<Save className="w-3.5 h-3.5" />}>
            Create Customer
          </Button>
        </div>
      }
    >
      <form id="new-customer-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">

            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle><UserCheck className="w-4 h-4 text-gold" />Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input {...register('name', { required: 'Name is required' })} placeholder="Customer full name" className={inputClass} />
                    {errors.name && <p className={errorClass}>{errors.name.message as string}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Mobile Number *</label>
                    <input {...register('mobile', { required: 'Mobile is required' })} placeholder="+91 9876543210" className={inputClass} />
                    {errors.mobile && <p className={errorClass}>{errors.mobile.message as string}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input {...register('email')} type="email" placeholder="customer@email.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Alternate Phone</label>
                    <input {...register('alternatePhone')} placeholder="Alternate number" className={inputClass} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KYC Details */}
            <Card>
              <CardHeader>
                <CardTitle><Shield className="w-4 h-4 text-gold" />KYC Details</CardTitle>
                <span className="text-[10px] text-slate">Required for booking registration</span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      {...register('panNumber', {
                        pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'Invalid PAN (e.g. ABCDE1234F)' },
                        setValueAs: v => v?.toUpperCase(),
                      })}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className={`${inputClass} uppercase`}
                    />
                    {errors.panNumber && <p className={errorClass}>{errors.panNumber.message as string}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Aadhaar Number</label>
                    <input
                      {...register('aadhaarNumber', {
                        minLength: { value: 12, message: 'Must be 12 digits' },
                        maxLength: { value: 12, message: 'Must be 12 digits' },
                        pattern: { value: /^[0-9]{12}$/, message: 'Only digits allowed' },
                      })}
                      placeholder="123456789012"
                      maxLength={12}
                      className={inputClass}
                    />
                    {errors.aadhaarNumber && <p className={errorClass}>{errors.aadhaarNumber.message as string}</p>}
                  </div>
                </div>
                <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5 text-[11px] text-blue-400">
                  KYC verification can be completed after creating the customer. Documents can be uploaded from the customer profile.
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle>Address Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelClass}>Full Address</label>
                    <textarea {...register('address')} rows={2} placeholder="House/Flat No., Street, Area..." className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate/40 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none" />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input {...register('city')} placeholder="City" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <select {...register('state')} className={selectClass}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>PIN Code</label>
                    <input {...register('pincode')} placeholder="500001" maxLength={6} className={inputClass} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">Required for Booking</p>
                <div className="space-y-2 text-xs text-slate">
                  {[
                    ['Mobile', 'Required for all communications'],
                    ['PAN Card', 'Required for property registration'],
                    ['Aadhaar', 'Required for identity verification'],
                    ['Address', 'Required for agreement documentation'],
                    ['Email', 'For sending invoices and updates'],
                  ].map(([field, desc]) => (
                    <div key={field} className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-slate-light font-medium">{field}</span>
                        <span className="text-slate"> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-3">After Creating</p>
                <div className="space-y-2 text-xs text-slate">
                  {[
                    'Upload KYC documents (PAN, Aadhaar)',
                    'Link to a booking',
                    'Record payments',
                    'Track agreement status',
                  ].map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-4 h-4 rounded-full bg-navy-light border border-navy-border flex items-center justify-center text-[9px] text-gold flex-shrink-0">{i + 1}</div>
                      <p className="leading-tight mt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button type="submit" form="new-customer-form" loading={createMutation.isPending} icon={<UserCheck className="w-4 h-4" />} className="w-full">
              Create Customer
            </Button>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}

'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, Table, Tr, Td, SearchInput, EmptyState, Badge } from '@/components/ui/index'
import { customerApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { UserCheck, Eye, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customerApi.getAll({ search: search || undefined }),
  })
  const customers = data?.data?.data || []

  return (
    <AppLayout title="Customers" subtitle={`${customers.length} customers`}>
      <div className="flex gap-2 mb-4"><div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search customers..." /></div></div>
      <Card>
        <Table headers={['Name', 'Mobile', 'Email', 'PAN', 'KYC', 'Bookings', 'Joined', 'Actions']}>
          {isLoading ? <tr><td colSpan={8} className="py-12 text-center text-slate text-sm">Loading...</td></tr>
          : customers.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<UserCheck className="w-10 h-10" />} title="No customers found" /></td></tr>
          : customers.map((c: any) => (
            <Tr key={c.id}>
              <Td className="text-white font-medium">{c.name}</Td>
              <Td>{c.mobile}</Td>
              <Td className="text-xs text-slate">{c.email || '—'}</Td>
              <Td className="text-xs text-slate font-mono">{c.panNumber || '—'}</Td>
              <Td>
                {c.isKycVerified
                  ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5" />Verified</span>
                  : <span className="text-xs text-slate">Pending</span>}
              </Td>
              <Td className="text-gold font-medium">{c._count?.bookings || 0}</Td>
              <Td className="text-xs text-slate">{formatDate(c.createdAt)}</Td>
              <Td><Link href={`/customers/${c.id}`}><button className="p-1.5 text-slate hover:text-white hover:bg-navy-light rounded transition-colors"><Eye className="w-3.5 h-3.5" /></button></Link></Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </AppLayout>
  )
}

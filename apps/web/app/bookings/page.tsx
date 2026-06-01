'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Table, Tr, Td, SearchInput, EmptyState } from '@/components/ui/index'
import { bookingApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BookOpen, Eye } from 'lucide-react'
import Link from 'next/link'

const AGMT_STYLES: Record<string, string> = {
  PENDING: 'bg-slate/20 text-slate border-slate/30',
  INITIATED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
  REGISTERED: 'bg-gold/20 text-gold border-gold/30',
}

export default function BookingsPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['bookings', search],
    queryFn: () => bookingApi.getAll({ search: search || undefined }),
  })
  const bookings = data?.data?.data || []

  return (
    <AppLayout title="Bookings" subtitle={`${bookings.length} bookings`}>
      <div className="flex gap-2 mb-4"><div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search bookings..." /></div></div>
      <Card>
        <Table headers={['Booking No.', 'Customer', 'Unit', 'Total', 'Collected', 'Due', 'Agreement', 'Date', 'Actions']}>
          {isLoading ? <tr><td colSpan={9} className="py-12 text-center text-slate text-sm">Loading...</td></tr>
          : bookings.length === 0 ? <tr><td colSpan={9}><EmptyState icon={<BookOpen className="w-10 h-10" />} title="No bookings found" /></td></tr>
          : bookings.map((b: any) => (
            <Tr key={b.id}>
              <Td className="text-white font-medium">{b.bookingNumber}</Td>
              <Td>
                <div><p className="text-white text-xs font-medium">{b.customer?.name}</p><p className="text-slate text-[10px]">{b.customer?.mobile}</p></div>
              </Td>
              <Td className="text-xs text-slate">{b.inventory?.unitNumber} {b.inventory?.tower && `· ${b.inventory.tower}`}</Td>
              <Td className="text-gold font-medium">{formatCurrency(b.totalAmount)}</Td>
              <Td className="text-green-400">{formatCurrency(b.collectedAmount)}</Td>
              <Td className={b.dueAmount > 0 ? 'text-red-400 font-medium' : 'text-slate'}>{formatCurrency(b.dueAmount)}</Td>
              <Td><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${AGMT_STYLES[b.agreementStatus] || ''}`}>{b.agreementStatus?.replace(/_/g, ' ')}</span></Td>
              <Td className="text-xs text-slate">{formatDate(b.bookingDate)}</Td>
              <Td><Link href={`/bookings/${b.id}`}><button className="p-1.5 text-slate hover:text-white hover:bg-navy-light rounded transition-colors"><Eye className="w-3.5 h-3.5" /></button></Link></Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </AppLayout>
  )
}

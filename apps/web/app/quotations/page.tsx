'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Table, Tr, Td, SearchInput, EmptyState, Badge } from '@/components/ui/index'
import { quotationApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, FileText, Eye, Send, Download } from 'lucide-react'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate/20 text-slate border-slate/30',
  SHARED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NEGOTIATION: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
  CONVERTED: 'bg-gold/20 text-gold border-gold/30',
}

export default function QuotationsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', search, statusFilter],
    queryFn: () => quotationApi.getAll({ search: search || undefined, status: statusFilter || undefined }),
  })

  const quotations = data?.data?.data || []

  return (
    <AppLayout title="Quotations" subtitle={`${quotations.length} quotations`}
      actions={<Link href="/quotations/new"><Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}>New Quotation</Button></Link>}
    >
      <div className="flex gap-2 mb-4">
        <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search quotations..." /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50">
          <option value="">All Status</option>
          {['DRAFT','SHARED','NEGOTIATION','APPROVED','CONVERTED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Card>
        <Table headers={['Quotation No.', 'Lead', 'Property Type', 'Area', 'Total Amount', 'Status', 'Created', 'Actions']}>
          {isLoading ? <tr><td colSpan={8} className="py-12 text-center text-slate text-sm">Loading...</td></tr>
          : quotations.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<FileText className="w-10 h-10" />} title="No quotations found" /></td></tr>
          : quotations.map((q: any) => (
            <Tr key={q.id}>
              <Td className="text-white font-medium">{q.quotationNumber}</Td>
              <Td>{q.lead?.name || '—'}</Td>
              <Td className="text-xs text-slate">{q.propertyType}</Td>
              <Td>{q.area} sq.ft</Td>
              <Td className="text-gold font-medium">{formatCurrency(q.totalAmount)}</Td>
              <Td><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[q.status] || ''}`}>{q.status}</span></Td>
              <Td className="text-xs text-slate">{formatDate(q.createdAt)}</Td>
              <Td>
                <div className="flex gap-1">
                  <Link href={`/quotations/${q.id}`}><button className="p-1.5 text-slate hover:text-white hover:bg-navy-light rounded transition-colors"><Eye className="w-3.5 h-3.5" /></button></Link>
                  <button className="p-1.5 text-slate hover:text-blue-400 hover:bg-navy-light rounded transition-colors"><Send className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 text-slate hover:text-gold hover:bg-navy-light rounded transition-colors"><Download className="w-3.5 h-3.5" /></button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </AppLayout>
  )
}

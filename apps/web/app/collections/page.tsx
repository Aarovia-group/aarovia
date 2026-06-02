'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, Table, Tr, Td, SearchInput, StatCard, EmptyState } from '@/components/ui/index'
import { reportApi } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { Coins, AlertCircle, TrendingUp, Download, Clock, CheckCircle, User, Building2 } from 'lucide-react'

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'due'>('payments')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['collections-report', from, to],
    queryFn: () => reportApi.getCollections({ from: from || undefined, to: to || undefined }),
  })

  const report = data?.data?.data
  const payments = report?.payments || []
  const overdueBookings = report?.overdueBookings || []
  const totalCollected = report?.totalCollected || 0
  const totalDue = report?.totalDue || 0

  const PAYMENT_MODE_COLOR: Record<string, string> = {
    BOOKING: 'text-gold',
    CHEQUE: 'text-blue-400',
    NEFT: 'text-purple-400',
    RTGS: 'text-cyan-400',
    CASH: 'text-green-400',
    UPI: 'text-orange-400',
    DD: 'text-pink-400',
  }

  return (
    <AppLayout
      title="Collections"
      subtitle="Payment tracking and due amount management"
      actions={
        <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Export</Button>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total Collected"
          value={formatCurrency(totalCollected)}
          icon={<Coins className="w-4 h-4" />}
          accentColor="gold"
        />
        <StatCard
          label="Total Due"
          value={formatCurrency(totalDue)}
          icon={<AlertCircle className="w-4 h-4" />}
          accentColor="red"
        />
        <StatCard
          label="Transactions"
          value={payments.length}
          icon={<TrendingUp className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          label="Overdue Bookings"
          value={overdueBookings.length}
          icon={<Clock className="w-4 h-4" />}
          accentColor="orange"
        />
      </div>

      {/* Date filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-navy-mid border border-navy-border rounded-lg px-3 py-2">
          <span className="text-xs text-slate">From</span>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-navy-mid border border-navy-border rounded-lg px-3 py-2">
          <span className="text-xs text-slate">To</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none"
          />
        </div>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo('') }}>Clear</Button>
        )}
        <div className="flex bg-navy-mid border border-navy-border rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${activeTab === 'payments' ? 'bg-gold/20 text-gold' : 'text-slate hover:text-white'}`}
          >
            Payments ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('due')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${activeTab === 'due' ? 'bg-red-500/20 text-red-400' : 'text-slate hover:text-white'}`}
          >
            Due ({overdueBookings.length})
          </button>
        </div>
      </div>

      {activeTab === 'payments' ? (
        <Card>
          <Table headers={['Customer', 'Unit', 'Amount', 'Mode', 'Transaction ID', 'Notes', 'Date']}>
            {isLoading ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate text-sm">Loading payments...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState icon={<Coins className="w-10 h-10" />} title="No payments found" description="Payments will appear here once recorded." />
              </td></tr>
            ) : payments.map((p: any) => (
              <Tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-navy-light border border-navy-border flex items-center justify-center text-[9px] font-bold text-gold flex-shrink-0">
                      {p.booking?.customer?.name?.charAt(0)}
                    </div>
                    <span className="text-white text-xs font-medium">{p.booking?.customer?.name}</span>
                  </div>
                </Td>
                <Td className="text-xs text-slate">{p.booking?.inventory?.unitNumber || '—'}</Td>
                <Td className="text-gold font-semibold">{formatCurrency(p.amount)}</Td>
                <Td>
                  <span className={`text-xs font-medium ${PAYMENT_MODE_COLOR[p.paymentMode] || 'text-slate'}`}>
                    {p.paymentMode}
                  </span>
                </Td>
                <Td className="text-xs font-mono text-slate">{p.transactionId || '—'}</Td>
                <Td className="text-xs text-slate max-w-[150px] truncate">{p.notes || '—'}</Td>
                <Td className="text-xs text-slate">{formatDateTime(p.paymentDate)}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      ) : (
        <div className="space-y-3">
          {overdueBookings.length === 0 ? (
            <Card>
              <div className="py-16 text-center">
                <CheckCircle className="w-10 h-10 text-green-500/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-light">No overdue payments</p>
                <p className="text-xs text-slate mt-1">All customers are up to date</p>
              </div>
            </Card>
          ) : overdueBookings.map((b: any) => {
            const percentage = Math.round((b.collectedAmount / b.totalAmount) * 100)
            return (
              <Card key={b.id} className="hover:border-red-500/30 transition-colors">
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-navy border border-navy-border flex items-center justify-center text-sm font-bold text-red-400">
                        {b.customer?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{b.customer?.name}</p>
                        <p className="text-xs text-slate">{b.customer?.mobile}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate mb-0.5">Due Amount</p>
                      <p className="text-base font-display font-semibold text-red-400">{formatCurrency(b.dueAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3 text-xs text-slate">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Unit: {b.inventory?.unitNumber || '—'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5" />
                      Total: {formatCurrency(b.totalAmount)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500/60" />
                      Paid: {formatCurrency(b.collectedAmount)}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate mb-1">
                      <span>Collection Progress</span>
                      <span className={percentage >= 75 ? 'text-green-400' : percentage >= 40 ? 'text-yellow-400' : 'text-red-400'}>{percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-navy rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${percentage >= 75 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}

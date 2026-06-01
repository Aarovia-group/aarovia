'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/index'
import { reportApi } from '@/lib/api'
import { formatCurrency, formatDate, getSourceLabel, getLeadStatusLabel } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Download, FileText, BarChart3, Users, Coins, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type ReportType = 'leads' | 'revenue' | 'team' | 'inventory' | 'collections'

const REPORTS = [
  { key: 'leads' as ReportType, label: 'Lead Report', icon: Users, description: 'All leads with status, source, budget, assigned executive' },
  { key: 'revenue' as ReportType, label: 'Revenue Report', icon: Coins, description: 'Monthly revenue breakdown with transaction counts' },
  { key: 'team' as ReportType, label: 'Team Performance', icon: BarChart3, description: 'Per-executive leads, bookings, site visits, conversion rates' },
  { key: 'inventory' as ReportType, label: 'Inventory Report', icon: Home, description: 'All units by project, status, area, value' },
  { key: 'collections' as ReportType, label: 'Collections Report', icon: FileText, description: 'Payment history and overdue bookings' },
]

const downloadCSV = (data: any[], filename: string) => {
  if (!data.length) { toast.error('No data to export'); return }
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => {
    const v = row[h]
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v).includes(',') ? `"${v}"` : v
  }).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`${filename} exported successfully`)
}

export default function ReportsExportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState<ReportType | null>(null)

  const { data: revenueData } = useQuery({ queryKey: ['monthly-revenue-12'], queryFn: () => reportApi.getMonthlyRevenue(12) })
  const { data: teamData }    = useQuery({ queryKey: ['team-performance-export'], queryFn: () => reportApi.getTeamPerformance({ from, to }) })
  const { data: sourceData }  = useQuery({ queryKey: ['lead-sources-export'], queryFn: () => reportApi.getLeadSources() })
  const { data: collectData } = useQuery({ queryKey: ['collections-export', from, to], queryFn: () => reportApi.getCollections({ from: from || undefined, to: to || undefined }) })

  const handleExport = async (type: ReportType) => {
    setLoading(type)
    try {
      switch (type) {
        case 'revenue': {
          const rows = (revenueData?.data?.data || []).map((r: any) => ({
            Month: r.month,
            Revenue: r.revenue,
            Transactions: r.transactions,
            'Avg per Transaction': r.transactions > 0 ? Math.round(r.revenue / r.transactions) : 0,
          }))
          downloadCSV(rows, 'revenue_report')
          break
        }
        case 'team': {
          const rows = (teamData?.data?.data || []).map((m: any) => ({
            Name: m.name,
            Role: m.role?.replace(/_/g, ' '),
            'Total Leads': m.leads,
            Bookings: m.bookings,
            'Site Visits': m.siteVisits,
            'Call Logs': m.callLogs,
            'Conversion Rate': `${m.conversionRate}%`,
          }))
          downloadCSV(rows, 'team_performance')
          break
        }
        case 'leads': {
          const rows = (sourceData?.data?.data || []).map((s: any) => ({
            Source: getSourceLabel(s.source),
            Count: s.count,
            Percentage: `${s.percentage}%`,
          }))
          downloadCSV(rows, 'lead_sources')
          break
        }
        case 'collections': {
          const report = collectData?.data?.data
          const rows = (report?.payments || []).map((p: any) => ({
            Customer: p.booking?.customer?.name,
            Unit: p.booking?.inventory?.unitNumber,
            Amount: p.amount,
            Mode: p.paymentMode,
            'Transaction ID': p.transactionId || '',
            Date: formatDate(p.paymentDate),
          }))
          downloadCSV(rows, 'collections_report')
          break
        }
        case 'inventory': {
          toast.info('Fetching inventory data...')
          const res = await fetch('/api/inventory?limit=500', { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('aarovia-auth') || '{}')?.state?.token}` } })
          const json = await res.json()
          const rows = (json.data || []).map((u: any) => ({
            'Unit Number': u.unitNumber,
            Tower: u.tower || '',
            Floor: u.floor || '',
            'Area (sq.ft)': u.area,
            'Base Rate': u.baseRate,
            'Total Value': u.area * u.baseRate,
            Status: u.status,
            Type: u.propertyType,
            Facing: u.facing || '',
            Project: u.project?.name || '',
            Customer: u.customer?.name || '',
          }))
          downloadCSV(rows, 'inventory_report')
          break
        }
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <AppLayout
      title="Export Reports"
      subtitle="Download CRM data as CSV for analysis"
      actions={
        <Link href="/reports">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Back to Reports</Button>
        </Link>
      }
    >
      {/* Date filter */}
      <Card className="mb-5">
        <CardContent className="py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-xs font-medium text-slate-light">Date Range Filter</p>
            <div className="flex items-center gap-2 bg-navy rounded-lg border border-navy-border px-3 py-1.5">
              <span className="text-xs text-slate">From</span>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 bg-navy rounded-lg border border-navy-border px-3 py-1.5">
              <span className="text-xs text-slate">To</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none" />
            </div>
            {(from || to) && (
              <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo('') }}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(report => (
          <Card key={report.key} className="hover:border-gold/30 transition-colors">
            <CardContent className="py-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                  <report.icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{report.label}</p>
                  <p className="text-xs text-slate mt-0.5 leading-relaxed">{report.description}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                icon={<Download className="w-3.5 h-3.5" />}
                loading={loading === report.key}
                onClick={() => handleExport(report.key)}
              >
                Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info note */}
      <div className="mt-5 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-xs text-blue-400 font-medium mb-1">About Exports</p>
        <p className="text-xs text-blue-400/80 leading-relaxed">
          All exports are in CSV format and can be opened in Microsoft Excel, Google Sheets, or any spreadsheet application.
          Large datasets may take a moment to generate. Date filters apply where relevant.
        </p>
      </div>
    </AppLayout>
  )
}

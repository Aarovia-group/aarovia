'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/index'
import { reportApi } from '@/lib/api'
import { formatCurrency, getSourceLabel } from '@/lib/utils'
import { Download, BarChart3, TrendingUp, Users, Coins, Home, PieChart } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend, Funnel, FunnelChart
} from 'recharts'

const COLORS = ['#C9A84C', '#3498DB', '#E67E22', '#9B59B6', '#2ECC71', '#E74C3C', '#1ABC9C', '#F39C12']
const STATUS_ORDER = ['NEW', 'FOLLOWUP', 'INTERESTED', 'QUALIFIED', 'SITE_VISIT_FIXED', 'SITE_VISIT_DONE', 'OPPORTUNITY', 'BOOKED']

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('overview')
  const [months, setMonths] = useState(6)

  const { data: revenueData } = useQuery({
    queryKey: ['monthly-revenue', months],
    queryFn: () => reportApi.getMonthlyRevenue(months),
  })

  const { data: sourceData } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => reportApi.getLeadSources(),
  })

  const { data: teamData } = useQuery({
    queryKey: ['team-performance'],
    queryFn: () => reportApi.getTeamPerformance(),
  })

  const { data: statusData } = useQuery({
    queryKey: ['lead-status'],
    queryFn: () => reportApi.getCollections,
  })

  const revenue = revenueData?.data?.data || []
  const sources = sourceData?.data?.data || []
  const team = teamData?.data?.data || []

  const totalRevenue = revenue.reduce((s: number, r: any) => s + (r.revenue || 0), 0)
  const avgMonthly = revenue.length ? totalRevenue / revenue.length : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-xs shadow-xl">
          <p className="text-slate mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-medium">
              {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const reports = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'revenue', label: 'Revenue', icon: TrendingUp },
    { key: 'leads', label: 'Lead Analytics', icon: Users },
    { key: 'team', label: 'Team Performance', icon: Users },
    { key: 'inventory', label: 'Inventory', icon: Home },
  ]

  return (
    <AppLayout
      title="Reports & Analytics"
      subtitle="Business intelligence and performance metrics"
      actions={
        <div className="flex gap-2">
          <select
            value={months}
            onChange={e => setMonths(parseInt(e.target.value))}
            className="bg-navy-mid border border-navy-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Export</Button>
        </div>
      }
    >
      {/* Report tabs */}
      <div className="flex gap-1 mb-5 bg-navy-mid border border-navy-border rounded-lg p-1 w-full sm:w-fit overflow-x-auto scrollbar-hide">
        {reports.map(r => (
          <button
            key={r.key}
            onClick={() => setActiveReport(r.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeReport === r.key ? 'bg-gold/20 text-gold' : 'text-slate hover:text-white'}`}
          >
            <r.icon className="w-3.5 h-3.5" />{r.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeReport === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} accentColor="gold" icon={<Coins className="w-4 h-4" />} />
            <StatCard label="Avg Monthly" value={formatCurrency(avgMonthly)} accentColor="green" icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard label="Total Sources" value={sources.length} accentColor="blue" icon={<PieChart className="w-4 h-4" />} />
            <StatCard label="Team Members" value={team.length} accentColor="orange" icon={<Users className="w-4 h-4" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle><TrendingUp className="w-4 h-4 text-gold" />Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2.5} dot={{ fill: '#C9A84C', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle><BarChart3 className="w-4 h-4 text-gold" />Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sources} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="source" type="category" tick={{ fill: '#8BA3C4', fontSize: 10 }} axisLine={false} tickLine={false} width={90} tickFormatter={getSourceLabel} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#C9A84C" radius={[0, 4, 4, 0]}>
                      {sources.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Revenue Report */}
      {activeReport === 'revenue' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle><TrendingUp className="w-4 h-4 text-gold" />Monthly Revenue ({months} months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#C9A84C" radius={[4, 4, 0, 0]}>
                    {revenue.map((_: any, i: number) => (
                      <Cell key={i} fill={i === revenue.length - 1 ? '#E8C96A' : '#C9A84C'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-border">
                      <th className="text-left py-2.5 px-3 text-xs text-slate font-medium">Month</th>
                      <th className="text-right py-2.5 px-3 text-xs text-slate font-medium">Revenue</th>
                      <th className="text-right py-2.5 px-3 text-xs text-slate font-medium">Transactions</th>
                      <th className="text-right py-2.5 px-3 text-xs text-slate font-medium">Avg per Txn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-border/50">
                    {revenue.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-navy-light/20">
                        <td className="py-2.5 px-3 text-slate-light">{r.month}</td>
                        <td className="py-2.5 px-3 text-right text-gold font-medium">{formatCurrency(r.revenue)}</td>
                        <td className="py-2.5 px-3 text-right text-slate">{r.transactions}</td>
                        <td className="py-2.5 px-3 text-right text-slate">{r.transactions ? formatCurrency(r.revenue / r.transactions) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-navy-border bg-navy-light/20">
                      <td className="py-2.5 px-3 font-medium text-white">Total</td>
                      <td className="py-2.5 px-3 text-right text-gold font-bold">{formatCurrency(totalRevenue)}</td>
                      <td className="py-2.5 px-3 text-right text-white">{revenue.reduce((s: number, r: any) => s + r.transactions, 0)}</td>
                      <td className="py-2.5 px-3 text-right text-white">{formatCurrency(avgMonthly)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Performance */}
      {activeReport === 'team' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle><Users className="w-4 h-4 text-gold" />Team Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={team.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#8BA3C4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(n: string) => n.split(' ')[0]} />
                  <YAxis tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="leads" fill="#3498DB" name="Leads" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="bookings" fill="#C9A84C" name="Bookings" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="siteVisits" fill="#2ECC71" name="Site Visits" radius={[3, 3, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="space-y-1">
                {team.map((member: any, i: number) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-light/30 transition-colors">
                    <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center text-navy text-[10px] font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-navy border border-navy-border flex items-center justify-center text-xs font-bold text-gold flex-shrink-0">
                      {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{member.name}</p>
                      <p className="text-[10px] text-slate">{member.role?.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-center">
                        <p className="text-blue-400 font-medium">{member.leads}</p>
                        <p className="text-slate text-[9px]">Leads</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gold font-medium">{member.bookings}</p>
                        <p className="text-slate text-[9px]">Booked</p>
                      </div>
                      <div className="text-center">
                        <p className="text-green-400 font-medium">{member.siteVisits}</p>
                        <p className="text-slate text-[9px]">Visits</p>
                      </div>
                      <div className="text-center hidden md:block">
                        <p className="text-purple-400 font-medium">{member.conversionRate}%</p>
                        <p className="text-slate text-[9px]">Conv.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lead Analytics */}
      {activeReport === 'leads' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle><PieChart className="w-4 h-4 text-gold" />Leads by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={sources} cx="50%" cy="50%" outerRadius={90} dataKey="count" label={({ source, percentage }: any) => `${getSourceLabel(source)} ${percentage}%`} labelLine={false}>
                    {sources.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any, p: any) => [v, getSourceLabel(p?.payload?.source)]} />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><BarChart3 className="w-4 h-4 text-gold" />Source Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-light w-28 flex-shrink-0">{getSourceLabel(s.source)}</span>
                    <div className="flex-1 h-2 bg-navy rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${s.percentage}%`, background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <span className="text-xs text-gold font-medium w-8 text-right">{s.count}</span>
                    <span className="text-xs text-slate w-10 text-right">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory report placeholder */}
      {activeReport === 'inventory' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="w-10 h-10 text-slate/30 mx-auto mb-3" />
            <p className="text-sm text-slate-light">Inventory analytics</p>
            <p className="text-xs text-slate mt-1">Select a project to view detailed inventory reports</p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  )
}

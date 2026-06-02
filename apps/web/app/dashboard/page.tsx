'use client'

import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatCard, Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui/index'
import { reportApi, leadApi } from '@/lib/api'
import { formatCurrency, formatRelativeTime, getLeadStatusColor, getLeadStatusLabel, getSourceLabel } from '@/lib/utils'
import {
  Users, UserPlus, Calendar, BookOpen, Coins, AlertCircle,
  Clock, Home, TrendingUp, BarChart3, Plus, Download, RefreshCw,
  Phone, Mail, MessageSquare, MapPin, FileText, Zap
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import Link from 'next/link'

const COLORS = ['#3498DB', '#E67E22', '#9B59B6', '#2ECC71', '#C9A84C', '#E74C3C']

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => reportApi.getDashboard(),
    refetchInterval: 60000,
  })

  const { data: revenueData } = useQuery({
    queryKey: ['monthly-revenue'],
    queryFn: () => reportApi.getMonthlyRevenue(6),
  })

  const { data: sourceData } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => reportApi.getLeadSources(),
  })

  const { data: teamData } = useQuery({
    queryKey: ['team-performance'],
    queryFn: () => reportApi.getTeamPerformance(),
  })

  const { data: pipelineData } = useQuery({
    queryKey: ['lead-pipeline'],
    queryFn: () => leadApi.getPipeline(),
  })

  const stats = statsData?.data?.data
  const revenue = revenueData?.data?.data || []
  const sources = sourceData?.data?.data || []
  const team = teamData?.data?.data || []
  const pipeline = pipelineData?.data?.data || []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-navy-mid border border-navy-border rounded-lg px-3 py-2 text-xs">
          <p className="text-slate mb-1">{label}</p>
          <p className="text-gold font-medium">{formatCurrency(payload[0]?.value || 0)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => refetch()}>Refresh</Button>
          <Link href="/leads/new">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}>New Lead</Button>
          </Link>
        </div>
      }
    >
      {/* Quick Actions */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { label: 'Send Project Details', icon: <Mail className="w-3.5 h-3.5" />, href: '/email', color: 'text-blue-400' },
          { label: 'New Quotation', icon: <FileText className="w-3.5 h-3.5" />, href: '/quotations/new', color: 'text-gold' },
          { label: 'Schedule Visit', icon: <Calendar className="w-3.5 h-3.5" />, href: '/leads?action=visit', color: 'text-green-400' },
          { label: 'WhatsApp Blast', icon: <MessageSquare className="w-3.5 h-3.5" />, href: '/whatsapp', color: 'text-emerald-400' },
        ].map(a => (
          <Link key={a.label} href={a.href}>
            <button className={`flex items-center gap-1.5 px-3 py-1.5 bg-navy-mid border border-navy-border rounded-lg text-xs ${a.color} hover:border-gold/30 transition-colors`}>
              {a.icon}{a.label}
            </button>
          </Link>
        ))}
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Leads" value={stats?.totalLeads?.toLocaleString() || '—'} sub="All time" icon={<Users className="w-4 h-4" />} accentColor="gold" trend="up" trendValue={`${stats?.leadGrowth || 0}%`} />
        <StatCard label="New Today" value={stats?.newLeadsToday || '—'} sub="leads added" icon={<UserPlus className="w-4 h-4" />} accentColor="green" />
        <StatCard label="Site Visits" value={stats?.siteVisitsThisMonth || '—'} sub="this month" icon={<Calendar className="w-4 h-4" />} accentColor="blue" />
        <StatCard label="Bookings" value={stats?.bookingsThisMonth || '—'} sub="this month" icon={<BookOpen className="w-4 h-4" />} accentColor="orange" trend="up" trendValue={`${stats?.bookingGrowth || 0}%`} />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Collections" value={formatCurrency(stats?.collectionsThisMonth || 0)} sub="this month" icon={<Coins className="w-4 h-4" />} accentColor="gold" />
        <StatCard label="Due Amount" value={formatCurrency(stats?.dueAmount || 0)} sub="outstanding" icon={<AlertCircle className="w-4 h-4" />} accentColor="red" />
        <StatCard label="Followups Due" value={stats?.followupsDue || '—'} sub="pending today" icon={<Clock className="w-4 h-4" />} accentColor="orange" />
        <StatCard label="Available Units" value={stats?.inventoryAvailable || '—'} sub="across projects" icon={<Home className="w-4 h-4" />} accentColor="green" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle><TrendingUp className="w-4 h-4 text-gold" />Monthly Revenue</CardTitle>
            <span className="text-xs text-slate">Last 6 months</span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8BA3C4', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2.5} dot={{ fill: '#C9A84C', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Sources Pie */}
        <Card>
          <CardHeader>
            <CardTitle><BarChart3 className="w-4 h-4 text-gold" />Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={sources} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count" paddingAngle={2}>
                  {sources.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any, p: any) => [v, getSourceLabel(p?.payload?.source)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {sources.slice(0, 4).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate">{getSourceLabel(s.source)}</span>
                  </div>
                  <span className="text-gold font-medium">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Lead Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle><Zap className="w-4 h-4 text-gold" />Lead Pipeline</CardTitle>
            <Link href="/leads"><span className="text-xs text-gold hover:text-gold-light cursor-pointer">View all →</span></Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex gap-px overflow-x-auto scrollbar-hide p-4">
              {pipeline.slice(0, 5).map((col: any) => (
                <div key={col.status} className="min-w-[140px] flex-shrink-0 px-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLeadStatusColor(col.status)}`}>
                      {getLeadStatusLabel(col.status)}
                    </span>
                    <span className="text-[10px] text-slate">{col.count}</span>
                  </div>
                  <div className="space-y-1.5">
                    {col.leads.slice(0, 2).map((lead: any) => (
                      <Link key={lead.id} href={`/leads/${lead.id}`}>
                        <div className="bg-navy rounded-lg p-2 border border-navy-border hover:border-gold/30 transition-colors cursor-pointer">
                          <p className="text-xs font-medium text-white truncate">{lead.name}</p>
                          {lead.budget && <p className="text-[10px] text-gold mt-0.5">{formatCurrency(lead.budget)}</p>}
                          <p className="text-[9px] text-slate mt-0.5">{getSourceLabel(lead.source)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle><Users className="w-4 h-4 text-gold" />Team Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-navy-border/50">
              {team.slice(0, 5).map((member: any, i: number) => (
                <div key={member.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-navy-light border border-navy-border flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-gold">
                    {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{member.name}</p>
                    <p className="text-[10px] text-slate">{member.role?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gold">{member.leads} leads</p>
                    <p className="text-[10px] text-green-400">{member.bookings} booked</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle><Home className="w-4 h-4 text-gold" />Inventory Status Overview</CardTitle>
          <Link href="/inventory"><span className="text-xs text-gold hover:text-gold-light cursor-pointer">View inventory →</span></Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Available', value: stats?.inventoryAvailable || 0, color: 'bg-green-500', textColor: 'text-green-400' },
              { label: 'Sold', value: stats?.inventorySold || 0, color: 'bg-blue-500', textColor: 'text-blue-400' },
              { label: 'Blocked', value: 0, color: 'bg-orange-500', textColor: 'text-orange-400' },
              { label: 'Reserved', value: 0, color: 'bg-red-500', textColor: 'text-red-400' },
            ].map(item => (
              <div key={item.label} className="bg-navy rounded-lg p-3 border border-navy-border">
                <div className={`text-2xl font-display font-medium ${item.textColor} mb-1`}>{item.value}</div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-sm ${item.color}`} />
                  <span className="text-xs text-slate">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}

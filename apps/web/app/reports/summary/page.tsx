'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { AppLayout } from '@/components/layout/AppLayout'
import api from '@/lib/api'
import { ReportsSummaryFilters } from '@/components/reports/ReportsSummaryFilters'
import { ReportMetrics, ReportRow, ReportsSummaryTable } from '@/components/reports/ReportsSummaryTable'
import { ReportsExportButton } from '@/components/reports/ReportsExportButton'

const PROJECTS = ['Hara Rassai Vijayam', 'Primia', 'Lake Estate', 'Quiet Estate']

const formatInputDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const DEFAULT_FROM = formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1))
const DEFAULT_TO = formatInputDate(today)

interface ReportsSummaryResponse {
  projects: ReportRow[]
  otherProjects: ReportMetrics
  executives: ReportRow[]
  sources: ReportRow[]
  grandTotal: ReportMetrics
}

const EMPTY_METRICS: ReportMetrics = {
  total: 0,
  qualified: 0,
  qualifiedPct: 0,
  interested: 0,
  interestedPct: 0,
  siteVisitFixed: 0,
  siteVisitFixedPct: 0,
  siteVisitDone: 0,
  siteVisitDonePct: 0,
}

export default function ReportsSummaryPage() {
  const [from, setFrom] = useState(DEFAULT_FROM)
  const [to, setTo] = useState(DEFAULT_TO)
  const [projects, setProjects] = useState(PROJECTS)
  const query = useQuery({
    queryKey: ['reports-summary', from, to, projects],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: ReportsSummaryResponse }>('/reports/summary', {
        params: { from, to, projects: projects.join(',') },
      })
      return response.data.data
    },
    enabled: Boolean(from && to && from <= to),
  })

  const report = query.data
  const isForbidden = query.isError && isAxiosError(query.error) && query.error.response?.status === 403
  const projectRows = useMemo(() => report?.projects || [], [report?.projects])
  const executiveRows = useMemo(() => report?.executives || [], [report?.executives])
  const sourceRows = useMemo(() => report?.sources || [], [report?.sources])
  const exportProps = {
    projects: projectRows,
    executives: executiveRows,
    sources: sourceRows,
    grandTotal: report?.grandTotal || EMPTY_METRICS,
    otherProjectsTotal: report?.otherProjects.total || 0,
    from,
    to,
  }

  return (
    <AppLayout title="Report Summary" subtitle="Lead performance by project, executive, and source">
      <div className="space-y-4">
        <ReportsSummaryFilters
          from={from}
          to={to}
          projects={projects}
          onFromChange={setFrom}
          onToChange={setTo}
          onProjectsChange={setProjects}
        />

        <div className="flex justify-end">
          <ReportsExportButton {...exportProps} />
        </div>

        {query.isLoading && (
          <div role="status" className="rounded-lg border border-[#d8e0e8] bg-white px-4 py-8 text-center text-sm text-[#64748b]">
            Loading report...
          </div>
        )}
        {query.isError && (
          <div
            role="alert"
            className={`rounded-lg px-4 py-4 text-sm ${isForbidden ? 'border border-[#d8e0e8] bg-white text-[#475569]' : 'border border-red-200 bg-red-50 text-red-700'}`}
          >
            {isForbidden ? (
              "You don't have access to this report."
            ) : (
              <>
                Could not load the report. Please try again.
                <button type="button" onClick={() => query.refetch()} className="ml-2 font-semibold underline">Retry</button>
              </>
            )}
          </div>
        )}
        {!query.isLoading && !query.isError && (!from || !to || from > to) && (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Select a valid date range. The start date must be on or before the end date.
          </div>
        )}
        {!query.isLoading && !query.isError && from <= to && report && (
          <>
            {report.grandTotal.total === 0 && (
              <div className="rounded-lg border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-[#64748b]">
                No leads found for the selected filters.
              </div>
            )}
            <ReportsSummaryTable
              title="By Project"
              rows={projectRows}
              grandTotal={report.grandTotal}
              headerColor="#f8d7c5"
              extraColumn={{ label: 'All other source', total: report.otherProjects.total }}
            />
            <ReportsSummaryTable
              title="By Executive"
              rows={executiveRows}
              grandTotal={report.grandTotal}
              headerColor="#fff200"
            />
            <ReportsSummaryTable
              title="By Source"
              rows={sourceRows}
              grandTotal={report.grandTotal}
              headerColor="#bfeaf5"
              note="ATL/BTL not mapped yet"
            />
          </>
        )}
      </div>
    </AppLayout>
  )
}

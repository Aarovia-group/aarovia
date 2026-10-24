'use client'

import { Download } from 'lucide-react'
import { ReportMetrics, ReportRow } from './ReportsSummaryTable'

interface ReportsExportButtonProps {
  projects: ReportRow[]
  executives: ReportRow[]
  sources: ReportRow[]
  grandTotal: ReportMetrics
  otherProjectsTotal: number
  from: string
  to: string
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

export function ReportsExportButton({
  projects,
  executives,
  sources,
  grandTotal,
  otherProjectsTotal,
  from,
  to,
}: ReportsExportButtonProps) {
  const exportCsv = () => {
    const headers = [
      'Table', 'Name', 'Total Leads Count', 'Qualified Count', 'Qualified %',
      'Interested Count', 'Interested %', 'Site visit Fixed Count', 'Site visit Fixed %',
      'Site visit Done Count', 'Site visit Done %', 'All other source',
    ]
    const rows: Array<Array<string | number>> = []
    const appendTable = (table: string, data: ReportRow[], total: ReportMetrics, extra = 0) => {
      data.forEach(row => rows.push([
        table, row.name, row.total, row.qualified, `${row.qualifiedPct}%`,
        row.interested, `${row.interestedPct}%`, row.siteVisitFixed, `${row.siteVisitFixedPct}%`,
        row.siteVisitDone, `${row.siteVisitDonePct}%`, '',
      ]))
      rows.push([
        table, 'Grand Total', total.total, total.qualified, `${total.qualifiedPct}%`,
        total.interested, `${total.interestedPct}%`, total.siteVisitFixed, `${total.siteVisitFixedPct}%`,
        total.siteVisitDone, `${total.siteVisitDonePct}%`, extra,
      ])
    }

    appendTable('By Project', projects, grandTotal, otherProjectsTotal)
    appendTable('By Executive', executives, grandTotal)
    appendTable('By Source', sources, grandTotal)
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `crm_reports_${from}_to_${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      className="inline-flex items-center gap-2 rounded border border-[#d8e0e8] bg-white px-3 py-2 text-xs font-medium text-[#172033] hover:bg-[#fffaf0] transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Export to Excel/CSV
    </button>
  )
}

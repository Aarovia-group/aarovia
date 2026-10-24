'use client'

export interface ReportMetrics {
  total: number
  qualified: number
  qualifiedPct: number
  interested: number
  interestedPct: number
  siteVisitFixed: number
  siteVisitFixedPct: number
  siteVisitDone: number
  siteVisitDonePct: number
}

export interface ReportRow extends ReportMetrics {
  name: string
}

interface ReportsSummaryTableProps {
  title: string
  rows: ReportRow[]
  grandTotal: ReportMetrics
  headerColor: string
  extraColumn?: { label: string; total: number }
  note?: string
}

const columns: Array<{ label: string; value: keyof ReportMetrics }> = [
  { label: 'Total Leads Count', value: 'total' },
  { label: 'Qualified Count', value: 'qualified' },
  { label: 'Qualified %', value: 'qualifiedPct' },
  { label: 'Interested Count', value: 'interested' },
  { label: 'Interested %', value: 'interestedPct' },
  { label: 'Site visit Fixed Count', value: 'siteVisitFixed' },
  { label: 'Site visit Fixed %', value: 'siteVisitFixedPct' },
  { label: 'Site visit Done Count', value: 'siteVisitDone' },
  { label: 'Site visit Done %', value: 'siteVisitDonePct' },
]

export function ReportsSummaryTable({
  title,
  rows,
  grandTotal,
  headerColor,
  extraColumn,
  note,
}: ReportsSummaryTableProps) {
  return (
    <section className="bg-white border border-[#d8e0e8] rounded-lg overflow-hidden">
      <h2 className="px-4 py-3 text-sm font-semibold text-[#172033] border-b border-[#d8e0e8]">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse text-xs text-[#172033]">
          <thead>
            <tr style={{ backgroundColor: headerColor }}>
              <th className="border border-[#cbd5e1] px-2 py-2 text-left">SL</th>
              <th className="border border-[#cbd5e1] px-2 py-2 text-left">Name</th>
              {columns.map(column => (
                <th key={column.value} className="border border-[#cbd5e1] px-2 py-2 text-right whitespace-nowrap">
                  {column.label}
                </th>
              ))}
              {extraColumn && (
                <th className="border border-[#cbd5e1] px-2 py-2 text-right whitespace-nowrap">
                  {extraColumn.label}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={row.name} className="even:bg-[#f8fafc]">
                <td className="border border-[#d8e0e8] px-2 py-2">{index + 1}</td>
                <td className="border border-[#d8e0e8] px-2 py-2 whitespace-nowrap">{row.name}</td>
                {columns.map(column => (
                  <td key={column.value} className="border border-[#d8e0e8] px-2 py-2 text-right">
                    {column.value.endsWith('Pct') ? `${row[column.value]}%` : row[column.value]}
                  </td>
                ))}
                {extraColumn && (
                  <td className="border border-[#d8e0e8] px-2 py-2 text-right">—</td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length + 2 + (extraColumn ? 1 : 0)} className="border border-[#d8e0e8] px-3 py-6 text-center text-[#64748b]">
                  No report data for this filter.
                </td>
              </tr>
            )}
            <tr className="font-semibold bg-[#f1f5f9]">
              <td className="border border-[#cbd5e1] px-2 py-2" />
              <td className="border border-[#cbd5e1] px-2 py-2">Grand Total</td>
              {columns.map(column => (
                <td key={column.value} className="border border-[#cbd5e1] px-2 py-2 text-right">
                  {column.value.endsWith('Pct') ? `${grandTotal[column.value]}%` : grandTotal[column.value]}
                </td>
              ))}
              {extraColumn && (
                <td className="border border-[#cbd5e1] px-2 py-2 text-right">{extraColumn.total}</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
      {note && <p className="px-4 py-2 text-[11px] text-[#64748b]">{note}</p>}
    </section>
  )
}

'use client'

const PROJECTS = ['Hara Rassai Vijayam', 'Primia', 'Lake Estate', 'Quiet Estate']

interface ReportsSummaryFiltersProps {
  from: string
  to: string
  projects: string[]
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onProjectsChange: (projects: string[]) => void
}

export function ReportsSummaryFilters({
  from,
  to,
  projects,
  onFromChange,
  onToChange,
  onProjectsChange,
}: ReportsSummaryFiltersProps) {
  const toggleProject = (project: string) => {
    onProjectsChange(
      projects.includes(project)
        ? projects.filter(item => item !== project)
        : [...projects, project],
    )
  }

  return (
    <section className="bg-white border border-[#d8e0e8] rounded-lg p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-[#172033] mr-2">Filters</h2>
        <label className="flex items-center gap-2 text-xs text-[#475569]">
          From
          <input
            aria-label="From date"
            type="date"
            value={from}
            max={to}
            onChange={event => onFromChange(event.target.value)}
            className="border border-[#d8e0e8] rounded px-2 py-1.5 text-[#172033]"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-[#475569]">
          To
          <input
            aria-label="To date"
            type="date"
            value={to}
            min={from}
            onChange={event => onToChange(event.target.value)}
            className="border border-[#d8e0e8] rounded px-2 py-1.5 text-[#172033]"
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-[#475569] mb-2">Projects</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {PROJECTS.map(project => (
            <label key={project} className="inline-flex items-center gap-2 text-xs text-[#172033]">
              <input
                type="checkbox"
                checked={projects.includes(project)}
                onChange={() => toggleProject(project)}
                className="accent-[#b27a16]"
              />
              {project}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[#64748b]">All projects are included when every project is selected.</p>
      </fieldset>
    </section>
  )
}

export const META_FORM_PROJECT_MAP = {
  '2016426992395013': {
    projectKey: 'HRV',
    projectNames: ['Hara Rassai Vijayam', 'Hara Rasai Vijayam', 'HRV'],
  },
  '1440634741361279': {
    projectKey: 'Premia',
    projectNames: ['Primia', 'Premia'],
  },
  '2302519130503761': {
    projectKey: 'LakeEstate',
    projectNames: ['Lake Estate', 'LakeEstate'],
  },
} as const

export type MetaProjectRecord = { id: string; name: string }

const normalizeProjectName = (name: string) => name.toLowerCase().replace(/[\s-]/g, '')

export const resolveMetaFormProject = (formId: string, projects: MetaProjectRecord[]) => {
  const mapping = META_FORM_PROJECT_MAP[formId as keyof typeof META_FORM_PROJECT_MAP]
  if (!mapping) return undefined

  const acceptedNames = new Set(mapping.projectNames.map(normalizeProjectName))
  const matches = projects.filter(project => acceptedNames.has(normalizeProjectName(project.name)))
  return matches.length === 1 ? { mapping, project: matches[0] } : { mapping, project: undefined }
}

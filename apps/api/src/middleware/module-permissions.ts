export const CRM_MODULES = [
  'dashboard',
  'leads',
  'customers',
  'inventory',
  'quotations',
  'bookings',
  'invoices',
  'collections',
  'post-sales',
  'email',
  'whatsapp',
  'sms',
  'reports',
  'notifications',
  'team',
  'settings',
  'documents',
  'projects',
] as const

export type CrmModule = typeof CRM_MODULES[number]

const adminRoles = ['SUPER_ADMIN', 'ADMIN']

const moduleRoles: Record<CrmModule, string[]> = {
  dashboard: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  leads: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'],
  customers: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  inventory: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE'],
  quotations: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE'],
  bookings: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  invoices: [...adminRoles, 'ACCOUNTS'],
  collections: [...adminRoles, 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  'post-sales': [...adminRoles, 'SALES_MANAGER', 'CRM_TEAM', 'POST_SALES'],
  email: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'],
  whatsapp: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM', 'ACCOUNTS'],
  sms: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'],
  reports: [...adminRoles, 'SALES_MANAGER', 'ACCOUNTS'],
  notifications: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  team: adminRoles,
  settings: adminRoles,
  documents: [...adminRoles, 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  projects: [...adminRoles, 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
}

export const hasModuleAccess = (role: string | undefined, module: CrmModule) =>
  Boolean(role && moduleRoles[module].includes(role))

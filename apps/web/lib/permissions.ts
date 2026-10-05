export const MODULE_ACCESS: Record<string, string[]> = {
  dashboard: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  leads: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'CRM_TEAM'],
  customers: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  inventory: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'],
  quotations: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'],
  bookings: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  invoices: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'],
  collections: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  'post-sales': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CRM_TEAM', 'POST_SALES'],
  email: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM'],
  whatsapp: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'CRM_TEAM', 'ACCOUNTS'],
  reports: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'ACCOUNTS'],
  notifications: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES'],
  team: ['SUPER_ADMIN', 'ADMIN'],
  settings: ['SUPER_ADMIN', 'ADMIN'],
}

export type AccessibleModule = keyof typeof MODULE_ACCESS

export const MODULE_LABELS: Record<AccessibleModule, string> = {
  dashboard: 'Dashboard',
  leads: 'Lead management',
  customers: 'Customers',
  inventory: 'Inventory',
  quotations: 'Quotations',
  bookings: 'Bookings',
  invoices: 'Invoices',
  collections: 'Collections',
  'post-sales': 'Post sales',
  email: 'Email',
  whatsapp: 'WhatsApp',
  reports: 'Reports',
  notifications: 'Notifications',
  team: 'Team management',
  settings: 'System settings',
}

export const getModulesForRole = (role: string) =>
  (Object.keys(MODULE_ACCESS) as AccessibleModule[])
    .filter(module => MODULE_ACCESS[module].includes(role))
    .map(module => MODULE_LABELS[module])

export const hasModuleAccess = (role: string | undefined, module: string) =>
  Boolean(role && MODULE_ACCESS[module]?.includes(role))

export const getModuleForPath = (pathname: string): AccessibleModule | null => {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/settings/profile') return null
  const routeModule = path.split('/')[1]
  return Object.prototype.hasOwnProperty.call(MODULE_ACCESS, routeModule)
    ? routeModule as AccessibleModule
    : null
}

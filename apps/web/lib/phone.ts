export const normalizeInternationalPhone = (value: string) =>
  value.trim().replace(/[\s()-]/g, '')

export const isValidInternationalPhone = (value: string) =>
  /^\+[1-9]\d{7,14}$/.test(normalizeInternationalPhone(value))

import assert from 'node:assert/strict'
import { projectUpdateSchema } from './project.controller'

const existingProject = {
  id: 'project-id',
  name: 'Quiet Estate',
  description: '',
  location: 'Bangalore',
  city: 'Bangalore',
  state: 'Karnataka',
  reraNumber: '',
  totalUnits: 0,
  availableUnits: 0,
  minPrice: null,
  maxPrice: null,
  propertyTypes: [],
  amenities: [],
  brochureUrl: null,
  sitemapUrl: null,
  images: [],
  isActive: true,
  createdAt: '2026-10-30T16:43:53.727Z',
  updatedAt: '2026-10-30T17:28:10.999Z',
  _count: { inventory: 0, leads: 0, quotations: 0 },
}

assert.deepEqual(projectUpdateSchema.parse(existingProject), {
  name: 'Quiet Estate',
  description: '',
  location: 'Bangalore',
  city: 'Bangalore',
  state: 'Karnataka',
  reraNumber: '',
  totalUnits: 0,
  availableUnits: 0,
  minPrice: null,
  maxPrice: null,
  propertyTypes: [],
  amenities: [],
  brochureUrl: null,
  sitemapUrl: null,
  images: [],
  isActive: true,
})
assert.equal(projectUpdateSchema.safeParse({ id: 'project-id', _count: {} }).success, false)

console.log('Project update validation tests passed.')

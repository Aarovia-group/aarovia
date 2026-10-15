import assert from 'node:assert/strict'
import { findHaraProject, normalizeIndianMobile } from './public-lead.controller'

assert.equal(normalizeIndianMobile('9876543210'), '+919876543210')
assert.equal(normalizeIndianMobile('09876543210'), '+919876543210')
assert.equal(normalizeIndianMobile('+91 98765 43210'), '+919876543210')
assert.equal(normalizeIndianMobile('1234567890'), null)
assert.equal(normalizeIndianMobile('987654321'), null)
assert.deepEqual(
  findHaraProject([{ id: 'hara-rassai', name: 'Hara Rassai Vijayam' }]),
  { id: 'hara-rassai', name: 'Hara Rassai Vijayam' },
)

console.log('All public website lead tests passed.')

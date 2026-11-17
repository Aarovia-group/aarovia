import assert from 'node:assert/strict'
import { findProjectByNames, normalizeIndianMobile } from './public-lead.controller'

assert.equal(normalizeIndianMobile('9876543210'), '+919876543210')
assert.equal(normalizeIndianMobile('09876543210'), '+919876543210')
assert.equal(normalizeIndianMobile('+91 98765 43210'), '+919876543210')
assert.equal(normalizeIndianMobile('1234567890'), null)
assert.equal(normalizeIndianMobile('987654321'), null)
assert.deepEqual(
  findProjectByNames([{ id: 'website', name: 'Aarovia Group Website' }], ['Aarovia Group Website']),
  { id: 'website', name: 'Aarovia Group Website' },
)
assert.equal(
  findProjectByNames([{ id: 'hara-rassai', name: 'Hara Rassai Vijayam' }], ['Aarovia Group Website']),
  undefined,
)
assert.deepEqual(
  findProjectByNames(
    [{ id: 'hara-rassai', name: 'Hara Rassai Vijayam' }],
    ['Hara Rassai Vijayam', 'Hara Vijayam'],
  ),
  { id: 'hara-rassai', name: 'Hara Rassai Vijayam' },
)

console.log('All public website lead tests passed.')

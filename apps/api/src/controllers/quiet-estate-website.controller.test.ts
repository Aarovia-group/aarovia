import assert from 'node:assert/strict'
import { findQuietEstateProject, quietEstateLeadCaptureSchema } from './quiet-estate-website.controller'

const validLead = {
  name: 'Example Name',
  phone: '9876543210',
  email: 'example@example.com',
  source: 'landing-hero',
  submitted_at: '2026-10-30T12:00:00.000Z',
}

assert.equal(quietEstateLeadCaptureSchema.safeParse(validLead).success, true)
assert.equal(quietEstateLeadCaptureSchema.safeParse({ ...validLead, email: 'invalid' }).success, false)
assert.equal(quietEstateLeadCaptureSchema.safeParse({ ...validLead, source: 'other' }).success, false)
assert.deepEqual(
  findQuietEstateProject([
    { id: 'other', name: 'Other Project' },
    { id: 'quest-estate', name: 'Quest Estate' },
  ]),
  { id: 'quest-estate', name: 'Quest Estate' },
)
assert.deepEqual(
  findQuietEstateProject([{ id: 'quiet-estate', name: '\u200B QUIET\u00A0  ESTATE \u2060' }]),
  { id: 'quiet-estate', name: '\u200B QUIET\u00A0  ESTATE \u2060' },
)
assert.deepEqual(
  findQuietEstateProject([
    { id: 'quest-estate', name: 'Quest Estate' },
    { id: 'quiet-estate', name: 'Quiet Estate' },
  ]),
  { id: 'quiet-estate', name: 'Quiet Estate' },
)
assert.equal(findQuietEstateProject([{ id: 'other', name: 'Other Project' }]), undefined)

console.log('Quiet Estate website lead validation tests passed.')

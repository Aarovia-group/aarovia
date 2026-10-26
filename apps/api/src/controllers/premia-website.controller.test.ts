import assert from 'node:assert/strict'
import { findPremiaProject, premiaLeadCaptureSchema } from './premia-website.controller'

const validLead = {
  fullName: 'Example Name',
  phoneNumber: '+91 98765 43210',
  emailAddress: '',
  formType: 'hero',
}

assert.equal(premiaLeadCaptureSchema.safeParse(validLead).success, true)
assert.equal(premiaLeadCaptureSchema.safeParse({ ...validLead, formType: 'unknown' }).success, false)
assert.equal(premiaLeadCaptureSchema.safeParse({ ...validLead, phoneNumber: '123' }).success, false)
assert.deepEqual(
  findPremiaProject([
    { id: 'other', name: 'Other Project' },
    { id: 'primia', name: 'Primia' },
  ]),
  { id: 'primia', name: 'Primia' },
)
assert.deepEqual(
  findPremiaProject([{ id: 'premia', name: 'PREMIA' }]),
  { id: 'premia', name: 'PREMIA' },
)

console.log('Premia website lead validation tests passed.')

import assert from 'node:assert/strict'
import { findVedaVilasaProject, vedaVilasaLeadCaptureSchema } from './veda-vilasa-website.controller'

const validLead = {
  fullName: 'Example Name',
  phoneNumber: '+91 98765 43210',
  emailAddress: 'example@example.com',
  formType: 'landing',
  consent: true,
}

assert.equal(vedaVilasaLeadCaptureSchema.safeParse(validLead).success, true)
assert.equal(vedaVilasaLeadCaptureSchema.safeParse({ ...validLead, formType: 'unknown' }).success, false)
assert.equal(vedaVilasaLeadCaptureSchema.safeParse({ ...validLead, phoneNumber: '123' }).success, false)
assert.equal(vedaVilasaLeadCaptureSchema.safeParse({ ...validLead, consent: false }).success, false)
assert.deepEqual(
  findVedaVilasaProject([
    { id: 'other', name: 'Other Project' },
    { id: 'veda', name: 'Veda Vilasa' },
  ]),
  { id: 'veda', name: 'Veda Vilasa' },
)
assert.equal(findVedaVilasaProject([{ id: 'other', name: 'Veda Vilas' }]), undefined)

console.log('Veda Vilasa website lead validation tests passed.')

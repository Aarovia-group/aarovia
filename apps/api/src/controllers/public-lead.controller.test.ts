import assert from 'node:assert/strict'
import { findHaraProject, normalizeIndianMobile, parseAaroviaContactLead } from './public-lead.controller'

assert.equal(normalizeIndianMobile('9876543210'), '+919876543210')
assert.equal(normalizeIndianMobile('09876543210'), '+919876543210')
assert.equal(normalizeIndianMobile('+91 98765 43210'), '+919876543210')
assert.equal(normalizeIndianMobile('1234567890'), null)
assert.equal(normalizeIndianMobile('987654321'), null)
assert.deepEqual(
  findHaraProject([{ id: 'hara-rassai', name: 'Hara Rassai Vijayam' }]),
  { id: 'hara-rassai', name: 'Hara Rassai Vijayam' },
)

const websiteContact = parseAaroviaContactLead({
  name: 'Example Visitor',
  email: 'visitor@example.com',
  phone: '9876543210',
  message: 'Interested in a site visit',
  source: 'contact-page',
  consent: true,
  consentText: 'I agree to receive communications.',
})
assert.equal(websiteContact.success, true)
if (websiteContact.success) {
  assert.equal(websiteContact.data.mobile, '9876543210')
  assert.equal(websiteContact.data.remarks, 'Interested in a site visit')
  assert.equal(websiteContact.data.formType, 'contact-page')
}
assert.equal(parseAaroviaContactLead({ name: 'Example Visitor', phone: '9876543210' }).success, false)
assert.equal(parseAaroviaContactLead({ name: 'Example Visitor', consent: true }).success, false)

console.log('All public website lead tests passed.')

import assert from 'node:assert/strict'
import { createHmac } from 'crypto'
import {
  extractMetaLeadFields,
  isMetaSignatureValid,
  matchMetaLeadAppSignature,
  normalizeMetaPhone,
  parseMetaLeadEvents,
} from './meta-leads'

const payload = Buffer.from('{"object":"page","entry":[]}')
const secret = 'test-app-secret'
const signature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`

assert.equal(isMetaSignatureValid(payload, signature, secret), true)
assert.equal(isMetaSignatureValid(payload, 'sha256=invalid', secret), false)
assert.equal(isMetaSignatureValid(payload, signature, ''), false)
assert.deepEqual(
  matchMetaLeadAppSignature(payload, signature, [
    { slot: 1, appSecret: 'other-app-secret' },
    { slot: 2, appSecret: secret },
  ]),
  { slot: 2, appSecret: secret },
)
assert.equal(matchMetaLeadAppSignature(payload, 'sha256=invalid', [{ appSecret: secret }]), undefined)
assert.equal(normalizeMetaPhone('9876543210'), '+919876543210')
assert.equal(normalizeMetaPhone('09876543210'), '+919876543210')
assert.equal(normalizeMetaPhone('+91 98765 43210'), '+919876543210')

assert.deepEqual(
  parseMetaLeadEvents({
    entry: [{
      changes: [
        { field: 'leadgen', value: { leadgen_id: 'lead-1', page_id: 'page-1', form_id: 'form-1', ad_id: 'ad-1', created_time: 10 } },
        { field: 'feed', value: { leadgen_id: 'ignored' } },
      ],
    }],
  }),
  [{ leadgen_id: 'lead-1', page_id: 'page-1', form_id: 'form-1', ad_id: 'ad-1', created_time: 10 }],
)

assert.deepEqual(
  extractMetaLeadFields([
    { name: 'first_name', values: ['Aarav'] },
    { name: 'last_name', values: ['Kumar'] },
    { name: 'phone_number', values: ['+91 98765 43210'] },
    { name: 'email', values: ['AARAV@example.com'] },
    { name: 'city', values: ['Hyderabad'] },
  ]),
  {
    name: 'Aarav Kumar',
    phone: '+91 98765 43210',
    email: 'AARAV@example.com',
    city: 'Hyderabad',
  },
)

console.log('All Meta Lead Ads tests passed.')

import assert from 'node:assert'
import { normalizeEmail, parseCookies, parseDuration, getJwtCookieOptions } from './auth.controller'
import { getSmtpOptions } from '../utils/email'
import { hasModuleAccess } from '../middleware/module-permissions'
import { findOutgoingDidForAgent, getOutgoingDidsForAgent, parseOutgoingDidRoutes } from '../services/incoming-call-routing'

;(async () => {
  try {
    assert.equal(parseDuration('15m'), 15 * 60 * 1000)
    assert.equal(parseDuration('1h'), 60 * 60 * 1000)
    assert.equal(parseDuration('30d'), 30 * 24 * 60 * 60 * 1000)
    assert.equal(parseDuration('10s'), 10 * 1000)
    assert.equal(parseDuration('invalid'), 0)
    assert.equal(normalizeEmail('  SALES.User@AAROVIA.CO.IN  '), 'sales.user@aarovia.co.in')
    assert.equal(hasModuleAccess('SUPER_ADMIN', 'settings'), true)
    assert.equal(hasModuleAccess('ACCOUNTS', 'invoices'), true)
    assert.equal(hasModuleAccess('ACCOUNTS', 'leads'), false)
    assert.equal(hasModuleAccess('TELECALLER', 'inventory'), false)
    const repairedOutgoingDids = parseOutgoingDidRoutes(JSON.stringify([
      { agentName: 'Chirag', outgoingDid: '8071439585' },
      { agentName: 'Vinod', outgoingDid: '8071439584' },
    ]))
    assert.equal(findOutgoingDidForAgent(repairedOutgoingDids, 'Chirag'), '8071439584')
    assert.equal(findOutgoingDidForAgent(repairedOutgoingDids, 'Chirag Kumar'), '8071439584')
    assert.equal(findOutgoingDidForAgent(repairedOutgoingDids, 'Amar'), '8071439584')
    assert.equal(findOutgoingDidForAgent(repairedOutgoingDids, 'Vinod'), '8071439585')
    assert.equal(findOutgoingDidForAgent(repairedOutgoingDids, 'Any Admin Name', 'ADMIN'), '8071439585')
    for (const agent of ['Mahesh', 'Maruthi', 'Kalyani', 'Nithin']) {
      assert.deepEqual(getOutgoingDidsForAgent(repairedOutgoingDids, agent), ['8071439257', '8071439583'])
      assert.equal(findOutgoingDidForAgent(repairedOutgoingDids, agent, undefined, 0), '8071439257')
      assert.equal(findOutgoingDidForAgent(repairedOutgoingDids, agent, undefined, 1), '8071439583')
      assert.equal(findOutgoingDidForAgent(repairedOutgoingDids, agent, undefined, 2), '8071439257')
    }

    const header = 'refreshToken=abc123; theme=dark; session=xyz'
    const cookies = parseCookies(header)
    assert.deepEqual(cookies, {
      refreshToken: 'abc123',
      theme: 'dark',
      session: 'xyz',
    })

    process.env.NODE_ENV = 'production'
    process.env.COOKIE_DOMAIN = '.aarovia.co.in'
    const cookieOptions = getJwtCookieOptions()
    assert.equal(cookieOptions.httpOnly, true)
    assert.equal(cookieOptions.secure, true)
    assert.equal(cookieOptions.sameSite, 'lax')
    assert.equal(cookieOptions.path, '/')
    assert.equal(cookieOptions.domain, '.aarovia.co.in')

    process.env.SMTP_HOST = ''
    process.env.SMTP_USER = 'demo@gmail.com'
    process.env.SMTP_PASS = 'secret'
    const gmailOptions = await getSmtpOptions()
    assert.equal(gmailOptions.host, 'smtp.gmail.com')
    assert.equal(gmailOptions.port, 587)
    assert.equal(gmailOptions.secure, false)

    console.log('All auth.controller tests passed.')
    process.exit(0)
  } catch (error) {
    console.error('Auth controller tests failed.')
    console.error(error)
    process.exit(1)
  }
})()

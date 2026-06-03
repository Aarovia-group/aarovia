import assert from 'node:assert'
import { parseCookies, parseDuration, getJwtCookieOptions } from './auth.controller'

try {
  assert.equal(parseDuration('15m'), 15 * 60 * 1000)
  assert.equal(parseDuration('1h'), 60 * 60 * 1000)
  assert.equal(parseDuration('30d'), 30 * 24 * 60 * 60 * 1000)
  assert.equal(parseDuration('10s'), 10 * 1000)
  assert.equal(parseDuration('invalid'), 0)

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

  console.log('All auth.controller tests passed.')
  process.exit(0)
} catch (error) {
  console.error('Auth controller tests failed.')
  console.error(error)
  process.exit(1)
}

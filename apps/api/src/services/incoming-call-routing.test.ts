import assert from 'node:assert'
import {
  DEFAULT_OUTGOING_DID_ROUTES,
  findOutgoingDidForAgent,
  parseOutgoingDidRoutes,
} from './incoming-call-routing'

try {
  const routes = parseOutgoingDidRoutes()
  assert.equal(findOutgoingDidForAgent(routes, 'Amar', 'SALES_EXECUTIVE', 0, 'SA Global-Primia-Digital'), '8071439585')
  assert.equal(findOutgoingDidForAgent(routes, 'Amar', 'SALES_EXECUTIVE', 0, 'SA Global-Verzure-Digital'), '8071439585')
  assert.equal(findOutgoingDidForAgent(routes, 'Amar', 'SALES_EXECUTIVE', 0, 'Lake Estate-Digital'), '8071439584')
  assert.equal(findOutgoingDidForAgent(routes, 'Amar', 'SALES_EXECUTIVE'), '8071439584')
  assert.equal(findOutgoingDidForAgent(routes, 'Chirag', 'SALES_EXECUTIVE', 0, 'Lake Estate-Digital'), '8071439584')
  assert.equal(findOutgoingDidForAgent(routes, 'Vinod', 'SALES_EXECUTIVE', 0, 'SA Global-Primia-Digital'), '8071439585')
  assert.equal(
    findOutgoingDidForAgent(DEFAULT_OUTGOING_DID_ROUTES, 'Nithin', 'SALES_EXECUTIVE', 0),
    '8071439257',
  )
  assert.equal(
    findOutgoingDidForAgent(DEFAULT_OUTGOING_DID_ROUTES, 'Nithin', 'SALES_EXECUTIVE', 1),
    '8071439583',
  )

  console.log('All incoming-call-routing tests passed.')
  process.exit(0)
} catch (error) {
  console.error('Incoming-call-routing tests failed.')
  console.error(error)
  process.exit(1)
}

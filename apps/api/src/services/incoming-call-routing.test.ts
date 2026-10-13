import assert from 'node:assert'
import {
  DEFAULT_OUTGOING_DID_ROUTES,
  DEFAULT_INCOMING_CALL_ROUTES,
  DEFAULT_MCUBE_EXECUTIVE_NUMBERS,
  findIncomingCallRoute,
  findIncomingCallerNumber,
  findOutgoingDidForAgent,
  getMcubeExecutiveNumber,
  parseOutgoingDidRoutes,
} from './incoming-call-routing'

try {
  assert.equal(
    findIncomingCallRoute(DEFAULT_INCOMING_CALL_ROUTES, ['+91 9071126875'])?.agentName,
    'maruthi',
  )
  assert.equal(
    findIncomingCallRoute(DEFAULT_INCOMING_CALL_ROUTES, ['8071439584', '9071127154'])?.agentName,
    'vinod',
  )
  assert.equal(findIncomingCallRoute(DEFAULT_INCOMING_CALL_ROUTES, ['9999999999']), undefined)

  assert.equal(findIncomingCallerNumber({ callfrom: '+91 9916043625', callto: '9071126875' }, ['9071126875']), '9916043625')
  assert.equal(findIncomingCallerNumber({ data: { callerNumber: '9916043625' } }), '9916043625')
  assert.equal(findIncomingCallerNumber({ clicktocalldid: '9071127087', callto: '9916043625' }, ['9071127087']), '9916043625')
  assert.equal(findIncomingCallerNumber({ callto: '9071126875', clicktocalldid: '9071126875' }, ['9071126875']), undefined)
  assert.equal(findIncomingCallerNumber({ callto: '9187980593' }, ['9187980593']), undefined)

  assert.equal(getMcubeExecutiveNumber('Kalyani'), '9187980596')
  assert.equal(getMcubeExecutiveNumber('Mahesh'), '9187980592')
  assert.equal(getMcubeExecutiveNumber('Maruthi'), '9187980598')
  assert.equal(getMcubeExecutiveNumber('Vinod'), '9187980594')
  assert.equal(getMcubeExecutiveNumber('Amar'), '9448825051')
  assert.equal(getMcubeExecutiveNumber('Unknown Agent', '9000000000'), '9000000000')
  assert.equal(Object.keys(DEFAULT_MCUBE_EXECUTIVE_NUMBERS).length, 9)

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

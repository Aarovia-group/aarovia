import assert from 'node:assert'
import {
  chooseIncomingCallAgent,
  findMappedIncomingDid,
  findIncomingLeadMatch,
  getIncomingFollowupDate,
  getIncomingCaller,
  hasIncomingCallIdBeenProcessed,
  isInternalOrTestCall,
  isMissedIncomingCall,
  normalizeIncomingPhone,
  planIncomingLead,
} from './incoming-mcube-call'

try {
  assert.equal(normalizeIncomingPhone('09876543210'), '+919876543210')
  assert.equal(normalizeIncomingPhone('91 98765 43210'), '+919876543210')
  assert.equal(normalizeIncomingPhone('+91 98765-43210'), '+919876543210')
  assert.equal(normalizeIncomingPhone('9876543210'), '+919876543210')
  assert.equal(normalizeIncomingPhone('12345'), '')

  const assignedAgents = [
    { id: 'mahesh', name: 'Mahesh', phone: '9187980592' },
    { id: 'kalyani', name: 'Kalyani', phone: '9187980596' },
  ]
  assert.equal(chooseIncomingCallAgent(assignedAgents, assignedAgents[1], 0, true)?.id, 'kalyani')
  assert.equal(chooseIncomingCallAgent(assignedAgents, undefined, 1, true)?.id, 'kalyani')
  assert.equal(chooseIncomingCallAgent([], undefined, 0, false), undefined)
  assert.equal(findMappedIncomingDid([
    { did: '9071126875', isActive: true, projectId: 'project-a' },
    { did: '9071126947', isActive: false, projectId: 'project-b' },
  ], ['+91 9071126875'])?.projectId, 'project-a')
  assert.equal(findMappedIncomingDid([
    { did: '9071126947', isActive: false, projectId: 'project-b' },
  ], ['9071126947']), undefined)

  const sameProjectAndOwner = {
    id: 'existing',
    mobile: '+919876543210',
    projectId: 'project-a',
    assignedToId: 'mahesh',
  }
  const otherProject = { ...sameProjectAndOwner, id: 'other-project', projectId: 'project-b' }
  const otherOwner = { ...sameProjectAndOwner, id: 'other-owner', assignedToId: 'kalyani' }
  assert.equal(planIncomingLead(
    [sameProjectAndOwner, otherProject, otherOwner],
    '09876543210',
    'project-a',
    'mahesh',
  ).action, 'reuse')
  assert.equal(findIncomingLeadMatch([sameProjectAndOwner, otherProject, otherOwner], '09876543210', 'project-a', 'mahesh')?.id, 'existing')
  assert.equal(planIncomingLead([otherProject, otherOwner], '09876543210', 'project-a', 'mahesh').action, 'create')
  assert.equal(planIncomingLead([], '09876543210', null, null).action, 'create', 'an unmapped DID can create an unassigned lead')

  assert.equal(isMissedIncomingCall('NO ANSWER'), true)
  assert.equal(isMissedIncomingCall('Connected'), false)
  assert.equal(getIncomingFollowupDate('NO ANSWER', new Date('2026-10-13T20:00:00.000Z'))?.toISOString(), '2026-10-13T18:30:00.000Z')
  assert.equal(getIncomingFollowupDate('Connected', new Date('2026-10-13T20:00:00.000Z')), null)
  assert.equal(isInternalOrTestCall('INCOMING', '9071126875', '9071126875'), true)
  assert.equal(isInternalOrTestCall('INCOMING', '9187980592', '9071126875'), false)
  assert.equal(isInternalOrTestCall('internal call', '9876543210', '9071126875'), true)
  assert.equal(isInternalOrTestCall('INTERNAL_CALL', '9876543210', '9071126875'), true)
  assert.equal(hasIncomingCallIdBeenProcessed('call-1', 'call-1'), true)
  assert.equal(hasIncomingCallIdBeenProcessed('call-1', null), false)

  assert.equal(
    getIncomingCaller({ callfrom: '+91 9187980592', did: '9071126875' }, ['9071126875']),
    '9187980592',
    'a CRM-user number can still be a real caller',
  )

  console.log('All incoming MCUBE call tests passed.')
  process.exit(0)
} catch (error) {
  console.error('Incoming MCUBE call tests failed.')
  console.error(error)
  process.exit(1)
}

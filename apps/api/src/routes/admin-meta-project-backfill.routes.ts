import { Router, Request, Response } from 'express'
import axios from 'axios'
import { Prisma } from '@prisma/client'
import { authenticate, authorize } from '../middleware/auth.middleware'
import prisma from '../utils/prisma'
import { META_FORM_PROJECT_MAP, resolveMetaFormProject } from '../lib/metaFormProjectMap'

const router = Router()
const graphBase = 'https://graph.facebook.com/v21.0'

const getFormIdFromPayload = (value: Prisma.JsonValue | undefined, metaLeadId: string): string | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const formId = getFormIdFromPayload(item, metaLeadId)
      if (formId) return formId
    }
    return undefined
  }
  if (!value || typeof value !== 'object') return undefined

  const record = value as Prisma.JsonObject
  if (record.leadgen_id === metaLeadId && typeof record.form_id === 'string') return record.form_id
  for (const item of Object.values(record)) {
    const formId = getFormIdFromPayload(item, metaLeadId)
    if (formId) return formId
  }
  return undefined
}

const getActivityFormId = (metadata: Prisma.JsonValue) => {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return undefined
  return typeof metadata.formId === 'string' ? metadata.formId : undefined
}

const getLeadFormId = (
  lead: {
    metaLeadId: string | null
    activities: Array<{ metadata: Prisma.JsonValue }>
    metaWebhookEvents: Array<{ rawPayload: Prisma.JsonValue }>
  },
) => {
  for (const activity of lead.activities) {
    const formId = getActivityFormId(activity.metadata)
    if (formId) return formId
  }
  if (lead.metaLeadId) {
    for (const event of lead.metaWebhookEvents) {
      const formId = getFormIdFromPayload(event.rawPayload, lead.metaLeadId)
      if (formId) return formId
    }
  }
  return undefined
}

router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  const dryRun = req.query.dryRun !== 'false'
  try {
    const [leads, projects] = await Promise.all([
      prisma.lead.findMany({
        where: { source: 'META_ADS', projectId: null },
        select: {
          id: true,
          name: true,
          metaLeadId: true,
          activities: {
            where: { type: 'LEAD_CREATED' },
            select: { metadata: true },
            take: 1,
          },
          metaWebhookEvents: {
            select: { rawPayload: true },
            take: 10,
          },
        },
      }),
      prisma.project.findMany({ select: { id: true, name: true } }),
    ])
    const counts = Object.fromEntries(
      Object.values(META_FORM_PROJECT_MAP).map(({ projectKey }) => [projectKey, 0]),
    ) as Record<string, number>
    const affectedLeads = Object.fromEntries(
      Object.values(META_FORM_PROJECT_MAP).map(({ projectKey }) => [projectKey, []]),
    ) as Record<string, Array<{ id: string; name: string; formId: string; proposedProject: string }>>
    let unmatched = 0
    let failedLookups = 0
    const unresolvedProjects = new Set<string>()
    const accessTokenSetting = await prisma.settings.findUnique({
      where: { key: 'meta_lead_access_token_2' },
      select: { value: true },
    })
    const accessToken = accessTokenSetting?.value || process.env.META_LEAD_ACCESS_TOKEN_2 || ''

    for (const lead of leads) {
      let formId = getLeadFormId(lead)
      if (!formId && lead.metaLeadId) {
        if (!accessToken) {
          failedLookups += 1
          console.error(`[Meta Project Backfill] App 2 access token unavailable for lead ${lead.id}; skipped`)
          continue
        }
        try {
          const response = await axios.get<{ form_id?: string }>(
            `${graphBase}/${encodeURIComponent(lead.metaLeadId)}`,
            { params: { fields: 'form_id', access_token: accessToken }, timeout: 10000 },
          )
          formId = response.data.form_id
        } catch (error) {
          failedLookups += 1
          console.error(
            `[Meta Project Backfill] Graph API lookup failed for lead ${lead.id}`,
            error instanceof Error ? error.name : 'unknown error',
          )
          continue
        }
      }

      if (!formId) {
        unmatched += 1
        continue
      }
      const match = resolveMetaFormProject(formId, projects)
      if (!match) {
        unmatched += 1
        continue
      }
      if (!match.project) {
        if (!unresolvedProjects.has(match.mapping.projectKey)) {
          console.warn(
            `[Meta Project Backfill] No unique Project match for ${match.mapping.projectKey}; matching leads will remain Unassigned`,
          )
          unresolvedProjects.add(match.mapping.projectKey)
        }
        unmatched += 1
        continue
      }

      if (!dryRun) {
        const result = await prisma.lead.updateMany({
          where: { id: lead.id, source: 'META_ADS', projectId: null },
          data: { projectId: match.project.id },
        })
        if (result.count === 0) continue
      }
      counts[match.mapping.projectKey] += 1
      if (dryRun) {
        affectedLeads[match.mapping.projectKey].push({
          id: lead.id,
          name: lead.name,
          formId,
          proposedProject: match.project.name,
        })
      }
    }

    console.info(`[Meta Project Backfill] ${dryRun ? 'Dry run' : 'Completed'} counts`, counts)
    return res.status(failedLookups ? 207 : 200).json({
      success: failedLookups === 0,
      dryRun,
      counts,
      ...(dryRun ? { affectedLeads } : {}),
      unmatched,
      failedLookups,
    })
  } catch (error) {
    console.error(
      '[Meta Project Backfill] Failed',
      error instanceof Error ? error.name : 'unknown error',
    )
    return res.status(500).json({ success: false, message: 'Meta Project backfill failed.' })
  }
})

export default router

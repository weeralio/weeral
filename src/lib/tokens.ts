import { createHmac } from 'crypto'

function getKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY manquante')
  return key
}

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

export function generateUnsubscribeToken(contactId: string, campaignId: string): string {
  return createHmac('sha256', getKey())
    .update(`${contactId}:${campaignId}`)
    .digest('hex')
}

export function verifyUnsubscribeToken(contactId: string, campaignId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(contactId, campaignId)
  return expected === token
}

export function unsubscribeUrl(contactId: string, campaignId: string): string {
  const token = generateUnsubscribeToken(contactId, campaignId)
  return `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?cid=${contactId}&cmpid=${campaignId}&sig=${token}`
}

// ─── Tracking opens / clics ───────────────────────────────────────────────────

function trackingToken(ref: string): string {
  return createHmac('sha256', getKey())
    .update(`track:${ref}`)
    .digest('hex')
    .slice(0, 16)
}

export function verifyTrackingToken(ref: string, token: string): boolean {
  return trackingToken(ref) === token
}

export function openPixelUrl(contactId: string, campaignId: string): string {
  const ref = `${contactId}:${campaignId}`
  const t = trackingToken(ref)
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/track/open?cid=${contactId}&cmpid=${campaignId}&t=${t}`
}

export function clickTrackUrl(url: string, contactId: string, campaignId: string): string {
  const ref = `${contactId}:${campaignId}`
  const t = trackingToken(ref)
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/track/click?cid=${contactId}&cmpid=${campaignId}&url=${encodeURIComponent(url)}&t=${t}`
}

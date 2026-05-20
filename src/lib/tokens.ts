import { createHmac } from 'crypto'

function getKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY manquante')
  return key
}

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

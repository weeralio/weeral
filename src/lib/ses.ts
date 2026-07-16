import {
  SESClient,
  SendEmailCommand,
  VerifyDomainDkimCommand,
  VerifyDomainIdentityCommand,
  VerifyEmailIdentityCommand,
  GetIdentityVerificationAttributesCommand,
  GetSendQuotaCommand,
} from '@aws-sdk/client-ses'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'

export async function getSESClient(userId: string): Promise<SESClient> {
  const supabase = createServiceClient()
  const { data: creds } = await supabase
    .from('aws_credentials')
    .select('access_key_id, secret_access_key, aws_region')
    .eq('user_id', userId)
    .single()

  if (!creds) throw new Error('Credentials AWS non configurés')

  return new SESClient({
    region: creds.aws_region,
    credentials: {
      accessKeyId: decrypt(creds.access_key_id),
      secretAccessKey: decrypt(creds.secret_access_key),
    },
  })
}

export async function initDomainDkim(ses: SESClient, domain: string): Promise<string[]> {
  const result = await ses.send(new VerifyDomainDkimCommand({ Domain: domain }))
  return result.DkimTokens ?? []
}

export async function getDomainTxtRecord(ses: SESClient, domain: string): Promise<string> {
  const result = await ses.send(new VerifyDomainIdentityCommand({ Domain: domain }))
  return result.VerificationToken ?? ''
}

export async function getDomainVerificationStatus(ses: SESClient, domain: string): Promise<string> {
  const result = await ses.send(
    new GetIdentityVerificationAttributesCommand({ Identities: [domain] })
  )
  return result.VerificationAttributes?.[domain]?.VerificationStatus ?? 'NotStarted'
}

export async function verifyEmailIdentity(ses: SESClient, email: string): Promise<void> {
  await ses.send(new VerifyEmailIdentityCommand({ EmailAddress: email }))
}

export async function getSendQuota(ses: SESClient): Promise<{ max24h: number; sent24h: number; maxPerSecond: number }> {
  const result = await ses.send(new GetSendQuotaCommand({}))
  return {
    max24h: result.Max24HourSend ?? 0,
    sent24h: result.SentLast24Hours ?? 0,
    maxPerSecond: result.MaxSendRate ?? 0,
  }
}

export async function sendEmail(ses: SESClient, params: {
  from: string
  fromName: string
  to: string
  replyTo?: string
  subject: string
  htmlBody: string
  textBody?: string
  unsubscribeUrl?: string
}): Promise<string> {
  // htmlBody is already prepared by mailer.ts (footer + tracking pixel injected there)
  const textWithFooter = params.unsubscribeUrl && params.textBody
    ? `${params.textBody}\n\n---\nSe désinscrire : ${params.unsubscribeUrl}`
    : params.textBody

  const result = await ses.send(new SendEmailCommand({
    Source: `${params.fromName} <${params.from}>`,
    Destination: { ToAddresses: [params.to] },
    ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
    Message: {
      Subject: { Data: params.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: params.htmlBody, Charset: 'UTF-8' },
        ...(textWithFooter && { Text: { Data: textWithFooter, Charset: 'UTF-8' } }),
      },
    },
  }))
  return result.MessageId ?? ''
}

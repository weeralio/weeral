import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getSESClient, sendEmail as sesSendEmail } from '@/lib/ses'

export interface MailParams {
  from: string
  fromName: string
  to: string
  replyTo?: string
  subject: string
  htmlBody: string
  textBody?: string
  unsubscribeUrl?: string
}

export async function sendViaProvider(userId: string, params: MailParams): Promise<string> {
  const supabase = await createClient()

  // Try AWS SES first
  const { data: awsCreds } = await supabase
    .from('aws_credentials')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (awsCreds) {
    const ses = await getSESClient(userId)
    return sesSendEmail(ses, params)
  }

  // Fall back to provider_configs
  const { data: config } = await supabase
    .from('provider_configs')
    .select('provider, api_key')
    .eq('user_id', userId)
    .single()

  if (!config) throw new Error('Aucun expéditeur configuré pour cet utilisateur')

  const apiKey = decrypt(config.api_key)

  switch (config.provider) {
    case 'brevo':
      return sendViaBrevo(apiKey, params)
    case 'mailgun':
      return sendViaMailgun(apiKey, params)
    case 'sendgrid':
      return sendViaSendGrid(apiKey, params)
    default:
      throw new Error(`Fournisseur inconnu : ${config.provider}`)
  }
}

async function sendViaBrevo(apiKey: string, params: MailParams): Promise<string> {
  const html = withUnsubFooter(params.htmlBody, params.unsubscribeUrl)
  const text = withUnsubText(params.textBody, params.unsubscribeUrl)

  const body: Record<string, unknown> = {
    sender: { name: params.fromName, email: params.from },
    to: [{ email: params.to }],
    subject: params.subject,
    htmlContent: html,
  }
  if (text) body.textContent = text
  if (params.replyTo) body.replyTo = { email: params.replyTo }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Brevo error ${res.status}: ${err}`)
  }

  const json = await res.json() as { messageId?: string }
  return json.messageId ?? ''
}

async function sendViaMailgun(apiKey: string, params: MailParams): Promise<string> {
  const domain = params.from.split('@')[1]
  if (!domain) throw new Error('Impossible de déduire le domaine Mailgun depuis l\'adresse from')

  const html = withUnsubFooter(params.htmlBody, params.unsubscribeUrl)
  const text = withUnsubText(params.textBody, params.unsubscribeUrl)

  const form = new URLSearchParams()
  form.append('from', `${params.fromName} <${params.from}>`)
  form.append('to', params.to)
  form.append('subject', params.subject)
  form.append('html', html)
  if (text) form.append('text', text)
  if (params.replyTo) form.append('h:Reply-To', params.replyTo)

  const credentials = btoa(`api:${apiKey}`)
  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Mailgun error ${res.status}: ${err}`)
  }

  const json = await res.json() as { id?: string }
  return json.id ?? ''
}

async function sendViaSendGrid(apiKey: string, params: MailParams): Promise<string> {
  const html = withUnsubFooter(params.htmlBody, params.unsubscribeUrl)
  const text = withUnsubText(params.textBody, params.unsubscribeUrl)

  const content: Array<{ type: string; value: string }> = [
    { type: 'text/html', value: html },
  ]
  if (text) content.push({ type: 'text/plain', value: text })

  const body: Record<string, unknown> = {
    personalizations: [{ to: [{ email: params.to }] }],
    from: { email: params.from, name: params.fromName },
    subject: params.subject,
    content,
  }
  if (params.replyTo) body.reply_to = { email: params.replyTo }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`SendGrid error ${res.status}: ${err}`)
  }

  // SendGrid returns 202 with no body; message ID is in X-Message-Id header
  return res.headers.get('X-Message-Id') ?? ''
}

function withUnsubFooter(html: string, url?: string): string {
  if (!url) return html
  return `${html}<br><br><p style="font-size:11px;color:#999;">
    <a href="${url}" style="color:#999;">Se désinscrire</a>
  </p>`
}

function withUnsubText(text: string | undefined, url?: string): string | undefined {
  if (!text) return undefined
  if (!url) return text
  return `${text}\n\n---\nSe désinscrire : ${url}`
}

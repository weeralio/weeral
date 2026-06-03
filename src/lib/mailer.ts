import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getSESClient, sendEmail as sesSendEmail } from '@/lib/ses'
import { openPixelUrl, clickTrackUrl } from '@/lib/tokens'

export interface MailParams {
  from: string
  fromName: string
  to: string
  replyTo?: string
  subject: string
  htmlBody: string
  textBody?: string
  unsubscribeUrl?: string
  /** Pass contactId + campaignId to enable open/click tracking */
  tracking?: { contactId: string; campaignId: string }
}

export async function sendViaProvider(userId: string, params: MailParams): Promise<string> {
  const supabase = await createClient()

  const html = prepareHtml(params)

  // Try AWS SES first
  const { data: awsCreds } = await supabase
    .from('aws_credentials')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (awsCreds) {
    const ses = await getSESClient(userId)
    return sesSendEmail(ses, { ...params, htmlBody: html })
  }

  // Fall back to provider_configs
  const { data: config } = await supabase
    .from('provider_configs')
    .select('provider, api_key_encrypted')
    .eq('user_id', userId)
    .single()

  if (!config) throw new Error('Aucun expéditeur configuré pour cet utilisateur')

  const apiKey = decrypt(config.api_key_encrypted)

  switch (config.provider) {
    case 'brevo':
      return sendViaBrevo(apiKey, { ...params, htmlBody: html })
    case 'mailgun':
      return sendViaMailgun(apiKey, { ...params, htmlBody: html })
    case 'sendgrid':
      return sendViaSendGrid(apiKey, { ...params, htmlBody: html })
    default:
      throw new Error(`Fournisseur inconnu : ${config.provider}`)
  }
}

// ─── HTML preparation (unsubscribe footer + tracking) ─────────────────────────

function prepareHtml(params: MailParams): string {
  let html = params.htmlBody

  // Rewrite external links for click tracking (skip unsubscribe links)
  if (params.tracking) {
    const { contactId, campaignId } = params.tracking
    html = html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url: string) => {
      if (url.includes('/unsubscribe')) return match
      return `href="${clickTrackUrl(url, contactId, campaignId)}"`
    })
  }

  // Unsubscribe footer
  if (params.unsubscribeUrl) {
    html += `<br><br><p style="font-size:11px;color:#999;text-align:center;">
      <a href="${params.unsubscribeUrl}" style="color:#999;">Se désinscrire</a>
    </p>`
  }

  // Open tracking pixel — at the very end of the body
  if (params.tracking) {
    const { contactId, campaignId } = params.tracking
    html += `<img src="${openPixelUrl(contactId, campaignId)}" width="1" height="1" style="display:none" alt="">`
  }

  return html
}

function withUnsubText(text: string | undefined, url?: string): string | undefined {
  if (!text) return undefined
  if (!url) return text
  return `${text}\n\n---\nSe désinscrire : ${url}`
}

// ─── Brevo ────────────────────────────────────────────────────────────────────

async function sendViaBrevo(apiKey: string, params: MailParams): Promise<string> {
  const text = withUnsubText(params.textBody, params.unsubscribeUrl)

  const body: Record<string, unknown> = {
    sender: { name: params.fromName, email: params.from },
    to: [{ email: params.to }],
    subject: params.subject,
    htmlContent: params.htmlBody,
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

// ─── Mailgun ──────────────────────────────────────────────────────────────────

async function sendViaMailgun(apiKey: string, params: MailParams): Promise<string> {
  const domain = params.from.split('@')[1]
  if (!domain) throw new Error('Impossible de déduire le domaine Mailgun depuis l\'adresse from')

  const text = withUnsubText(params.textBody, params.unsubscribeUrl)

  const form = new URLSearchParams()
  form.append('from', `${params.fromName} <${params.from}>`)
  form.append('to', params.to)
  form.append('subject', params.subject)
  form.append('html', params.htmlBody)
  if (text) form.append('text', text)
  if (params.replyTo) form.append('h:Reply-To', params.replyTo)
  // Disable Mailgun's own tracking — we handle it ourselves
  form.append('o:tracking', 'no')

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
  // Strip angle brackets Mailgun adds: "<abc123>"
  return (json.id ?? '').replace(/^<|>$/g, '')
}

// ─── SendGrid ─────────────────────────────────────────────────────────────────

async function sendViaSendGrid(apiKey: string, params: MailParams): Promise<string> {
  const text = withUnsubText(params.textBody, params.unsubscribeUrl)

  const content: Array<{ type: string; value: string }> = [
    { type: 'text/html', value: params.htmlBody },
  ]
  if (text) content.push({ type: 'text/plain', value: text })

  const body: Record<string, unknown> = {
    personalizations: [{ to: [{ email: params.to }] }],
    from: { email: params.from, name: params.fromName },
    subject: params.subject,
    content,
    // Disable SendGrid tracking — we handle it ourselves
    tracking_settings: {
      click_tracking: { enable: false },
      open_tracking: { enable: false },
    },
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

  return res.headers.get('X-Message-Id') ?? ''
}

import { createClient } from '@/lib/supabase/server'
import { verifyTrackingToken } from '@/lib/tokens'
import { NextResponse } from 'next/server'

// 1×1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cid   = searchParams.get('cid')
  const cmpid = searchParams.get('cmpid')
  const token = searchParams.get('t')

  const pixel = new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })

  if (!cid || !cmpid || !token) return pixel
  if (!verifyTrackingToken(`${cid}:${cmpid}`, token)) return pixel

  try {
    const supabase = await createClient()

    // Mark email as opened (only if not already bounced/complained)
    const { data: email } = await supabase
      .from('emails')
      .select('id, status')
      .eq('contact_id', cid)
      .eq('campaign_id', cmpid)
      .single()

    if (email && email.status === 'sent') {
      await supabase
        .from('emails')
        .update({ status: 'opened', opened_at: new Date().toISOString() })
        .eq('id', email.id)

      // Update sender_identity open_rate (best-effort)
      await supabase.rpc('recalc_open_rate', { p_campaign_id: cmpid }).maybeSingle()
    }
  } catch {
    // Never block pixel delivery on DB errors
  }

  return pixel
}

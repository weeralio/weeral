import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json() as { code: string }
    if (!code?.trim()) return NextResponse.json({ error: 'Code requis' }, { status: 400 })

    const stripe = getStripe()
    const result = await stripe.promotionCodes.list({
      code: code.trim().toUpperCase(),
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    })

    const promoCode = result.data[0]
    if (!promoCode) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coupon = promoCode.coupon as any
    return NextResponse.json({
      id: promoCode.id,
      name: coupon.name ?? code,
      percentOff: coupon.percent_off ?? null,
      amountOff: coupon.amount_off ? Math.round(coupon.amount_off / 100) : null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

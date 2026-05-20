import type { Metadata } from 'next'
import PricingClient from './pricing-client'

export const metadata: Metadata = {
  title: 'Pricing — Weeral',
  description: 'Tarification simple et transparente. Starter $197/mois, Growth $247/mois, Agency $345/mois. Économisez 40% avec le plan annuel.',
}

export default function PricingPage() {
  return <PricingClient />
}

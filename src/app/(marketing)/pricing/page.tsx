import type { Metadata } from 'next'
import PricingClient from './pricing-client'
import { JsonLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Tarifs — Weeral',
  description: 'Tarification simple et transparente. Starter 147€/mois, Growth 197€/mois, Agency 347€/mois. Économisez 40% avec le plan annuel. 100 emails offerts sans carte bancaire.',
  alternates: {
    canonical: 'https://weeral.io/pricing',
  },
  openGraph: {
    url: 'https://weeral.io/pricing',
    title: 'Tarifs — Weeral',
    description: 'Starter 147€/mois · Growth 197€/mois · Agency 347€/mois. −40% en annuel. Aucun frais par email.',
    images: [
      {
        url: 'https://weeral.io/pricing/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Tarifs Weeral — Starter, Growth, Agency',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tarifs — Weeral',
    description: 'Starter 147€/mois · Growth 197€/mois · Agency 347€/mois. −40% en annuel.',
    images: ['https://weeral.io/pricing/opengraph-image'],
  },
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://weeral.io' },
          { '@type': 'ListItem', position: 2, name: 'Tarifs', item: 'https://weeral.io/pricing' },
        ],
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Weeral — Cold email B2B SaaS',
        url: 'https://weeral.io/pricing',
        description: 'SaaS de cold email B2B avec warmup automatique, rédaction IA et modèle BYOA.',
        brand: { '@type': 'Brand', name: 'Weeral' },
        offers: [
          {
            '@type': 'Offer',
            name: 'Starter',
            price: '147',
            priceCurrency: 'EUR',
            priceValidUntil: '2027-01-01',
            availability: 'https://schema.org/InStock',
            url: 'https://weeral.io/pricing',
            description: '3 domaines, 5 boîtes mail, 3 campagnes actives, warmup automatique.',
          },
          {
            '@type': 'Offer',
            name: 'Growth',
            price: '197',
            priceCurrency: 'EUR',
            priceValidUntil: '2027-01-01',
            availability: 'https://schema.org/InStock',
            url: 'https://weeral.io/pricing',
            description: '10 domaines, 20 boîtes mail, campagnes illimitées, IA complète, séquences multi-étapes.',
          },
          {
            '@type': 'Offer',
            name: 'Agency',
            price: '347',
            priceCurrency: 'EUR',
            priceValidUntil: '2027-01-01',
            availability: 'https://schema.org/InStock',
            url: 'https://weeral.io/pricing',
            description: 'Domaines illimités, boîtes illimitées, white label, support dédié.',
          },
        ],
      }} />
      <PricingClient />
    </>
  )
}

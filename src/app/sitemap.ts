import { MetadataRoute } from 'next'

const BASE = 'https://weeral.io'

// Pages indexées avec priorité et fréquence de mise à jour calibrées
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Pages principales ─────────────────────────────────────────────────────
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/a-propos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // ── Légal ─────────────────────────────────────────────────────────────────
    // Note : mentions-legales est noindex — exclue délibérément du sitemap
    {
      url: `${BASE}/confidentialite`,
      lastModified: new Date('2024-01-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/cgv`,
      lastModified: new Date('2024-01-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}

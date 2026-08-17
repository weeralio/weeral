import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Weeral — Cold email B2B automatisé',
    short_name: 'Weeral',
    description: 'Automatise tes campagnes de cold email B2B avec warmup automatique, rédaction IA et analytics en temps réel.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#07070f',
    theme_color: '#8b5cf6',
    lang: 'fr',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/logo.png', sizes: '1080x1080', type: 'image/png', purpose: 'maskable' },
      { src: '/logo.png', sizes: '1080x1080', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      {
        name: 'Tableau de bord',
        short_name: 'Dashboard',
        description: 'Accéder à mon tableau de bord',
        url: '/dashboard',
        icons: [{ src: '/logo.png', sizes: '1080x1080' }],
      },
      {
        name: 'Mes campagnes',
        short_name: 'Campagnes',
        description: 'Gérer mes campagnes email',
        url: '/dashboard/campagnes',
        icons: [{ src: '/logo.png', sizes: '1080x1080' }],
      },
    ],
    screenshots: [],
  }
}

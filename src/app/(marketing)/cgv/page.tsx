import type { Metadata } from 'next'
import { FadeUp } from '@/components/ui/motion'

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente — Weeral',
  alternates: { canonical: 'https://weeral.io/cgv' },
}

const articles = [
  {
    title: '1. Objet',
    content: `Les présentes CGV régissent l'accès et l'utilisation du service Weeral, plateforme de cold email B2B en mode SaaS. En souscrivant à un abonnement, le client accepte sans réserve les présentes CGV.`,
  },
  {
    title: '2. Description du service',
    content: `Weeral est un service SaaS permettant de gérer des campagnes de prospection email B2B en utilisant son propre compte AWS SES (modèle BYOA). Le service comprend la gestion de domaines, le warmup automatique, l'envoi de campagnes, la gestion de contacts et le monitoring de délivrabilité.`,
  },
  {
    title: '3. Tarifs et facturation',
    content: `Les tarifs en vigueur sont ceux affichés sur /tarifs au moment de la souscription, exprimés en dollars américains (USD) hors taxes. La facturation est mensuelle et renouvelée automatiquement. Les frais AWS SES sont facturés directement par Amazon sur ton compte — Weeral n'est pas partie à cette relation.`,
  },
  {
    title: '4. Résiliation',
    content: `Le client peut résilier son abonnement à tout moment depuis son espace client. La résiliation prend effet à la fin de la période mensuelle en cours. Aucun remboursement au prorata n'est effectué.`,
  },
  {
    title: '5. Obligations du client',
    content: `Le client s'engage à n'envoyer des emails qu'à des destinataires professionnels, respecter le RGPD et les réglementations anti-spam, maintenir des taux de bounce et de plaintes en dessous des seuils AWS SES, et ne pas utiliser le service pour envoyer du spam ou des contenus illégaux.`,
  },
  {
    title: '6. Responsabilité',
    content: `Weeral est un prestataire technique. La responsabilité éditoriale des campagnes incombe exclusivement au client. Weeral ne saurait être tenu responsable des conséquences liées au contenu des emails envoyés.`,
  },
  {
    title: '7. Suspension du service',
    content: `Weeral se réserve le droit de suspendre immédiatement l'accès d'un client en cas de violation des présentes CGV. Aucun remboursement ne sera accordé dans ce cas.`,
  },
  {
    title: '8. Propriété des données',
    content: `Le client reste propriétaire de l'ensemble de ses données (contacts, campagnes, domaines). Weeral ne revendique aucun droit sur ces données. En cas de résiliation, les données peuvent être exportées dans les 30 jours.`,
  },
  {
    title: '9. Modification des CGV',
    content: `Weeral se réserve le droit de modifier les présentes CGV. Le client sera informé par email au moins 30 jours avant l'entrée en vigueur des modifications.`,
  },
  {
    title: '10. Droit applicable',
    content: `Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute voie judiciaire.`,
  },
]

export default function CGVPage() {
  return (
    <div className="bg-[#07070f] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <FadeUp>
          <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Légal</p>
          <h1 className="text-4xl font-bold text-white mb-2">Conditions Générales de Vente</h1>
          <p className="text-sm text-[#475569] mb-12">Dernière mise à jour : mai 2026</p>
        </FadeUp>

        <div className="space-y-4">
          {articles.map((a, i) => (
            <FadeUp key={a.title} delay={i * 0.04}>
              <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl p-6">
                <h2 className="text-sm font-semibold text-white mb-3">{a.title}</h2>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{a.content}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.5}>
          <div className="mt-8 p-6 bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl">
            <p className="text-sm font-semibold text-white mb-2">11. Contact</p>
            <p className="text-sm text-[#94a3b8]">
              Pour toute question relative aux présentes CGV :{' '}
              <a href="mailto:hello@weeral.co" className="text-[#8b5cf6] hover:text-[#a78bfa] transition-colors">
                hello@weeral.co
              </a>
            </p>
          </div>
        </FadeUp>
      </div>
    </div>
  )
}

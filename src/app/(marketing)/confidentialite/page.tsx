import type { Metadata } from 'next'
import { FadeUp } from '@/components/ui/motion'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Weeral',
  alternates: { canonical: 'https://weeral.io/confidentialite' },
}

const sections = [
  {
    title: '1. Données collectées',
    content: `Nous collectons uniquement les données nécessaires au fonctionnement du service : adresse email (authentification), credentials AWS IAM (chiffrés AES-256-GCM avant stockage), domaines et adresses d'envoi configurés, contacts et campagnes créés, logs d'envoi (statut, bounces, plaintes).`,
  },
  {
    title: '2. Utilisation des données',
    content: `Vos données sont utilisées exclusivement pour fournir le service, gérer votre compte et abonnement, et vous contacter en cas de problème technique ou de sécurité. Nous ne vendons pas et ne partageons pas vos données à des fins commerciales.`,
  },
  {
    title: '3. Sécurité des credentials AWS',
    content: `Vos credentials AWS IAM sont chiffrés avec AES-256-GCM avant stockage en base de données. La clé de chiffrement est stockée séparément dans les variables d'environnement serveur. Aucun employé de Weeral ne peut accéder à vos credentials en clair.`,
  },
  {
    title: '4. Sous-traitants',
    content: `Supabase — base de données et authentification (AWS). Vercel — hébergement de l'application. Trigger.dev — planification des tâches. Amazon Web Services — votre compte SES (sous votre contrôle direct).`,
  },
  {
    title: '5. Conservation des données',
    content: `Vos données sont conservées tant que votre compte est actif. Lors de la suppression, toutes vos données personnelles et credentials sont supprimés dans un délai de 30 jours.`,
  },
  {
    title: '6. Vos droits (RGPD)',
    content: `Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de portabilité et d'opposition. Pour les exercer : privacy@weeral.co`,
  },
  {
    title: '7. Cookies',
    content: `Uniquement des cookies de session nécessaires à l'authentification (Supabase Auth). Ces cookies sont strictement fonctionnels et ne nécessitent pas de consentement selon la directive ePrivacy.`,
  },
  {
    title: '8. Contact',
    content: `Pour toute question : privacy@weeral.co`,
  },
]

export default function ConfidentialitePage() {
  return (
    <div className="bg-[#07070f] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <FadeUp>
          <p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4">Légal</p>
          <h1 className="text-4xl font-bold text-white mb-2">Politique de confidentialité</h1>
          <p className="text-sm text-[#475569] mb-12">Dernière mise à jour : mai 2026</p>
        </FadeUp>

        <div className="space-y-4">
          {sections.map((s, i) => (
            <FadeUp key={s.title} delay={i * 0.05}>
              <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl p-6">
                <h2 className="text-sm font-semibold text-white mb-3">{s.title}</h2>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{s.content}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </div>
  )
}

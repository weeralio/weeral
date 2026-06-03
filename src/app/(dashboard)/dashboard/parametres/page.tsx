import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getSESClient, getSendQuota } from '@/lib/ses'
import { PLAN_META } from '@/lib/stripe'
import Link from 'next/link'
import AwsCredentialsForm from './aws-credentials-form'
import SubscriptionSection from './subscription-section'
import ProviderManage from './provider-manage'
import type { ProviderType } from '../aws-setup/provider-actions'

export default async function ParametresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Subscription — admin client bypasses RLS
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('plan, billing, status, current_period_end')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // AWS credentials
  const { data: awsCreds } = await supabase
    .from('aws_credentials')
    .select('access_key_id, aws_region, ses_in_production')
    .eq('user_id', user.id)
    .single()

  // Other providers
  const { data: providerConfigs } = await supabase
    .from('provider_configs')
    .select('provider')
    .eq('user_id', user.id)

  const configuredProviders = providerConfigs?.map(p => p.provider) ?? []

  let quota = null
  if (awsCreds) {
    try {
      const ses = await getSESClient(user.id)
      quota = await getSendQuota(ses)
      const isProduction = (quota.max24h ?? 0) > 200
      if (isProduction !== awsCreds.ses_in_production) {
        await supabase.from('aws_credentials').update({ ses_in_production: isProduction }).eq('user_id', user.id)
      }
    } catch { /* credentials invalides */ }
  }

  const isProduction = quota ? quota.max24h > 200 : false

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-sm text-[#475569] mt-1">Gère ton compte et tes expéditeurs email.</p>
      </div>

      {/* Abonnement */}
      {(() => {
        const isActive = subscription && ['active', 'trialing', 'cancel_at_period_end'].includes(subscription.status)
        if (!isActive) {
          return (
            <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-1">Abonnement</h2>
              <p className="text-sm text-[#475569] mb-4">Aucun abonnement actif.</p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold hover:from-[#6d28d9] hover:to-[#7c3aed] transition-all"
              >
                Voir les offres →
              </Link>
            </div>
          )
        }
        const planId = subscription!.plan as keyof typeof PLAN_META
        const meta   = PLAN_META[planId] ?? PLAN_META.starter
        const price  = subscription!.billing === 'annual' ? meta.annualPrice : meta.monthlyPrice
        return (
          <SubscriptionSection
            plan={subscription!.plan}
            billing={subscription!.billing}
            status={subscription!.status}
            periodEnd={subscription!.current_period_end}
            planName={meta.name}
            price={price}
          />
        )
      })()}

      {/* Expéditeurs actifs */}
      <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Expéditeurs configurés</h2>
          <Link href="/dashboard/aws-setup" className="text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors">
            + Ajouter / modifier
          </Link>
        </div>

        {!awsCreds && configuredProviders.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#475569] mb-3">Aucun expéditeur configuré.</p>
            <Link href="/dashboard/aws-setup" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white text-sm font-semibold">
              Choisir un expéditeur →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {awsCreds && (
              <div className="flex items-center justify-between bg-[#07070f] border border-[#1e1e3f] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-white font-medium">AWS SES</span>
                  <span className="text-xs text-[#475569]">{awsCreds.aws_region}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isProduction ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/30' : 'bg-amber-950/50 text-amber-400 border border-amber-800/30'}`}>
                  {isProduction ? 'Production' : 'Sandbox'}
                </span>
              </div>
            )}
            <ProviderManage providers={configuredProviders as ProviderType[]} />
          </div>
        )}
      </div>

      {/* Quota AWS si connecté */}
      {quota && (
        <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Quota AWS SES</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Mode', value: isProduction ? 'Production' : 'Sandbox', highlight: true },
              { label: 'Quota 24h', value: quota.max24h.toLocaleString() },
              { label: 'Envoyés (24h)', value: quota.sent24h.toLocaleString() },
            ].map(s => (
              <div key={s.label} className="bg-[#07070f] border border-[#1e1e3f] rounded-xl p-3 text-center">
                <p className="text-xs text-[#475569] mb-1">{s.label}</p>
                {s.highlight ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isProduction ? 'bg-emerald-950/50 text-emerald-400' : 'bg-amber-950/50 text-amber-400'}`}>
                    {s.value}
                  </span>
                ) : (
                  <p className="text-sm font-semibold text-white">{s.value}</p>
                )}
              </div>
            ))}
          </div>
          {!isProduction && (
            <p className="mt-4 text-xs text-amber-400 bg-amber-950/20 border border-amber-800/30 px-3 py-2 rounded-lg">
              Mode sandbox — tu ne peux envoyer qu&apos;à des adresses vérifiées. Demande l&apos;accès production dans AWS Console → SES → Account dashboard.
            </p>
          )}
        </div>
      )}

      {/* Modifier credentials AWS */}
      {awsCreds && (
        <div className="bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-1">Credentials AWS SES</h2>
          <p className="text-xs text-[#475569] mb-5">Chiffrées AES-256-GCM avant stockage.</p>
          <AwsCredentialsForm existingRegion={awsCreds.aws_region ?? 'eu-west-1'} hasCredentials={!!awsCreds} />
        </div>
      )}
    </div>
  )
}

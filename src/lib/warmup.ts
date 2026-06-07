// ─── Volume schedule ──────────────────────────────────────────────────────────
// J1–J3 : repos obligatoire (aucun envoi)
// J4    : 5 emails (démarrage)
// J5+   : +10 %/jour, plafond 5 000/boîte
// Warmup considéré terminé à J14

const MAX_VOLUME = 5_000
const GROWTH_RATE = 1.1
export const WARMUP_TOTAL_DAYS = 14  // domaine marqué warmed_up au J14

export function getDailyVolumeForMailbox(warmupDay: number, previousVolume = 5): number {
  if (warmupDay <= 3) return 0
  if (warmupDay === 4) return 5
  return Math.min(Math.round(previousVolume * GROWTH_RATE), MAX_VOLUME)
}

export function isRestPeriod(warmupDay: number): boolean {
  return warmupDay >= 1 && warmupDay <= 3
}

export function isWarmupComplete(warmupDay: number): boolean {
  return warmupDay >= WARMUP_TOTAL_DAYS
}

// J4–J11 : 50% des destinataires = boîtes contrôlées
export function requiresControlledBoxes(warmupDay: number): boolean {
  return warmupDay >= 4 && warmupDay <= 11
}

export function getControlledRatio(warmupDay: number): number {
  return requiresControlledBoxes(warmupDay) ? 0.5 : 0
}

export function getContentType(warmupDay: number): 'conversational' | 'neutral_link' | 'campaign' {
  if (warmupDay <= 8) return 'conversational'
  if (warmupDay === 9) return 'neutral_link'
  return 'campaign'
}

export function hasAbTest(warmupDay: number): boolean {
  return warmupDay >= 10
}

// Label descriptif pour l'UI
export function getPhaseLabel(warmupDay: number): { name: string; description: string; hint: string } {
  if (warmupDay <= 3) return {
    name: 'Repos post-acquisition',
    description: 'Période de repos obligatoire. Les FAI ont besoin de temps pour enregistrer le nouveau domaine.',
    hint: 'Aucun envoi pendant 3 jours. C\'est la règle #1 pour éviter d\'être flaggé dès le départ.',
  }
  if (warmupDay <= 8) return {
    name: 'Établissement de réputation',
    description: 'Petits volumes conversationnels sans lien. Les FAI apprennent à faire confiance à ta boîte.',
    hint: 'Contenu humain, naturel. Zéro mot trigger spam. 50% des destinataires sont tes boîtes de contrôle.',
  }
  if (warmupDay === 9) return {
    name: 'Premier lien neutre',
    description: 'Introduction d\'un lien non commercial (article, ressource). Test de cliquabilité.',
    hint: 'Utilise un lien vers du contenu éditorial. Surveille le taux de clic — c\'est un signal fort pour les FAI.',
  }
  if (warmupDay <= 11) return {
    name: 'Contenu réel + A/B test',
    description: 'Le contenu de ta campagne réelle est introduit avec 2 variantes testées en parallèle.',
    hint: 'La meilleure variante sera identifiée automatiquement pour les envois suivants.',
  }
  return {
    name: 'Accélération',
    description: 'Montée en charge de +10%/jour jusqu\'au plafond de 5 000 emails/boîte/jour.',
    hint: 'Surveille les métriques quotidiennement. Une chute d\'ouverture déclenche une restriction automatique.',
  }
}

// ─── Monitoring thresholds ────────────────────────────────────────────────────

export const THRESHOLDS = {
  hardBounce:  { alert: 3,    critical: 5    },  // %
  softBounce:  { alert: 8,    critical: 15   },  // %
  complaint:   { alert: 0.1,  critical: 0.3  },  // %
  unsub:       { alert: 2,    critical: 5    },  // % per send
  openRate:    { critical: 5  },                 // % min (on 3 consecutive sends)
  openDrop:    { alert: 30    },                 // % drop in 24h
  clickRate:   { critical: 0.5 },               // % min (on 3 consecutive sends)
  clickDrop:   { alert: 40    },                 // % drop in 24h
} as const

export type SuspensionStep = 0 | 1 | 2 | 3 | 4
// 0 = none | 1 = alert (sends continue) | 2 = restricted (−50%) | 3 = suspended | 4 = domain suspended

export type AlertLevel = 'info' | 'alert' | 'restricted' | 'suspended' | 'domain_suspended' | 'resumed'

export interface MonitoringResult {
  nextStep: SuspensionStep
  level: AlertLevel
  metric: string
  value: number
  threshold: number
  message: string
  recommendation: string
}

// Règle fondamentale : jamais de saut d'étape
// current_step 0 → max nextStep 1
// current_step 1 → max nextStep 2
// etc.
function clampStep(current: SuspensionStep, desired: SuspensionStep): SuspensionStep {
  return Math.min(current + 1, desired, 4) as SuspensionStep
}

function stepToLevel(step: SuspensionStep): AlertLevel {
  if (step >= 4) return 'domain_suspended'
  if (step >= 3) return 'suspended'
  if (step >= 2) return 'restricted'
  return 'alert'
}

export interface MailboxMetrics {
  hard_bounce_rate: number
  soft_bounce_rate: number
  complaint_rate: number
  unsub_rate: number
  open_rate: number
  click_rate: number
  open_rate_previous?: number   // from yesterday's event
  click_rate_previous?: number
  consecutive_low_opens?: number   // count of sends with open_rate < 5%
  consecutive_low_clicks?: number  // count of sends with click_rate < 0.5%
  current_step: SuspensionStep
}

// Returns the MOST SEVERE issue found, or null if everything is ok
export function checkMonitoring(m: MailboxMetrics): MonitoringResult | null {
  const { current_step } = m

  // ── Plaintes spam (priorité maximale) ──
  if (m.complaint_rate > THRESHOLDS.complaint.critical) {
    const next = clampStep(current_step, 3)
    return {
      nextStep: next, level: stepToLevel(next),
      metric: 'complaint_rate', value: m.complaint_rate, threshold: THRESHOLDS.complaint.critical,
      message: `Plaintes spam critiques : ${m.complaint_rate.toFixed(3)}% (seuil : ${THRESHOLDS.complaint.critical}%)`,
      recommendation: 'Vérifie tes sources de contacts. Ajoute un lien de désabonnement bien visible. Audite le contenu pour supprimer tout ce qui ressemble à du spam.',
    }
  }

  // ── Bounce hard critique ──
  if (m.hard_bounce_rate > THRESHOLDS.hardBounce.critical) {
    const next = clampStep(current_step, 3)
    return {
      nextStep: next, level: stepToLevel(next),
      metric: 'hard_bounce_rate', value: m.hard_bounce_rate, threshold: THRESHOLDS.hardBounce.critical,
      message: `Bounce hard critique : ${m.hard_bounce_rate.toFixed(1)}% (seuil : ${THRESHOLDS.hardBounce.critical}%)`,
      recommendation: 'Nettoie ta liste immédiatement — supprime les adresses invalides. Vérifie SPF, DKIM, DMARC. Considère un service de vérification email avant envoi.',
    }
  }

  // ── Désabonnements critiques ──
  if (m.unsub_rate > THRESHOLDS.unsub.critical) {
    const next = clampStep(current_step, 2)
    return {
      nextStep: next, level: stepToLevel(next),
      metric: 'unsub_rate', value: m.unsub_rate, threshold: THRESHOLDS.unsub.critical,
      message: `Désabonnements critiques : ${m.unsub_rate.toFixed(1)}%/envoi (pause recommandée à ${THRESHOLDS.unsub.critical}%)`,
      recommendation: 'Le contenu ou le ciblage ne correspond pas aux attentes. Revois le message et segmente mieux ta liste avant de reprendre.',
    }
  }

  // ── Alertes niveau 1 (envois continuent, step → 1 max) ──
  if (m.complaint_rate > THRESHOLDS.complaint.alert && current_step === 0) {
    return {
      nextStep: 1, level: 'alert',
      metric: 'complaint_rate', value: m.complaint_rate, threshold: THRESHOLDS.complaint.alert,
      message: `Plaintes en hausse : ${m.complaint_rate.toFixed(3)}% (alerte à ${THRESHOLDS.complaint.alert}%)`,
      recommendation: 'Surveille de près. Vérifie l\'opt-in de tes contacts. Les envois continuent mais la situation doit être résolue sous 48h.',
    }
  }

  if (m.hard_bounce_rate > THRESHOLDS.hardBounce.alert && current_step === 0) {
    return {
      nextStep: 1, level: 'alert',
      metric: 'hard_bounce_rate', value: m.hard_bounce_rate, threshold: THRESHOLDS.hardBounce.alert,
      message: `Bounce hard élevé : ${m.hard_bounce_rate.toFixed(1)}% (alerte à ${THRESHOLDS.hardBounce.alert}%)`,
      recommendation: 'Commence à nettoyer ta liste. Utilise un outil de vérification email. Les envois continuent, surveille l\'évolution sur 24h.',
    }
  }

  if (m.unsub_rate > THRESHOLDS.unsub.alert && current_step === 0) {
    return {
      nextStep: 1, level: 'alert',
      metric: 'unsub_rate', value: m.unsub_rate, threshold: THRESHOLDS.unsub.alert,
      message: `Désabonnements élevés : ${m.unsub_rate.toFixed(1)}%/envoi (alerte à ${THRESHOLDS.unsub.alert}%)`,
      recommendation: 'Revois la pertinence du ciblage. Les envois continuent mais le contenu doit être revu.',
    }
  }

  // ── Chute d'ouverture ──
  if (m.open_rate_previous !== undefined && m.open_rate_previous > 0) {
    const drop = ((m.open_rate_previous - m.open_rate) / m.open_rate_previous) * 100
    if (drop > THRESHOLDS.openDrop.alert && current_step === 0) {
      return {
        nextStep: 1, level: 'alert',
        metric: 'open_rate_drop', value: drop, threshold: THRESHOLDS.openDrop.alert,
        message: `Chute d'ouverture de ${drop.toFixed(0)}% en 24h (${m.open_rate_previous.toFixed(1)}% → ${m.open_rate.toFixed(1)}%)`,
        recommendation: 'Vérifie si les emails arrivent en spam. Teste en envoyant à tes propres adresses. L\'objet et le préheader doivent être améliorés.',
      }
    }
  }

  if ((m.consecutive_low_opens ?? 0) >= 3) {
    const next = clampStep(current_step, 2)
    return {
      nextStep: next, level: stepToLevel(next),
      metric: 'open_rate', value: m.open_rate, threshold: THRESHOLDS.openRate.critical,
      message: `Taux d'ouverture < ${THRESHOLDS.openRate.critical}% sur 3 envois consécutifs`,
      recommendation: 'Signal fort de mise en spam. Volume réduit à 50%. Change l\'objet, le domaine d\'envoi ou l\'adresse expéditrice. Vérification DNS urgente.',
    }
  }

  // ── Chute de clic ──
  if (m.click_rate_previous !== undefined && m.click_rate_previous > 0) {
    const drop = ((m.click_rate_previous - m.click_rate) / m.click_rate_previous) * 100
    if (drop > THRESHOLDS.clickDrop.alert && current_step === 0) {
      return {
        nextStep: 1, level: 'alert',
        metric: 'click_rate_drop', value: drop, threshold: THRESHOLDS.clickDrop.alert,
        message: `Chute de clic de ${drop.toFixed(0)}% en 24h`,
        recommendation: 'Le lien ou le CTA n\'est plus efficace. Teste une nouvelle variante de contenu.',
      }
    }
  }

  if ((m.consecutive_low_clicks ?? 0) >= 3) {
    const next = clampStep(current_step, 2)
    return {
      nextStep: next, level: stepToLevel(next),
      metric: 'click_rate', value: m.click_rate, threshold: THRESHOLDS.clickRate.critical,
      message: `Taux de clic < ${THRESHOLDS.clickRate.critical}% sur 3 envois consécutifs`,
      recommendation: 'Le contenu ne génère pas d\'engagement. Revois le CTA et teste une nouvelle approche avant de reprendre à plein volume.',
    }
  }

  return null
}

// Volume effectif selon le step de suspension
export function getEffectiveVolume(plannedVolume: number, suspensionStep: SuspensionStep): number {
  if (suspensionStep >= 3) return 0              // suspended
  if (suspensionStep === 2) return Math.floor(plannedVolume * 0.5)  // restricted
  return plannedVolume
}

// Après suspension : durée de repos minimum avant reprise
export const SUSPENSION_COOLDOWN_DAYS = 10

export function canResume(suspendedUntil: Date | null): boolean {
  if (!suspendedUntil) return true
  return new Date() >= suspendedUntil
}

// Deprecated compat exports (domain-level, kept for existing UI)
export const BOUNCE_RATE_THRESHOLD    = 5
export const COMPLAINT_RATE_THRESHOLD = 0.1
export function getDailyLimit(warmupDay: number): number {
  return getDailyVolumeForMailbox(warmupDay)
}

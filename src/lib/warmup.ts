// ─── Modes de warmup ─────────────────────────────────────────────────────────

export type WarmupMode = 'accelerated' | 'progressive'

const MAX_VOLUME = 5_000
export const WARMUP_TOTAL_DAYS             = 14   // accéléré
export const WARMUP_TOTAL_DAYS_PROGRESSIVE = 40   // progressif

// ── Accéléré (schéma original) ────────────────────────────────────────────────
// J1–J3 : 0  |  J4 : 5  |  J5+ : +10%/jour, plafond 5 000
function getAcceleratedVolume(warmupDay: number, previousVolume = 5): number {
  if (warmupDay <= 3) return 0
  if (warmupDay === 4) return 5
  return Math.min(Math.round(previousVolume * 1.1), MAX_VOLUME)
}

// ── Progressif (nouveau schéma) ───────────────────────────────────────────────
// J4–J8  : 5 → 15 (sans lien)
// J9–J10 : 15–16 (premier lien neutre sur 2 jours)
// J11–J14 : 15 → 21 (contenu warmup, pas de campagne)
// J15–J21 : 21 → 30
// J22+    : +5%/jour
function getProgressiveVolume(warmupDay: number, previousVolume = 5): number {
  if (warmupDay <= 3) return 0
  if (warmupDay === 4) return 5
  if (warmupDay <= 8) return Math.round(5 + (warmupDay - 4) * 2.5)    // 5 → 15
  if (warmupDay <= 10) return 15 + (warmupDay - 9)                     // 15, 16
  if (warmupDay <= 14) return Math.round(15 + (warmupDay - 11) * 2)   // 15 → 21
  if (warmupDay <= 21) return Math.round(21 + (warmupDay - 15) * 1.5) // 21 → 30
  return Math.min(Math.round(previousVolume * 1.05), MAX_VOLUME)
}

export function getDailyVolumeForMailbox(warmupDay: number, previousVolume = 5, mode: WarmupMode = 'accelerated'): number {
  return mode === 'progressive'
    ? getProgressiveVolume(warmupDay, previousVolume)
    : getAcceleratedVolume(warmupDay, previousVolume)
}

export function isRestPeriod(warmupDay: number): boolean {
  return warmupDay >= 1 && warmupDay <= 3
}

export function isWarmupComplete(warmupDay: number, mode: WarmupMode = 'accelerated'): boolean {
  return warmupDay >= (mode === 'progressive' ? WARMUP_TOTAL_DAYS_PROGRESSIVE : WARMUP_TOTAL_DAYS)
}

// Boîtes de contrôle : J4–J11 (accéléré) | J4–J10 (progressif)
export function requiresControlledBoxes(warmupDay: number, mode: WarmupMode = 'accelerated'): boolean {
  if (mode === 'progressive') return warmupDay >= 4 && warmupDay <= 10
  return warmupDay >= 4 && warmupDay <= 11
}

export function getControlledRatio(warmupDay: number, mode: WarmupMode = 'accelerated'): number {
  return requiresControlledBoxes(warmupDay, mode) ? 0.5 : 0
}

export function getContentType(warmupDay: number, mode: WarmupMode = 'accelerated'): 'conversational' | 'neutral_link' | 'campaign' {
  if (warmupDay <= 8) return 'conversational'
  if (mode === 'progressive' && warmupDay <= 10) return 'neutral_link'
  if (mode === 'accelerated' && warmupDay === 9) return 'neutral_link'
  return 'campaign'
}

export function hasAbTest(warmupDay: number, mode: WarmupMode = 'accelerated'): boolean {
  return mode === 'progressive' ? warmupDay >= 11 : warmupDay >= 10
}

// Phase de message selon le jour et le mode
export function getPhaseForDay(warmupDay: number, mode: WarmupMode = 'accelerated'): 'j4_j8' | 'j9' | 'j10_j14' {
  if (warmupDay <= 8) return 'j4_j8'
  if (mode === 'progressive' && warmupDay <= 10) return 'j9'
  if (mode === 'accelerated' && warmupDay === 9) return 'j9'
  return 'j10_j14'
}

// Label descriptif pour l'UI
export function getPhaseLabel(warmupDay: number, mode: WarmupMode = 'accelerated'): { name: string; description: string; hint: string } {
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
  if (mode === 'progressive' && warmupDay <= 10) return {
    name: 'Introduction lien neutre',
    description: 'Introduction d\'un lien non commercial sur 2 jours. Volume maintenu bas.',
    hint: 'Lien vers contenu éditorial uniquement. Surveille le taux de clic.',
  }
  if (mode === 'accelerated' && warmupDay === 9) return {
    name: 'Premier lien neutre',
    description: 'Introduction d\'un lien non commercial (article, ressource). Test de cliquabilité.',
    hint: 'Utilise un lien vers du contenu éditorial. Le taux de clic est un signal fort pour les FAI.',
  }
  if (mode === 'progressive') {
    if (warmupDay <= 14) return {
      name: 'Montée douce (warmup)',
      description: 'Volume en croissance prudemment — contenu warmup, pas de campagne réelle.',
      hint: 'La réputation continue de se construire. Pas de contenu commercial pour l\'instant.',
    }
    if (warmupDay <= 21) return {
      name: 'Phase intermédiaire',
      description: 'Montée vers 30 emails/boîte. Surveillance active des métriques.',
      hint: 'Volume modéré, contenu toujours warmup.',
    }
    return {
      name: 'Accélération douce',
      description: '+5%/jour jusqu\'au plafond de 5 000 emails/boîte/jour.',
      hint: 'Le vrai contenu campagne peut être introduit prudemment.',
    }
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
  open_rate_previous?: number
  click_rate_previous?: number
  consecutive_low_opens?: number
  consecutive_low_clicks?: number
  current_step: SuspensionStep
}

// Returns the MOST SEVERE issue found, or null if everything is ok
export function checkMonitoring(m: MailboxMetrics): MonitoringResult | null {
  const { current_step } = m

  if (m.complaint_rate > THRESHOLDS.complaint.critical) {
    const next = clampStep(current_step, 3)
    return {
      nextStep: next, level: stepToLevel(next),
      metric: 'complaint_rate', value: m.complaint_rate, threshold: THRESHOLDS.complaint.critical,
      message: `Plaintes spam critiques : ${m.complaint_rate.toFixed(3)}% (seuil : ${THRESHOLDS.complaint.critical}%)`,
      recommendation: 'Vérifie tes sources de contacts. Ajoute un lien de désabonnement bien visible. Audite le contenu pour supprimer tout ce qui ressemble à du spam.',
    }
  }

  if (m.hard_bounce_rate > THRESHOLDS.hardBounce.critical) {
    const next = clampStep(current_step, 3)
    return {
      nextStep: next, level: stepToLevel(next),
      metric: 'hard_bounce_rate', value: m.hard_bounce_rate, threshold: THRESHOLDS.hardBounce.critical,
      message: `Bounce hard critique : ${m.hard_bounce_rate.toFixed(1)}% (seuil : ${THRESHOLDS.hardBounce.critical}%)`,
      recommendation: 'Nettoie ta liste immédiatement — supprime les adresses invalides. Vérifie SPF, DKIM, DMARC. Considère un service de vérification email avant envoi.',
    }
  }

  if (m.unsub_rate > THRESHOLDS.unsub.critical) {
    const next = clampStep(current_step, 2)
    return {
      nextStep: next, level: stepToLevel(next),
      metric: 'unsub_rate', value: m.unsub_rate, threshold: THRESHOLDS.unsub.critical,
      message: `Désabonnements critiques : ${m.unsub_rate.toFixed(1)}%/envoi (pause recommandée à ${THRESHOLDS.unsub.critical}%)`,
      recommendation: 'Le contenu ou le ciblage ne correspond pas aux attentes. Revois le message et segmente mieux ta liste avant de reprendre.',
    }
  }

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

export function getEffectiveVolume(plannedVolume: number, suspensionStep: SuspensionStep): number {
  if (suspensionStep >= 3) return 0
  if (suspensionStep === 2) return Math.floor(plannedVolume * 0.5)
  return plannedVolume
}

export const SUSPENSION_COOLDOWN_DAYS = 10

export function canResume(suspendedUntil: Date | null): boolean {
  if (!suspendedUntil) return true
  return new Date() >= suspendedUntil
}

// Deprecated compat exports
export const BOUNCE_RATE_THRESHOLD    = 5
export const COMPLAINT_RATE_THRESHOLD = 0.1
export function getDailyLimit(warmupDay: number): number {
  return getDailyVolumeForMailbox(warmupDay)
}

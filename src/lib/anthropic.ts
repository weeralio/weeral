import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODELS = {
  sequence: 'claude-opus-4-7',    // génération séquence : meilleure qualité
  chat:     'claude-sonnet-4-6',  // chat interactif : rapidité + coût
} as const

// Types partagés
export interface SequenceEmail {
  order:      number
  day_offset: number
  email_type: 'accroche' | 'valeur' | 'follow_up' | 'breakup'
  subject:    string
  html_body:  string
  text_body:  string
  ai_tip:     string
}

export interface GeneratedSequence {
  strategy: string
  sequence: SequenceEmail[]
}

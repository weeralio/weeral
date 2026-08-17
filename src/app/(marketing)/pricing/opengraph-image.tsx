import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Tarifs Weeral — Starter, Growth, Agency'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #07070f 0%, #111128 55%, #1e1b4b 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '22px', height: '16px', background: 'white', borderRadius: '2px' }} />
        </div>
        <span style={{ fontSize: '26px', fontWeight: 700, color: 'white' }}>Weeral</span>
      </div>

      <div
        style={{
          fontSize: '56px',
          fontWeight: 800,
          color: 'white',
          textAlign: 'center',
          lineHeight: 1.1,
          marginBottom: '16px',
          letterSpacing: '-1px',
        }}
      >
        Tarification simple,{'\n'}
        <span style={{ color: '#a78bfa' }}>sans surprise.</span>
      </div>

      <p style={{ fontSize: '20px', color: '#94a3b8', textAlign: 'center', margin: '0 0 32px', maxWidth: '680px' }}>
        Starter 147€ · Growth 197€ · Agency 347€ — Économisez 40% en annuel
      </p>

      <div style={{ display: 'flex', gap: '16px' }}>
        {[
          { name: 'Starter', price: '147€', color: '#475569' },
          { name: 'Growth', price: '197€', color: '#8b5cf6', popular: true },
          { name: 'Agency', price: '347€', color: '#475569' },
        ].map((plan) => (
          <div
            key={plan.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 24px',
              background: plan.popular ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${plan.popular ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '12px',
              minWidth: '140px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px' }}>{plan.name}</span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: plan.popular ? '#a78bfa' : 'white' }}>
              {plan.price}
            </span>
            <span style={{ fontSize: '12px', color: '#475569' }}>/mois</span>
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  )
}

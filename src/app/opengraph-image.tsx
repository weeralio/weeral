import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Weeral — Cold email B2B automatisé'
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
      {/* Logo row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '26px', height: '20px', background: 'white', borderRadius: '3px' }} />
        </div>
        <span style={{ fontSize: '30px', fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>
          Weeral
        </span>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: '62px',
          fontWeight: 800,
          color: 'white',
          textAlign: 'center',
          lineHeight: 1.08,
          marginBottom: '20px',
          letterSpacing: '-1px',
        }}
      >
        Cold email B2B.{'\n'}
        <span style={{ color: '#a78bfa' }}>Automatisé de A à Z.</span>
      </div>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '22px',
          color: '#94a3b8',
          textAlign: 'center',
          margin: 0,
          maxWidth: '720px',
          lineHeight: 1.5,
        }}
      >
        Warmup automatique · Rédaction IA · Brevo, Mailgun, SendGrid, AWS SES
      </p>

      {/* Bottom badge */}
      <div
        style={{
          marginTop: '36px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '100px',
          padding: '8px 20px',
        }}
      >
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
        <span style={{ fontSize: '16px', color: '#a78bfa', fontWeight: 600 }}>
          100 emails offerts · Sans carte bancaire
        </span>
      </div>
    </div>,
    { ...size },
  )
}

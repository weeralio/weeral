'use client'

import { useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type BlockType = 'text' | 'heading' | 'button' | 'divider' | 'spacer' | 'image'
type EditorMode = 'blocks' | 'html' | 'text'
type Align = 'left' | 'center' | 'right'

interface Block {
  id: string
  type: BlockType
  content: string
  align: Align
  level: 1 | 2 | 3
  url: string
  src: string
  alt: string
  height: number
  bgColor: string
  textColor: string
  fontSize: number
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 11) }
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Block factory ──────────────────────────────────────────────────────────────

function makeBlock(type: BlockType, overrides: Partial<Block> = {}): Block {
  const base: Block = {
    id: uid(), type, content: '', align: 'left',
    level: 2, url: '', src: '', alt: '', height: 24,
    bgColor: '#7c3aed', textColor: '#ffffff', fontSize: 15,
  }
  const defaults: Record<BlockType, Partial<Block>> = {
    text:    { content: 'Votre texte ici…', fontSize: 15 },
    heading: { content: 'Titre', level: 2, fontSize: 22 },
    button:  { content: 'Cliquez ici', align: 'center', url: 'https://' },
    divider: {},
    spacer:  { height: 24 },
    image:   { align: 'center' },
  }
  return { ...base, ...defaults[type], ...overrides, id: uid() }
}

// ── HTML renderer ──────────────────────────────────────────────────────────────

function renderBlock(b: Block): string {
  const ta = `text-align:${b.align};`
  switch (b.type) {
    case 'text':
      return `<p style="margin:0 0 14px;${ta}font-size:${b.fontSize}px;line-height:1.65;color:#374151;">${esc(b.content).replace(/\n/g, '<br>')}</p>`
    case 'heading': {
      const fs = b.level === 1 ? '28px' : b.level === 2 ? '22px' : '18px'
      const fw = b.level === 3 ? '600' : '700'
      return `<h${b.level} style="margin:0 0 14px;${ta}font-size:${fs};font-weight:${fw};color:#111827;line-height:1.3;">${esc(b.content)}</h${b.level}>`
    }
    case 'button':
      return `<div style="margin:20px 0;${ta}"><a href="${b.url}" style="display:inline-block;padding:12px 28px;background:${b.bgColor};color:${b.textColor};text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;font-family:Arial,sans-serif;">${esc(b.content)}</a></div>`
    case 'divider':
      return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">`
    case 'spacer':
      return `<div style="height:${b.height}px;"></div>`
    case 'image':
      return b.src
        ? `<div style="margin:16px 0;${ta}"><img src="${b.src}" alt="${esc(b.alt)}" style="max-width:100%;height:auto;border-radius:6px;display:inline-block;"></div>`
        : ''
    default: return ''
  }
}

function blocksToHtml(blocks: Block[]): string {
  const body = blocks.map(renderBlock).filter(Boolean).join('\n')
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:32px 40px;box-sizing:border-box;">\n${body}\n</div>`
}

function textToHtml(text: string): string {
  return text.split('\n\n').map(p => p.trim()).filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151;">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

function blocksToText(blocks: Block[]): string {
  return blocks.filter(b => b.type === 'text' || b.type === 'heading').map(b => b.content).join('\n\n')
}

// ── Templates ──────────────────────────────────────────────────────────────────

interface Template { id: string; name: string; desc: string; blocks: Block[] }

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Vide',
    desc: 'Partir de zéro',
    blocks: [],
  },
  {
    id: 'cold',
    name: 'Email froid',
    desc: 'Simple et conversationnel',
    blocks: [
      makeBlock('text', { content: 'Bonjour {{first_name}},' }),
      makeBlock('text', { content: "Je me permets de vous contacter car j'ai vu que {{company}} travaille sur…" }),
      makeBlock('text', { content: "Seriez-vous disponible pour un échange de 15 minutes cette semaine ?" }),
      makeBlock('divider'),
      makeBlock('text', { content: 'Cordialement,\n[Votre nom]', fontSize: 14 }),
    ],
  },
  {
    id: 'cta',
    name: 'Email avec CTA',
    desc: 'Accroche + bouton d\'action',
    blocks: [
      makeBlock('heading', { content: 'Une question rapide, {{first_name}} ?', level: 2 }),
      makeBlock('text', { content: "Nous aidons des entreprises comme {{company}} à générer plus de résultats avec moins d'effort." }),
      makeBlock('text', { content: "En 15 minutes, je vous montre exactement comment ça marche pour votre secteur." }),
      makeBlock('button', { content: 'Réserver un créneau gratuit', url: 'https://', bgColor: '#7c3aed', textColor: '#ffffff' }),
      makeBlock('divider'),
      makeBlock('text', { content: 'À très vite,\n[Votre nom]', fontSize: 14 }),
    ],
  },
  {
    id: 'followup',
    name: 'Relance',
    desc: 'Suite à un premier email',
    blocks: [
      makeBlock('text', { content: 'Bonjour {{first_name}},' }),
      makeBlock('text', { content: "Je reviens vers vous suite à mon précédent email — je n'ai pas eu de réponse et je me demandais si vous aviez eu le temps d'y jeter un œil." }),
      makeBlock('text', { content: "Seriez-vous la bonne personne à contacter, ou y a-t-il quelqu'un de plus approprié dans votre équipe ?" }),
      makeBlock('divider'),
      makeBlock('text', { content: 'Cordialement,', fontSize: 14 }),
    ],
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    desc: 'Contenu éditorial structuré',
    blocks: [
      makeBlock('heading', { content: '📬 Actualités du mois', level: 1, align: 'center' }),
      makeBlock('divider'),
      makeBlock('heading', { content: 'Nouveauté #1', level: 2 }),
      makeBlock('text', { content: "Description de la nouveauté. Expliquez l'essentiel en 2-3 phrases claires." }),
      makeBlock('button', { content: 'En savoir plus →', url: 'https://', bgColor: '#111827', textColor: '#ffffff' }),
      makeBlock('spacer', { height: 32 }),
      makeBlock('heading', { content: 'Nouveauté #2', level: 2 }),
      makeBlock('text', { content: "Deuxième point intéressant à partager avec vos lecteurs." }),
      makeBlock('divider'),
      makeBlock('text', { content: 'À très bientôt !', align: 'center', fontSize: 14 }),
    ],
  },
]

// ── Palette ────────────────────────────────────────────────────────────────────

const PALETTE: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'text',    label: 'Texte',      icon: <span className="font-serif italic text-base leading-none">T</span> },
  { type: 'heading', label: 'Titre',      icon: <span className="font-bold text-base leading-none">H</span> },
  { type: 'button',  label: 'Bouton',     icon: <span className="text-[10px] leading-none">▬</span> },
  { type: 'divider', label: 'Séparateur', icon: <span className="text-base leading-none">—</span> },
  { type: 'spacer',  label: 'Espace',     icon: <span className="text-base leading-none">↕</span> },
  { type: 'image',   label: 'Image',      icon: <span className="text-base leading-none">⬜</span> },
]

// ── Template Gallery Modal ─────────────────────────────────────────────────────

function TemplateGallery({ onSelect, onClose }: {
  onSelect: (tpl: Template) => void
  onClose: () => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#0d0d1c] border border-[#1e1e3f] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e3f]">
          <div>
            <h2 className="text-base font-semibold text-white">Choisir un template</h2>
            <p className="text-xs text-[#475569] mt-0.5">Cliquez sur un template pour commencer</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-[#1e1e3f] transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-6 grid grid-cols-3 gap-4">
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              onMouseEnter={() => setHovered(tpl.id)}
              onMouseLeave={() => setHovered(null)}
              className={`group text-left rounded-xl border transition-all overflow-hidden ${
                hovered === tpl.id ? 'border-violet-500/60 shadow-lg shadow-violet-950/30' : 'border-[#1e1e3f] hover:border-[#3b3b6f]'
              }`}
            >
              {/* Mini preview */}
              <div className="relative bg-white overflow-hidden" style={{ height: 200 }}>
                {tpl.blocks.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5} className="mx-auto mb-2"><path d="M12 4v16m8-8H4"/></svg>
                      <p className="text-xs text-gray-400">Canvas vide</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="absolute top-0 left-0 origin-top-left pointer-events-none"
                    style={{ width: '200%', transform: 'scale(0.5)' }}
                    dangerouslySetInnerHTML={{ __html: blocksToHtml(tpl.blocks) }}
                  />
                )}
                {hovered === tpl.id && (
                  <div className="absolute inset-0 bg-violet-600/10 flex items-center justify-center">
                    <span className="bg-violet-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
                      Utiliser ce template
                    </span>
                  </div>
                )}
              </div>
              {/* Label */}
              <div className="px-3 py-2.5 bg-[#0a0a18] border-t border-[#1e1e3f]">
                <p className="text-sm font-medium text-white">{tpl.name}</p>
                <p className="text-[11px] text-[#475569] mt-0.5">{tpl.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Block row in the left list ─────────────────────────────────────────────────
// Drop indicator: each row detects mouse Y position to decide insert before/after

function BlockRow({ block, selected, dragging, dropIndicator, onClick, onDragStart, onDragEnd, onDragOver, onDrop, onDelete }: {
  block: Block; selected: boolean; dragging: boolean
  dropIndicator: 'before' | 'after' | null
  onClick: (e: React.MouseEvent) => void
  onDragStart: () => void; onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDelete: () => void
}) {
  const ICONS: Record<BlockType, string> = {
    text: 'T', heading: 'H', button: '⊡', divider: '—', spacer: '↕', image: '⬜',
  }
  const NAMES: Record<BlockType, string> = {
    text: 'Texte', heading: `Titre H${block.level}`, button: 'Bouton',
    divider: 'Séparateur', spacer: 'Espace', image: 'Image',
  }

  return (
    <div className="relative">
      {/* Drop indicator — before */}
      {dropIndicator === 'before' && (
        <div className="absolute -top-px left-2 right-2 h-0.5 bg-violet-500 rounded-full z-10 pointer-events-none" />
      )}

      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={onClick}
        className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
          selected ? 'bg-violet-950/30 border border-violet-500/40' : 'border border-transparent hover:bg-[#0f0f20] hover:border-[#1e1e3f]'
        } ${dragging ? 'opacity-30' : ''}`}
      >
        <div className="shrink-0 cursor-grab active:cursor-grabbing text-[#2a2a4a] hover:text-[#3b3b6f]">
          <svg width="8" height="12" fill="currentColor" viewBox="0 0 8 12">
            <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
            <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
            <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
          </svg>
        </div>
        <div className="w-5 h-5 rounded bg-[#1e1e3f] flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-[#94a3b8]">{ICONS[block.type]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#94a3b8] truncate">{NAMES[block.type]}</p>
          {block.type !== 'divider' && block.type !== 'spacer' && block.type !== 'image' && (
            <p className="text-[10px] text-[#3b3b6f] truncate">{block.content}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="shrink-0 p-1 rounded text-[#2a2a4a] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Drop indicator — after */}
      {dropIndicator === 'after' && (
        <div className="absolute -bottom-px left-2 right-2 h-0.5 bg-violet-500 rounded-full z-10 pointer-events-none" />
      )}
    </div>
  )
}

// ── Block properties editor ────────────────────────────────────────────────────

function BlockEditor({ block, onChange }: { block: Block; onChange: (u: Partial<Block>) => void }) {
  const inp = "w-full px-2.5 py-2 rounded-lg bg-[#07070f] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
  const lbl = "block text-[11px] text-[#475569] mb-1 uppercase tracking-wide font-medium"

  const NAMES: Record<BlockType, string> = {
    text: 'Bloc texte', heading: 'Titre', button: 'Bouton', divider: 'Séparateur', spacer: 'Espace', image: 'Image',
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">{NAMES[block.type]}</p>

      {/* Content */}
      {(block.type === 'text' || block.type === 'heading' || block.type === 'button') && (
        <div>
          <label className={lbl}>Contenu</label>
          {block.type === 'text' ? (
            <textarea value={block.content} onChange={e => onChange({ content: e.target.value })}
              rows={4} className={`${inp} resize-none text-sm`} />
          ) : (
            <input value={block.content} onChange={e => onChange({ content: e.target.value })} className={inp} />
          )}
        </div>
      )}

      {/* Heading level */}
      {block.type === 'heading' && (
        <div>
          <label className={lbl}>Niveau</label>
          <div className="flex gap-1.5">
            {([1, 2, 3] as const).map(l => (
              <button key={l} onClick={() => onChange({ level: l })}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-semibold transition-all ${block.level === l ? 'border-violet-500/50 bg-violet-950/30 text-violet-300' : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'}`}>
                H{l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alignment */}
      {(block.type === 'text' || block.type === 'heading' || block.type === 'button' || block.type === 'image') && (
        <div>
          <label className={lbl}>Alignement</label>
          <div className="flex gap-1.5">
            {([['left', '←'], ['center', '↔'], ['right', '→']] as const).map(([a, sym]) => (
              <button key={a} onClick={() => onChange({ align: a as Align })}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${block.align === a ? 'border-violet-500/50 bg-violet-950/30 text-violet-300' : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'}`}>
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Font size for text */}
      {(block.type === 'text' || block.type === 'heading') && (
        <div>
          <label className={lbl}>Taille — {block.fontSize}px</label>
          <input type="range" min={11} max={36} step={1} value={block.fontSize}
            onChange={e => onChange({ fontSize: parseInt(e.target.value) })}
            className="w-full accent-violet-500" />
        </div>
      )}

      {/* Button */}
      {block.type === 'button' && (
        <>
          <div>
            <label className={lbl}>URL</label>
            <input value={block.url} onChange={e => onChange({ url: e.target.value })} placeholder="https://…" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Fond</label>
              <div className="flex items-center gap-2">
                <input type="color" value={block.bgColor} onChange={e => onChange({ bgColor: e.target.value })}
                  className="w-7 h-7 rounded-md cursor-pointer border-0 bg-transparent p-0" />
                <input value={block.bgColor} onChange={e => onChange({ bgColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-[#07070f] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>
            <div>
              <label className={lbl}>Texte</label>
              <div className="flex items-center gap-2">
                <input type="color" value={block.textColor} onChange={e => onChange({ textColor: e.target.value })}
                  className="w-7 h-7 rounded-md cursor-pointer border-0 bg-transparent p-0" />
                <input value={block.textColor} onChange={e => onChange({ textColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-[#07070f] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Spacer */}
      {block.type === 'spacer' && (
        <div>
          <label className={lbl}>Hauteur — {block.height}px</label>
          <input type="range" min={8} max={100} step={4} value={block.height}
            onChange={e => onChange({ height: parseInt(e.target.value) })}
            className="w-full accent-violet-500" />
        </div>
      )}

      {/* Image */}
      {block.type === 'image' && (
        <>
          <div>
            <label className={lbl}>URL de l&apos;image</label>
            <input value={block.src} onChange={e => onChange({ src: e.target.value })} placeholder="https://…" className={inp} />
          </div>
          <div>
            <label className={lbl}>Texte alternatif</label>
            <input value={block.alt} onChange={e => onChange({ alt: e.target.value })} placeholder="Description…" className={inp} />
          </div>
          {block.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.src} alt={block.alt} className="max-w-full h-auto rounded-xl border border-[#1e1e3f] max-h-28 object-contain" />
          )}
        </>
      )}
    </div>
  )
}

// ── Live email preview ─────────────────────────────────────────────────────────

function EmailPreview({ html, selectedId, blocks, onSelectBlock }: {
  html: string
  selectedId: string | null
  blocks: Block[]
  onSelectBlock: (id: string) => void
}) {
  return (
    <div className="h-full overflow-y-auto bg-[#f3f4f6] p-4">
      <div className="mx-auto max-w-[640px]">
        {/* Email shell */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {blocks.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} className="mx-auto mb-3 text-gray-300"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              Ajoutez des blocs pour voir l&apos;aperçu de votre email
            </div>
          ) : (
            <div className="px-10 py-8 space-y-0">
              {blocks.map(block => (
                <div
                  key={block.id}
                  onClick={() => onSelectBlock(block.id)}
                  className={`relative cursor-pointer rounded transition-all group ${selectedId === block.id ? 'outline outline-2 outline-violet-500 outline-offset-1' : 'hover:outline hover:outline-1 hover:outline-violet-300 hover:outline-offset-1'}`}
                >
                  {/* Edit badge on hover/select */}
                  <div className={`absolute -top-2.5 right-1 z-10 transition-opacity ${selectedId === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-600 text-white">
                      {block.type === 'text' ? 'Texte' : block.type === 'heading' ? `H${block.level}` : block.type === 'button' ? 'Bouton' : block.type === 'divider' ? 'Séparateur' : block.type === 'spacer' ? 'Espace' : 'Image'}
                    </span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: renderBlock(block) || '<div style="height:16px;background:#f9fafb;border-radius:4px;"></div>' }} />
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-3">Aperçu · Variables remplacées par des valeurs d&apos;exemple</p>
      </div>
    </div>
  )
}

// ── Main EmailDesigner ─────────────────────────────────────────────────────────

interface EmailDesignerProps {
  value?: string
  onChange: (html: string) => void
  disabled?: boolean
}

export default function EmailDesigner({ value = '', onChange, disabled }: EmailDesignerProps) {
  const [mode, setMode] = useState<EditorMode>(value ? 'html' : 'blocks')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [htmlValue, setHtmlValue] = useState(value)
  const [textValue, setTextValue] = useState('')
  const [showTemplates, setShowTemplates] = useState(!value)

  // DnD
  const [dragSrc, setDragSrc] = useState<{ kind: 'palette'; blockType: BlockType } | { kind: 'reorder'; fromIndex: number } | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)

  // ── Block helpers ────────────────────────────────────────────────────────────

  function updateBlocks(updater: (prev: Block[]) => Block[]) {
    setBlocks(prev => {
      const next = updater(prev)
      onChange(blocksToHtml(next))
      return next
    })
  }

  function addBlock(type: BlockType, atIndex?: number) {
    const block = makeBlock(type)
    updateBlocks(prev => {
      const next = [...prev]
      next.splice(atIndex ?? next.length, 0, block)
      return next
    })
    setSelectedId(block.id)
  }

  function updateBlock(id: string, u: Partial<Block>) {
    updateBlocks(prev => prev.map(b => b.id === id ? { ...b, ...u } : b))
  }

  function deleteBlock(id: string) {
    updateBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function moveBlock(from: number, to: number) {
    updateBlocks(prev => {
      const next = [...prev]
      const [b] = next.splice(from, 1)
      next.splice(to, 0, b!)
      return next
    })
  }

  // ── Mode switch ──────────────────────────────────────────────────────────────

  function switchMode(next: EditorMode) {
    if (next === mode) return
    if (mode === 'blocks') {
      const html = blocksToHtml(blocks)
      if (next === 'html') { setHtmlValue(html); onChange(html) }
      if (next === 'text') { const t = blocksToText(blocks); setTextValue(t); onChange(textToHtml(t)) }
    }
    if (mode === 'text' && next === 'html') { const h = textToHtml(textValue); setHtmlValue(h); onChange(h) }
    setMode(next)
    setSelectedId(null)
  }

  // ── DnD ─────────────────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    setDragOver({ index, position })
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragSrc) return

    const rect = e.currentTarget.getBoundingClientRect()
    const isTopHalf = e.clientY < rect.top + rect.height / 2
    const insertAt = isTopHalf ? index : index + 1

    if (dragSrc.kind === 'palette') {
      addBlock(dragSrc.blockType, insertAt)
    } else {
      // Reorder: after removing the dragged item, recalculate insert position
      const from = dragSrc.fromIndex
      const to = insertAt > from ? insertAt - 1 : insertAt
      if (to !== from) moveBlock(from, to)
    }
    setDragSrc(null)
    setDragOver(null)
  }

  function onDragEnd() { setDragSrc(null); setDragOver(null) }

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null
  const liveHtml = mode === 'blocks' ? blocksToHtml(blocks) : mode === 'html' ? htmlValue : textToHtml(textValue)

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {showTemplates && (
        <TemplateGallery
          onSelect={tpl => {
            const fresh = tpl.blocks.map(b => ({ ...b, id: uid() }))
            setBlocks(fresh)
            onChange(blocksToHtml(fresh))
            setSelectedId(null)
            setShowTemplates(false)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      <div className="rounded-2xl border border-[#1e1e3f] overflow-hidden flex flex-col" style={{ height: 580 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a18] border-b border-[#1e1e3f] shrink-0">
          <div className="flex gap-1">
            {([['blocks', 'Blocs'], ['html', 'HTML'], ['text', 'Texte brut']] as const).map(([m, lbl]) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${mode === m ? 'bg-violet-600 text-white' : 'text-[#475569] hover:text-[#94a3b8]'}`}>
                {lbl}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {mode === 'blocks' && (
              <button onClick={() => setShowTemplates(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-violet-500/40 hover:text-violet-300 transition-all">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 5h16M4 12h16M4 19h16"/></svg>
                Templates
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">

          {/* ── Blocks mode ── */}
          {mode === 'blocks' && (
            <>
              {/* Left: block list + properties */}
              <div className="w-56 shrink-0 border-r border-[#1e1e3f] flex flex-col bg-[#080812]">
                {/* Block list */}
                <div className="flex-1 overflow-y-auto p-2 min-h-0">
                  {blocks.length === 0 ? (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver({ index: 0, position: 'before' }) }}
                      onDrop={e => { e.preventDefault(); if (dragSrc?.kind === 'palette') addBlock(dragSrc.blockType, 0); setDragSrc(null); setDragOver(null) }}
                      className={`flex flex-col items-center justify-center h-full py-8 rounded-xl border-2 border-dashed transition-all text-center ${dragSrc?.kind === 'palette' ? 'border-violet-500/60 bg-violet-950/10' : 'border-[#1e1e3f]'}`}>
                      <p className="text-xs text-[#3b3b6f] px-4">Glissez un bloc ou cliquez ci-dessous</p>
                    </div>
                  ) : (
                    <div
                      className="space-y-0.5"
                      onDragLeave={() => setDragOver(null)}
                    >
                      {blocks.map((block, idx) => {
                        const isOver = dragOver?.index === idx
                        const isDraggingThis = dragSrc?.kind === 'reorder' && dragSrc.fromIndex === idx
                        return (
                          <BlockRow
                            key={block.id}
                            block={block}
                            selected={selectedId === block.id}
                            dragging={isDraggingThis}
                            dropIndicator={isOver && !isDraggingThis ? dragOver!.position : null}
                            onClick={e => { e.stopPropagation(); setSelectedId(block.id) }}
                            onDragStart={() => setDragSrc({ kind: 'reorder', fromIndex: idx })}
                            onDragEnd={onDragEnd}
                            onDragOver={e => handleDragOver(e, idx)}
                            onDrop={e => handleDrop(e, idx)}
                            onDelete={() => deleteBlock(block.id)}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Palette bar */}
                <div className="shrink-0 border-t border-[#1e1e3f] p-2">
                  <p className="text-[10px] text-[#3b3b6f] mb-1.5 px-1 uppercase tracking-wide">Ajouter</p>
                  <div className="grid grid-cols-3 gap-1">
                    {PALETTE.map(({ type, label, icon }) => (
                      <button
                        key={type}
                        draggable
                        onDragStart={() => setDragSrc({ kind: 'palette', blockType: type })}
                        onDragEnd={onDragEnd}
                        onClick={() => addBlock(type)}
                        disabled={disabled}
                        className="flex flex-col items-center gap-1 py-2 rounded-lg border border-[#1e1e3f] text-[#475569] hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-950/10 transition-all cursor-grab active:cursor-grabbing select-none disabled:opacity-40">
                        <span className="text-sm leading-none">{icon}</span>
                        <span className="text-[9px] leading-none">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Block properties */}
                {selectedBlock && (
                  <div className="shrink-0 border-t border-[#1e1e3f] p-3 overflow-y-auto max-h-64 bg-[#07070f]">
                    <BlockEditor block={selectedBlock} onChange={u => updateBlock(selectedBlock.id, u)} />
                  </div>
                )}
              </div>

              {/* Right: live preview */}
              <div className="flex-1 min-w-0">
                <EmailPreview
                  html={liveHtml}
                  selectedId={selectedId}
                  blocks={blocks}
                  onSelectBlock={id => setSelectedId(id)}
                />
              </div>
            </>
          )}

          {/* ── HTML mode ── */}
          {mode === 'html' && (
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 p-4 bg-[#07070f]">
                <textarea
                  value={htmlValue}
                  onChange={e => { setHtmlValue(e.target.value); onChange(e.target.value) }}
                  disabled={disabled}
                  placeholder="<p>Bonjour {{first_name}},</p>&#10;<p>...</p>"
                  className="w-full h-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
              </div>
              <div className="w-80 shrink-0 border-l border-[#1e1e3f] bg-[#f3f4f6] overflow-y-auto">
                <div className="p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 font-medium">Aperçu</p>
                  <div className="bg-white rounded-lg shadow-sm px-5 py-5 text-sm" dangerouslySetInnerHTML={{
                    __html: htmlValue.replace(/\{\{first_name\}\}/g, 'Marie').replace(/\{\{last_name\}\}/g, 'Dupont').replace(/\{\{company\}\}/g, 'Acme')
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Text mode ── */}
          {mode === 'text' && (
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 p-4 bg-[#07070f]">
                <textarea
                  value={textValue}
                  onChange={e => { setTextValue(e.target.value); onChange(textToHtml(e.target.value)) }}
                  disabled={disabled}
                  placeholder={"Bonjour {{first_name}},\n\nJe me permets de vous contacter…\n\nCordialement,"}
                  className="w-full h-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
                <p className="mt-2 text-xs text-[#475569]">Double saut de ligne = nouveau paragraphe · Variables : <code className="text-violet-400">{'{{first_name}}'}</code> <code className="text-violet-400">{'{{company}}'}</code></p>
              </div>
              <div className="w-80 shrink-0 border-l border-[#1e1e3f] bg-[#f3f4f6] overflow-y-auto">
                <div className="p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 font-medium">Aperçu</p>
                  <div className="bg-white rounded-lg shadow-sm px-5 py-5 text-sm" dangerouslySetInnerHTML={{
                    __html: textToHtml(textValue).replace(/\{\{first_name\}\}/g, 'Marie').replace(/\{\{company\}\}/g, 'Acme')
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

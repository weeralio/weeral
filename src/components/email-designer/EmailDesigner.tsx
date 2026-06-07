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
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 11) }

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Block factory ──────────────────────────────────────────────────────────────

function makeBlock(type: BlockType, overrides: Partial<Block> = {}): Block {
  const base: Block = {
    id: uid(), type, content: '', align: 'left',
    level: 2, url: '', src: '', alt: '', height: 24,
    bgColor: '#7c3aed', textColor: '#ffffff',
  }
  const defaults: Partial<Block> = ({
    text:    { content: 'Votre texte ici…' },
    heading: { content: 'Titre' },
    button:  { content: 'Cliquez ici', align: 'center' as Align, url: 'https://' },
    divider: {},
    spacer:  { height: 24 },
    image:   { align: 'center' as Align },
  } as Record<BlockType, Partial<Block>>)[type] ?? {}
  return { ...base, ...defaults, ...overrides, id: uid() }
}

// ── HTML renderer ──────────────────────────────────────────────────────────────

function renderBlock(b: Block): string {
  const ta = `text-align:${b.align};`
  switch (b.type) {
    case 'text':
      return `<p style="margin:0 0 14px;${ta}font-size:15px;line-height:1.6;color:#1a1a1a;">${esc(b.content).replace(/\n/g, '<br>')}</p>`
    case 'heading': {
      const fs = b.level === 1 ? '28px' : b.level === 2 ? '22px' : '18px'
      const fw = b.level === 3 ? '600' : '700'
      return `<h${b.level} style="margin:0 0 14px;${ta}font-size:${fs};font-weight:${fw};color:#111111;">${esc(b.content)}</h${b.level}>`
    }
    case 'button':
      return `<div style="margin:20px 0;${ta}"><a href="${b.url}" style="display:inline-block;padding:12px 28px;background:${b.bgColor};color:${b.textColor};text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${esc(b.content)}</a></div>`
    case 'divider':
      return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">`
    case 'spacer':
      return `<div style="height:${b.height}px;"></div>`
    case 'image':
      return b.src
        ? `<div style="margin:16px 0;${ta}"><img src="${b.src}" alt="${esc(b.alt)}" style="max-width:100%;height:auto;border-radius:4px;"></div>`
        : ''
    default:
      return ''
  }
}

function blocksToHtml(blocks: Block[]): string {
  const body = blocks.map(renderBlock).filter(Boolean).join('\n')
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;">\n${body}\n</div>`
}

function textToHtml(text: string): string {
  return text.split('\n\n').map(p => p.trim()).filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1a1a1a;">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

function blocksToText(blocks: Block[]): string {
  return blocks
    .filter(b => b.type === 'text' || b.type === 'heading')
    .map(b => b.content)
    .join('\n\n')
}

// ── Templates ──────────────────────────────────────────────────────────────────

interface Template { id: string; name: string; blocks: Block[] }

const TEMPLATES: Template[] = [
  {
    id: 'cold',
    name: 'Email froid',
    blocks: [
      makeBlock('text', { content: 'Bonjour {{first_name}},' }),
      makeBlock('text', { content: "Je me permets de vous contacter concernant…" }),
      makeBlock('text', { content: "Seriez-vous disponible pour un échange de 15 minutes cette semaine ?" }),
      makeBlock('text', { content: 'Cordialement,' }),
    ],
  },
  {
    id: 'cta',
    name: 'Email avec CTA',
    blocks: [
      makeBlock('heading', { content: 'Une question rapide, {{first_name}} ?', level: 2 }),
      makeBlock('text', { content: "Nous aidons des entreprises comme {{company}} à améliorer leurs résultats." }),
      makeBlock('text', { content: "Cela vous intéresse ?" }),
      makeBlock('button', { content: 'Voir la démo', url: 'https://' }),
      makeBlock('divider'),
      makeBlock('text', { content: 'Cordialement,' }),
    ],
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    blocks: [
      makeBlock('heading', { content: 'Actualités du mois', level: 1, align: 'center' }),
      makeBlock('divider'),
      makeBlock('heading', { content: 'Nouveauté #1', level: 2 }),
      makeBlock('text', { content: 'Description de la nouveauté. Expliquez en 2-3 phrases.' }),
      makeBlock('button', { content: 'En savoir plus', url: 'https://' }),
      makeBlock('spacer', { height: 32 }),
      makeBlock('heading', { content: 'Nouveauté #2', level: 2 }),
      makeBlock('text', { content: 'Description de la nouveauté.' }),
      makeBlock('divider'),
      makeBlock('text', { content: 'À très bientôt,', align: 'center' }),
    ],
  },
]

// ── Palette config ─────────────────────────────────────────────────────────────

const PALETTE: { type: BlockType; label: string; icon: string }[] = [
  { type: 'text',    label: 'Texte',      icon: '¶' },
  { type: 'heading', label: 'Titre',      icon: 'H' },
  { type: 'button',  label: 'Bouton',     icon: '⊡' },
  { type: 'divider', label: 'Séparateur', icon: '—' },
  { type: 'spacer',  label: 'Espace',     icon: '↕' },
  { type: 'image',   label: 'Image',      icon: '⬜' },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function DropZone({ active, onDragOver, onDrop }: {
  active: boolean
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`h-1.5 rounded-full my-0.5 transition-all ${active ? 'bg-violet-500 h-3' : 'hover:bg-[#1e1e3f]'}`}
    />
  )
}

function BlockRow({ block, selected, dragging, onClick, onDragStart, onDragEnd, onMoveUp, onMoveDown, onDelete }: {
  block: Block; selected: boolean; dragging: boolean
  onClick: (e: React.MouseEvent) => void
  onDragStart: () => void; onDragEnd: () => void
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all ${
        selected ? 'border-violet-500/50 bg-violet-950/10' : 'border-transparent hover:border-[#1e1e3f] hover:bg-[#0a0a18]'
      } ${dragging ? 'opacity-30' : ''}`}
    >
      {/* Drag handle */}
      <div className="shrink-0 cursor-grab active:cursor-grabbing text-[#2a2a4a] hover:text-[#475569] transition-colors">
        <svg width="10" height="14" fill="currentColor" viewBox="0 0 10 14">
          <circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/>
          <circle cx="3" cy="7" r="1.3"/><circle cx="7" cy="7" r="1.3"/>
          <circle cx="3" cy="11" r="1.3"/><circle cx="7" cy="11" r="1.3"/>
        </svg>
      </div>

      {/* Preview */}
      <div className="flex-1 min-w-0 py-0.5">
        <BlockPreview block={block} />
      </div>

      {/* Actions */}
      <div className={`shrink-0 flex items-center gap-0.5 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button onClick={e => { e.stopPropagation(); onMoveUp() }}
          className="p-1 rounded text-[#3b3b6f] hover:text-white hover:bg-[#1e1e3f] transition-colors">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 15l7-7 7 7"/></svg>
        </button>
        <button onClick={e => { e.stopPropagation(); onMoveDown() }}
          className="p-1 rounded text-[#3b3b6f] hover:text-white hover:bg-[#1e1e3f] transition-colors">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded text-[#3b3b6f] hover:text-red-400 hover:bg-red-950/20 transition-colors">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  )
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm text-[#94a3b8] truncate">{block.content || <em className="text-[#3b3b6f]">Vide</em>}</p>
    case 'heading':
      return <p className="text-sm font-semibold text-white truncate">H{block.level} — {block.content}</p>
    case 'button':
      return (
        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md" style={{ background: block.bgColor, color: block.textColor }}>
          {block.content}
        </span>
      )
    case 'divider':
      return <div className="border-t border-[#3b3b6f] w-full" />
    case 'spacer':
      return <p className="text-xs text-[#3b3b6f]">Espace — {block.height}px</p>
    case 'image':
      return <p className="text-xs text-[#475569] truncate">{block.src ? block.src : 'Image (URL non définie)'}</p>
  }
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (u: Partial<Block>) => void }) {
  const inp = "w-full px-3 py-2 rounded-xl bg-[#07070f] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
  const lbl = "block text-xs text-[#475569] mb-1.5"

  const BLOCK_NAMES: Record<BlockType, string> = {
    text: 'Texte', heading: 'Titre', button: 'Bouton', divider: 'Séparateur', spacer: 'Espace', image: 'Image',
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[#475569] uppercase tracking-wider">{BLOCK_NAMES[block.type]}</p>

      {/* Content */}
      {(block.type === 'text' || block.type === 'heading' || block.type === 'button') && (
        <div>
          <label className={lbl}>Contenu</label>
          {block.type === 'text' ? (
            <textarea value={block.content} onChange={e => onChange({ content: e.target.value })}
              rows={3} className={`${inp} resize-none`} />
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
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${block.level === l ? 'border-violet-500/50 bg-violet-950/20 text-violet-300' : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'}`}>
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
            {([
              ['left', 'Gauche'],
              ['center', 'Centre'],
              ['right', 'Droite'],
            ] as const).map(([a, lbl2]) => (
              <button key={a} onClick={() => onChange({ align: a as Align })}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${block.align === a ? 'border-violet-500/50 bg-violet-950/20 text-violet-300' : 'border-[#1e1e3f] text-[#475569] hover:border-[#3b3b6f]'}`}>
                {lbl2}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Button URL + colors */}
      {block.type === 'button' && (
        <>
          <div>
            <label className={lbl}>URL</label>
            <input value={block.url} onChange={e => onChange({ url: e.target.value })} placeholder="https://…" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Couleur du fond</label>
              <div className="flex items-center gap-2">
                <input type="color" value={block.bgColor} onChange={e => onChange({ bgColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0.5" />
                <input value={block.bgColor} onChange={e => onChange({ bgColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 rounded-xl bg-[#07070f] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>
            <div>
              <label className={lbl}>Couleur du texte</label>
              <div className="flex items-center gap-2">
                <input type="color" value={block.textColor} onChange={e => onChange({ textColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0.5" />
                <input value={block.textColor} onChange={e => onChange({ textColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 rounded-xl bg-[#07070f] border border-[#1e1e3f] text-white text-xs focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Spacer height */}
      {block.type === 'spacer' && (
        <div>
          <label className={lbl}>Hauteur — {block.height}px</label>
          <input type="range" min={8} max={80} step={4} value={block.height}
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
            <input value={block.alt} onChange={e => onChange({ alt: e.target.value })}
              placeholder="Description pour accessibilité" className={inp} />
          </div>
          {block.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.src} alt={block.alt} className="max-w-full h-auto rounded-xl border border-[#1e1e3f] max-h-32 object-contain" />
          )}
        </>
      )}
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
  const [showTemplates, setShowTemplates] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // DnD state
  const [dragSrc, setDragSrc] = useState<{ kind: 'palette'; blockType: BlockType } | { kind: 'reorder'; fromIndex: number } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // ── Blocks helpers ───────────────────────────────────────────────────────────

  function updateBlocks(updater: (prev: Block[]) => Block[]) {
    setBlocks(prev => {
      const next = updater(prev)
      if (mode === 'blocks') onChange(blocksToHtml(next))
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

  function updateBlock(id: string, updates: Partial<Block>) {
    updateBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
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
    // Sync HTML from blocks when leaving blocks mode
    if (mode === 'blocks') {
      const html = blocksToHtml(blocks)
      if (next === 'html') { setHtmlValue(html); onChange(html) }
      if (next === 'text') { setTextValue(blocksToText(blocks)); onChange(textToHtml(blocksToText(blocks))) }
    }
    if (mode === 'text' && next === 'html') {
      const html = textToHtml(textValue)
      setHtmlValue(html); onChange(html)
    }
    setMode(next)
    setSelectedId(null)
  }

  // ── Templates ────────────────────────────────────────────────────────────────

  function applyTemplate(tpl: Template) {
    const fresh = tpl.blocks.map(b => ({ ...b, id: uid() }))
    setBlocks(fresh)
    onChange(blocksToHtml(fresh))
    setShowTemplates(false)
    setSelectedId(null)
  }

  // ── DnD ─────────────────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function onDrop(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (!dragSrc) return
    if (dragSrc.kind === 'palette') {
      addBlock(dragSrc.blockType, index)
    } else {
      const to = dragSrc.fromIndex < index ? index - 1 : index
      if (to !== dragSrc.fromIndex) moveBlock(dragSrc.fromIndex, to)
    }
    setDragSrc(null)
    setDragOverIndex(null)
  }

  function onDragEnd() {
    setDragSrc(null)
    setDragOverIndex(null)
  }

  // ── Preview HTML ─────────────────────────────────────────────────────────────

  const previewHtml = mode === 'blocks'
    ? blocksToHtml(blocks)
    : mode === 'html' ? htmlValue
    : textToHtml(textValue)

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-[#1e1e3f] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a18] border-b border-[#1e1e3f]">
        {/* Mode tabs */}
        <div className="flex gap-1">
          {([['blocks', 'Blocs'], ['html', 'HTML'], ['text', 'Texte brut']] as const).map(([m, lbl]) => (
            <button key={m} onClick={() => switchMode(m)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${mode === m ? 'bg-violet-600 text-white' : 'text-[#475569] hover:text-[#94a3b8]'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(p => !p)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showPreview ? 'border-violet-500/40 text-violet-300 bg-violet-950/20' : 'border-[#1e1e3f] text-[#475569] hover:text-[#94a3b8]'}`}>
            {showPreview ? 'Masquer' : 'Aperçu'}
          </button>
          {mode === 'blocks' && (
            <div className="relative">
              <button onClick={() => setShowTemplates(p => !p)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#1e1e3f] text-[#475569] hover:text-[#94a3b8] transition-all">
                Templates ▾
              </button>
              {showTemplates && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d0d1c] border border-[#1e1e3f] rounded-xl shadow-2xl overflow-hidden min-w-[170px]">
                  {TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#94a3b8] hover:bg-[#111128] hover:text-white transition-colors">
                      {tpl.name}
                    </button>
                  ))}
                  <div className="border-t border-[#1e1e3f]" />
                  <button onClick={() => { setBlocks([]); setSelectedId(null); onChange(''); setShowTemplates(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#475569] hover:bg-[#111128] hover:text-[#94a3b8] transition-colors">
                    Vider le canvas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editor body */}
      <div className="bg-[#07070f]" onClick={() => setShowTemplates(false)}>

        {/* ── Blocks mode ── */}
        {mode === 'blocks' && (
          <div>
            {/* Canvas */}
            <div className="p-3 min-h-[180px]" onClick={() => setSelectedId(null)}>
              {blocks.length === 0 && (
                <div
                  onDragOver={e => onDragOver(e, 0)}
                  onDrop={e => onDrop(e, 0)}
                  className={`flex items-center justify-center py-10 rounded-xl border-2 border-dashed transition-all ${dragSrc?.kind === 'palette' ? 'border-violet-500/60 bg-violet-950/10' : 'border-[#1e1e3f]'}`}>
                  <p className="text-sm text-[#3b3b6f]">Glissez un bloc ici ou choisissez un template</p>
                </div>
              )}

              {blocks.map((block, idx) => (
                <div key={block.id}>
                  <DropZone
                    active={dragOverIndex === idx && (dragSrc?.kind === 'palette' || (dragSrc?.kind === 'reorder' && dragSrc.fromIndex !== idx))}
                    onDragOver={e => onDragOver(e, idx)}
                    onDrop={e => onDrop(e, idx)}
                  />
                  <BlockRow
                    block={block}
                    selected={selectedId === block.id}
                    dragging={dragSrc?.kind === 'reorder' && dragSrc.fromIndex === idx}
                    onClick={e => { e.stopPropagation(); setSelectedId(block.id) }}
                    onDragStart={() => setDragSrc({ kind: 'reorder', fromIndex: idx })}
                    onDragEnd={onDragEnd}
                    onMoveUp={() => idx > 0 && moveBlock(idx, idx - 1)}
                    onMoveDown={() => idx < blocks.length - 1 && moveBlock(idx, idx + 1)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                </div>
              ))}

              {blocks.length > 0 && (
                <DropZone
                  active={dragOverIndex === blocks.length}
                  onDragOver={e => onDragOver(e, blocks.length)}
                  onDrop={e => onDrop(e, blocks.length)}
                />
              )}
            </div>

            {/* Palette */}
            <div className="px-3 pb-3 pt-2 border-t border-[#1e1e3f] flex flex-wrap gap-1.5">
              <span className="text-[11px] text-[#3b3b6f] self-center mr-0.5 shrink-0">+ Ajouter :</span>
              {PALETTE.map(({ type, label, icon }) => (
                <button
                  key={type}
                  draggable
                  onDragStart={() => setDragSrc({ kind: 'palette', blockType: type })}
                  onDragEnd={onDragEnd}
                  onClick={() => addBlock(type)}
                  disabled={disabled}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-[#1e1e3f] text-[#94a3b8] hover:border-violet-500/40 hover:text-violet-300 transition-all cursor-grab active:cursor-grabbing select-none disabled:opacity-40">
                  <span className="font-mono text-[10px] text-[#475569]">{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Block properties */}
            {selectedBlock && (
              <div className="border-t border-[#1e1e3f] p-4 bg-[#0a0a18]" onClick={e => e.stopPropagation()}>
                <BlockEditor block={selectedBlock} onChange={u => updateBlock(selectedBlock.id, u)} />
              </div>
            )}
          </div>
        )}

        {/* ── HTML mode ── */}
        {mode === 'html' && (
          <div className="p-4">
            <textarea
              value={htmlValue}
              onChange={e => { setHtmlValue(e.target.value); onChange(e.target.value) }}
              rows={12}
              placeholder="<p>Bonjour {{first_name}},</p>&#10;<p>...</p>"
              disabled={disabled}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors resize-y"
            />
            <p className="mt-1.5 text-xs text-[#475569]">
              Variables : <code className="text-violet-400">{'{{first_name}}'}</code>{' '}
              <code className="text-violet-400">{'{{last_name}}'}</code>{' '}
              <code className="text-violet-400">{'{{company}}'}</code>
            </p>
          </div>
        )}

        {/* ── Text mode ── */}
        {mode === 'text' && (
          <div className="p-4">
            <textarea
              value={textValue}
              onChange={e => { setTextValue(e.target.value); onChange(textToHtml(e.target.value)) }}
              rows={10}
              placeholder={"Bonjour {{first_name}},\n\nJe me permets de vous contacter…\n\nCordialement,"}
              disabled={disabled}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a18] border border-[#1e1e3f] text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors resize-y"
            />
            <p className="mt-1.5 text-xs text-[#475569]">
              Double saut de ligne = nouveau paragraphe ·{' '}
              Variables : <code className="text-violet-400">{'{{first_name}}'}</code>{' '}
              <code className="text-violet-400">{'{{last_name}}'}</code>
            </p>
          </div>
        )}

        {/* ── Preview ── */}
        {showPreview && (
          <div className="border-t border-[#1e1e3f] p-4">
            <p className="text-[11px] text-[#475569] uppercase tracking-wider mb-3 font-medium">Aperçu</p>
            <div className="rounded-xl bg-white p-6 overflow-auto max-h-96">
              <div
                dangerouslySetInnerHTML={{
                  __html: previewHtml
                    .replace(/\{\{first_name\}\}/g, 'Marie')
                    .replace(/\{\{last_name\}\}/g, 'Dupont')
                    .replace(/\{\{company\}\}/g, 'Acme Corp'),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

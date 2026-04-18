import { useEffect, useState, useRef, useCallback } from 'react';
import { getMapaPuestos } from '../../api';
import { ChevronLeft, RefreshCw, Plus, Minus, X } from 'lucide-react';
import { formatWait } from '../../utils/formatTime';

interface PuestoMapa {
  id: number;
  nombre: string;
  tipo: 'barra' | 'foodtruck';
  abierto: boolean;
  pos_x: number | null;
  pos_y: number | null;
  pedidos_activos: number;
  espera_min: number;
  ingresos_hoy: number;
}

interface Props {
  festivalId: number;
  festivalNombre: string;
  navigate: (view: string) => void;
}

/* ── Isometric projection ─────────────────────────────────────────────── */
const TW = 48;
const TH = 24;
const OX = 170;
const OY = 30;

function iso(col: number, row: number) {
  return {
    x: OX + (col - row) * (TW / 2),
    y: OY + (col + row) * (TH / 2),
  };
}

/* Draw a box: returns top/left/right face polygon points + center */
function box(col: number, row: number, w: number, d: number, h: number) {
  const tl = iso(col,     row);
  const tr = iso(col + w, row);
  const bl = iso(col,     row + d);
  const br = iso(col + w, row + d);
  const hpx = h * TH;

  const top   = `${tl.x + TW/2 * (w > 1 ? w : 1)},${tl.y - hpx} ` +
                // simplified: use corner points lifted by h
                `${tl.x},${tl.y - hpx} ${bl.x},${bl.y - hpx} ` +
                `${br.x},${br.y - hpx} ${tr.x},${tr.y - hpx}`;

  // For single-tile boxes use simple diamond approach
  const { x, y } = iso(col, row);
  const tw = TW * w;
  const td = TH * d;
  const topPts  = `${x + tw/2},${y - hpx} ${x + tw},${y + td/2 - hpx} ${x + tw/2},${y + td - hpx} ${x},${y + td/2 - hpx}`;
  const leftPts = `${x},${y + td/2 - hpx} ${x + tw/2},${y + td - hpx} ${x + tw/2},${y + td} ${x},${y + td/2}`;
  const rightPts= `${x + tw/2},${y + td - hpx} ${x + tw},${y + td/2 - hpx} ${x + tw},${y + td/2} ${x + tw/2},${y + td}`;
  const cx = x + tw / 2;
  const cy = y + td / 2 - hpx;

  return { topPts, leftPts, rightPts, cx, cy };
}

/* ── Status helpers ───────────────────────────────────────────────────── */
const PAL = {
  free:     { t: '#4FC78E', l: '#2A9E6A', r: '#38B47E' },
  moderate: { t: '#FFAB00', l: '#C88200', r: '#E69600' },
  busy:     { t: '#E8534A', l: '#B43230', r: '#D2403C' },
  closed:   { t: '#A0ADB8', l: '#6E7E8C', r: '#899AA8' },
};
function getStatus(p: PuestoMapa): keyof typeof PAL {
  if (!p.abierto) return 'closed';
  if (p.pedidos_activos === 0) return 'free';
  if (p.pedidos_activos <= 3) return 'moderate';
  return 'busy';
}
function statusLabel(s: keyof typeof PAL) {
  return s === 'free' ? 'Libre' : s === 'moderate' ? 'Moderado' : s === 'busy' ? 'Saturado' : 'Cerrado';
}
function standH(p: PuestoMapa, maxO: number) {
  if (!p.abierto || p.pedidos_activos === 0) return 0.35;
  return 0.5 + (p.pedidos_activos / maxO) * 1.2;
}

/* Grid: 2 rows of 5, corridor between */
const GRID: [number, number][] = [
  [0,0],[2,0],[4,0],[6,0],[8,0],
  [0,2],[2,2],[4,2],[6,2],[8,2],
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ── Palm tree SVG helper ─────────────────────────────────────────────── */
function palmTree(cx: number, cy: number, s = 1) {
  const angles = [0, 55, 110, 165, 220, 275, 330];
  const leaves = angles.map(a => `
    <ellipse cx="${cx}" cy="${cy - 36 * s}" rx="${18 * s}" ry="${5 * s}"
      fill="#2D8B4E" opacity="0.88"
      transform="rotate(${a} ${cx} ${cy - 36 * s})"/>`
  ).join('');
  return `
    <g class="palm">
      <rect x="${cx - 2.5 * s}" y="${cy - 36 * s}" width="${5 * s}" height="${36 * s}"
        fill="#8B6914" rx="2" transform="rotate(-4 ${cx} ${cy})"/>
      ${leaves}
      <circle cx="${cx + 3 * s}" cy="${cy - 34 * s}" r="${3.5 * s}" fill="#6B4226"/>
      <circle cx="${cx - 2 * s}" cy="${cy - 36 * s}" r="${2.5 * s}" fill="#5A3820"/>
    </g>`;
}

export function MapView({ festivalId, navigate }: Props) {
  const [puestos, setPuestos]   = useState<PuestoMapa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<PuestoMapa | null>(null);
  const [tf, setTf]             = useState({ x: 0, y: 0, scale: 1 });
  const dragRef  = useRef({ active: false, sx: 0, sy: 0, tx: 0, ty: 0 });
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Wheel zoom */
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      setTf(t => ({ ...t, scale: clamp(t.scale * (e.deltaY < 0 ? 1.12 : 0.9), 0.35, 4) }));
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPuestos(await getMapaPuestos(festivalId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [festivalId]);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  /* Pan — mouse */
  const onMD = (e: React.MouseEvent) => { dragRef.current = { active:true, sx:e.clientX, sy:e.clientY, tx:tf.x, ty:tf.y }; };
  const onMM = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    setTf(t => ({ ...t, x: dragRef.current.tx+(e.clientX-dragRef.current.sx), y: dragRef.current.ty+(e.clientY-dragRef.current.sy) }));
  };
  const onMU = () => { dragRef.current.active = false; };
  /* Pan — touch */
  const onTS = (e: React.TouchEvent) => { if (e.touches.length===1) touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const onTM = (e: React.TouchEvent) => {
    if (e.touches.length===1 && touchRef.current) {
      const dx=e.touches[0].clientX-touchRef.current.x, dy=e.touches[0].clientY-touchRef.current.y;
      touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
      setTf(t=>({...t,x:t.x+dx,y:t.y+dy}));
    }
  };

  const maxOrders = Math.max(...puestos.map(p => p.pedidos_activos), 1);
  const mapped    = puestos.slice(0, 10).map((p, i) => ({ ...p, gc: GRID[i][0], gr: GRID[i][1] }));
  const sorted    = [...mapped].sort((a, b) => (a.gc + a.gr) - (b.gc + b.gr));

  /* ── Palm positions (screen coords) ─────────────────────────────────── */
  const palms: { x: number; y: number; s: number }[] = [
    { ...iso(-1.2, 0.5), s: 0.85 },
    { ...iso(-1.4, 3.5), s: 0.9  },
    { ...iso(1.5,  -1),  s: 0.8  },
    { ...iso(5,    -1.2),s: 0.88 },
    { ...iso(9.8,  1.5), s: 0.85 },
    { ...iso(10,   4.5), s: 0.9  },
    { ...iso(3.5,  5.2), s: 0.8  },
  ];

  /* ── Stage position ──────────────────────────────────────────────────── */
  const SC = 2.5, SR = -2.2;  // stage col/row — above the scene

  /* ── Entrance position ───────────────────────────────────────────────── */
  const entrPos = iso(4, 4.8);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
           style={{ backgroundColor: '#FFF3E4', borderBottom: '1px solid #E8D5C0' }}>
        <button onClick={() => navigate('main')} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
          <ChevronLeft className="w-5 h-5" style={{ color: '#A67C52' }} />
          <span className="text-xs font-semibold" style={{ color: '#A67C52' }}>Volver</span>
        </button>
        <h2 className="text-sm font-extrabold" style={{ color: '#A67C52' }}>Mapa del Festival</h2>
        <button onClick={load} style={{ color: '#A67C52' }} className="p-1.5 hover:opacity-70">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Map canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{
          cursor: dragRef.current.active ? 'grabbing' : 'grab',
          background: 'linear-gradient(180deg, #87CEEB 0%, #B8DEFF 45%, #E8F4FD 100%)',
        }}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={() => { touchRef.current = null; }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
          </div>
        ) : (
          <div style={{
            transform: `translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`,
            transformOrigin: 'center center',
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="-20 -60 420 360" width="380" height="310"
                 style={{ overflow: 'visible' }}
                 onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>

              <defs>
                <style>{`
                  .palm { animation: sway 4s ease-in-out infinite; transform-box: fill-box; transform-origin: bottom center; }
                  @keyframes sway { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
                  .light-pulse { animation: lpulse 1.5s ease-in-out infinite alternate; }
                  @keyframes lpulse { 0%{opacity:0.5} 100%{opacity:1} }
                  .glow-busy { filter: drop-shadow(0 0 5px rgba(232,83,74,0.7)); animation: gblink 2s ease-in-out infinite alternate; }
                  @keyframes gblink { 0%{filter:drop-shadow(0 0 3px rgba(232,83,74,0.4))} 100%{filter:drop-shadow(0 0 10px rgba(232,83,74,0.85))} }
                `}</style>
              </defs>

              {/* ── 1. GROUND — grass base ────────────────────────────── */}
              {(() => {
                const { topPts, leftPts, rightPts } = box(0, 0, 10, 5, 0.12);
                return (
                  <g>
                    <polygon points={leftPts}  fill="#4A8A2A" />
                    <polygon points={rightPts} fill="#5AA030" />
                    <polygon points={topPts}   fill="#6BBF40" />
                  </g>
                );
              })()}

              {/* ── 2. SANDY PATHS ────────────────────────────────────── */}
              {/* Horizontal corridor (row 1) */}
              {(() => {
                const { topPts, leftPts, rightPts } = box(0, 1, 10, 1, 0.16);
                return (
                  <g>
                    <polygon points={leftPts}  fill="#C4A060" />
                    <polygon points={rightPts} fill="#D4B070" />
                    <polygon points={topPts}   fill="#E8C878" />
                  </g>
                );
              })()}
              {/* Vertical corridor (col 4-5) */}
              {(() => {
                const { topPts, leftPts, rightPts } = box(4, 0, 1, 5, 0.16);
                return (
                  <g>
                    <polygon points={leftPts}  fill="#C4A060" />
                    <polygon points={rightPts} fill="#D4B070" />
                    <polygon points={topPts}   fill="#E8C878" />
                  </g>
                );
              })()}
              {/* Entrance plaza */}
              {(() => {
                const { topPts, leftPts, rightPts } = box(3, 4, 4, 1.5, 0.18);
                return (
                  <g>
                    <polygon points={leftPts}  fill="#C8A870" />
                    <polygon points={rightPts} fill="#D8B880" />
                    <polygon points={topPts}   fill="#EED090" />
                  </g>
                );
              })()}

              {/* ── 3. STAGE STRUCTURE ────────────────────────────────── */}
              {(() => {
                const sc = SC, sr = SR;
                const elements: React.ReactNode[] = [];
                // Base platform
                const base = box(sc, sr, 5, 2.5, 0.5);
                elements.push(
                  <g key="stage-base">
                    <polygon points={base.leftPts}  fill="#7A7570" />
                    <polygon points={base.rightPts} fill="#8A8580" />
                    <polygon points={base.topPts}   fill="#9A9590" />
                  </g>
                );
                // Back wall
                const wall = box(sc, sr + 2.2, 5, 0.3, 3.0);
                elements.push(
                  <g key="stage-wall">
                    <polygon points={wall.leftPts}  fill="#181818" />
                    <polygon points={wall.rightPts} fill="#222222" />
                    <polygon points={wall.topPts}   fill="#2A2A2A" />
                  </g>
                );
                // Roof
                const roof = box(sc - 0.4, sr + 0.8, 5.8, 1.8, 0.18);
                elements.push(
                  <g key="stage-roof">
                    <polygon points={roof.leftPts}  fill="#383838" />
                    <polygon points={roof.rightPts} fill="#444444" />
                    <polygon points={roof.topPts}   fill="#505050" />
                  </g>
                );
                // Roof orange stripe
                const stripe = box(sc - 0.4, sr + 2.4, 5.8, 0.25, 0.12);
                elements.push(
                  <g key="stage-stripe">
                    <polygon points={stripe.leftPts}  fill="#CC5520" />
                    <polygon points={stripe.rightPts} fill="#DD6630" />
                    <polygon points={stripe.topPts}   fill="#FF6B35" />
                  </g>
                );
                // Left speaker
                const spkL = box(sc - 0.6, sr + 0.8, 0.5, 0.5, 2.2);
                elements.push(
                  <g key="spk-l">
                    <polygon points={spkL.leftPts}  fill="#111" />
                    <polygon points={spkL.rightPts} fill="#1A1A1A" />
                    <polygon points={spkL.topPts}   fill="#222" />
                  </g>
                );
                // Right speaker
                const spkR = box(sc + 5.1, sr + 0.8, 0.5, 0.5, 2.2);
                elements.push(
                  <g key="spk-r">
                    <polygon points={spkR.leftPts}  fill="#111" />
                    <polygon points={spkR.rightPts} fill="#1A1A1A" />
                    <polygon points={spkR.topPts}   fill="#222" />
                  </g>
                );
                // Stage lights
                const lightCols = ['#FF3232','#3232FF','#FFFF32','#32FF32','#FF32FF'];
                [0.5,1.5,2.5,3.5,4.5].forEach((off, i) => {
                  const lt = box(sc + off, sr + 2.35, 0.3, 0.18, 0.35);
                  elements.push(
                    <g key={`lt${i}`} className="light-pulse">
                      <polygon points={lt.topPts} fill={lightCols[i]} />
                    </g>
                  );
                });
                // Stage label
                const labelPos = iso(sc + 2.5, sr + 1.2);
                elements.push(
                  <text key="stage-label" x={labelPos.x} y={labelPos.y - 60}
                        textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="800"
                        style={{ pointerEvents:'none', textShadow:'0 1px 3px rgba(0,0,0,0.8)' }}>
                    🎵 ESCENARIO
                  </text>
                );
                return <g key="stage">{elements}</g>;
              })()}

              {/* ── 4. VIP PLATFORM ──────────────────────────────────── */}
              {(() => {
                const { topPts, leftPts, rightPts } = box(7, 2, 3, 2, 0.22);
                return (
                  <g>
                    <polygon points={leftPts}  fill="#3A7830" />
                    <polygon points={rightPts} fill="#4A9040" />
                    <polygon points={topPts}   fill="#5AAA50" />
                    <text x={iso(8.5, 3).x} y={iso(8.5, 3).y - 8}
                          textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700"
                          style={{ pointerEvents:'none' }}>VIP</text>
                  </g>
                );
              })()}

              {/* ── 5. FENCE PERIMETER ───────────────────────────────── */}
              {[
                // Top-left edge (col 0→10, row 0)
                ...Array.from({ length: 10 }, (_, c) => ({ c, r: -0.08, w: 0.9, d: 0.1, h: 0.4 })),
                // Bottom-right edge (row 5)
                ...Array.from({ length: 10 }, (_, c) => ({ c, r: 4.92, w: 0.9, d: 0.1, h: 0.4 })),
                // Left edge (col 0, row 0→5)
                ...Array.from({ length: 5 }, (_, r) => ({ c: -0.08, r, w: 0.1, d: 0.9, h: 0.4 })),
                // Right edge (col 10)
                ...Array.from({ length: 5 }, (_, r) => ({ c: 9.92, r, w: 0.1, d: 0.9, h: 0.4 })),
              ].map(({ c, r, w, d, h }, i) => {
                const { topPts, leftPts, rightPts } = box(c, r, w, d, h);
                return (
                  <g key={`fence-${i}`}>
                    <polygon points={leftPts}  fill="#4A2A10" />
                    <polygon points={rightPts} fill="#5A3818" />
                    <polygon points={topPts}   fill="#654322" />
                  </g>
                );
              })}
              {/* Corner posts (taller) */}
              {[[0,0],[10,0],[0,5],[10,5]].map(([c,r],i) => {
                const { topPts, leftPts, rightPts } = box(c - 0.1, r - 0.1, 0.2, 0.2, 0.7);
                return (
                  <g key={`corner-${i}`}>
                    <polygon points={leftPts}  fill="#3A1A08" />
                    <polygon points={rightPts} fill="#4A2810" />
                    <polygon points={topPts}   fill="#5A3618" />
                  </g>
                );
              })}

              {/* ── 6. DECORATIVE DETAILS ────────────────────────────── */}
              {/* Kiosk near entrance */}
              {(() => {
                const k = box(1.2, 3.8, 0.8, 0.8, 0.7);
                const kr = box(1.0, 3.6, 1.2, 1.2, 0.12);
                return (
                  <g>
                    <polygon points={k.leftPts}  fill="#C87020" />
                    <polygon points={k.rightPts} fill="#D88030" />
                    <polygon points={k.topPts}   fill="#F0A040" />
                    <polygon points={kr.leftPts}  fill="#CC4010" />
                    <polygon points={kr.rightPts} fill="#DD5020" />
                    <polygon points={kr.topPts}   fill="#FF6428" />
                  </g>
                );
              })()}
              {/* Trash bins */}
              {[[1.5,2],[3.2,4.2],[8.5,2.5]].map(([c,r],i) => {
                const b = box(c, r, 0.28, 0.28, 0.55);
                return (
                  <g key={`bin-${i}`}>
                    <polygon points={b.leftPts}  fill="#282828" />
                    <polygon points={b.rightPts} fill="#333" />
                    <polygon points={b.topPts}   fill="#404040" />
                  </g>
                );
              })}
              {/* Bushes around VIP */}
              {[[6,2],[6,3],[6,4]].map(([c,r],i) => {
                const b = box(c, r, 0.7, 0.7, 0.5);
                return (
                  <g key={`bush-${i}`}>
                    <polygon points={b.leftPts}  fill="#1E6020" />
                    <polygon points={b.rightPts} fill="#287830" />
                    <polygon points={b.topPts}   fill="#359040" />
                  </g>
                );
              })}

              {/* ── 7. STANDS (sorted back→front) ───────────────────── */}
              {sorted.map(p => {
                const st   = getStatus(p);
                const c    = PAL[st];
                const h    = standH(p, maxOrders);
                const b    = box(p.gc, p.gr, 1.8, 1.8, h);
                const isSel = selected?.id === p.id;
                const isBusy = st === 'busy';
                const label = p.nombre.length > 9 ? p.nombre.slice(0, 8) + '…' : p.nombre;

                return (
                  <g key={p.id} className={isBusy ? 'glow-busy' : undefined}
                     opacity={!p.abierto ? 0.55 : 0.92}
                     onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : p); }}
                     style={{ cursor: 'pointer' }}>
                    <polygon points={b.leftPts}  fill={c.l} />
                    <polygon points={b.rightPts} fill={c.r} />
                    <polygon points={b.topPts}   fill={c.t}
                      stroke={isSel ? '#fff' : 'rgba(0,0,0,0.15)'}
                      strokeWidth={isSel ? 2.5 : 0.7} />
                    <text x={b.cx} y={b.cy + 1} textAnchor="middle"
                          fill="rgba(255,255,255,0.97)" fontSize="6" fontWeight="800"
                          style={{ pointerEvents: 'none' }}>
                      {label}
                    </text>
                    {p.pedidos_activos > 0 && (
                      <text x={b.cx} y={b.cy + 8} textAnchor="middle"
                            fill="rgba(255,255,255,0.85)" fontSize="5"
                            style={{ pointerEvents: 'none' }}>
                        {p.pedidos_activos}p · {formatWait(p.espera_min)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ── 8. CROWD DOTS near stage ─────────────────────────── */}
              {Array.from({ length: 14 }, (_, i) => {
                const cc = SC + 0.4 + (i % 5) * 0.9 + (i % 3) * 0.2;
                const cr = SR + 2.8 + Math.floor(i / 5) * 0.55;
                const b = box(cc, cr, 0.22, 0.22, 0.65);
                const hues = ['#FF6464','#6464FF','#FFD064','#64FF96','#FF80CC'];
                const col = hues[i % hues.length];
                return (
                  <g key={`crowd-${i}`}>
                    <polygon points={b.leftPts}  fill={col} opacity={0.7} />
                    <polygon points={b.topPts}   fill={col} opacity={0.9} />
                  </g>
                );
              })}

              {/* ── 9. SVG OVERLAY — Palms, entrance arch, labels ──── */}
              {/* Palm trees */}
              <g dangerouslySetInnerHTML={{ __html:
                palms.map(p => palmTree(p.x, p.y, p.s)).join('') }} />

              {/* Entrance arch */}
              {(() => {
                const { x, y } = entrPos;
                return (
                  <g>
                    <rect x={x - 28} y={y - 42} width="9" height="42" fill="#A67C52" rx="2"/>
                    <rect x={x + 19} y={y - 42} width="9" height="42" fill="#A67C52" rx="2"/>
                    <path d={`M ${x-28} ${y-42} Q ${x} ${y-72} ${x+28} ${y-42}`}
                          fill="none" stroke="#A67C52" strokeWidth="7"/>
                    <text x={x} y={y - 46} textAnchor="middle" fontSize="7.5"
                          fill="#FF6B35" fontWeight="800">FESTIVAL</text>
                    {['#FF6B35','#FFD700','#4CAF88','#FF6B35'].map((color, i) => {
                      const fx = x - 12 + i * 8;
                      return <polygon key={i}
                        points={`${fx},${y-68} ${fx+4},${y-60} ${fx-4},${y-60}`}
                        fill={color} />;
                    })}
                  </g>
                );
              })()}

            </svg>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
          {[
            { label: <Plus className="w-4 h-4" />,                      fn: () => setTf(t=>({...t,scale:clamp(t.scale*1.25,0.35,4)})) },
            { label: <Minus className="w-4 h-4" />,                     fn: () => setTf(t=>({...t,scale:clamp(t.scale/1.25,0.35,4)})) },
            { label: <span className="text-[9px] font-bold">FIT</span>,  fn: () => setTf({x:0,y:0,scale:1}) },
          ].map(({ label, fn }, i) => (
            <button key={i} onClick={fn}
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-md border"
              style={{ backgroundColor: 'rgba(255,243,228,0.92)', borderColor: '#E8D5C0', color: '#A67C52' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 py-1.5 border-t"
           style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
        {([['#4FC78E','Libre'],['#FFAB00','Moderado'],['#E8534A','Saturado'],['#A0ADB8','Cerrado']] as [string,string][]).map(([color,label]) => (
          <span key={label} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color:'#8B6650' }}>
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor:color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Stand popup */}
      {selected && (
        <div className="flex-shrink-0 border-t px-4 py-3"
             style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-extrabold text-sm" style={{ color: '#2C1810' }}>{selected.nombre}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: selected.abierto ? '#D1FAE5' : '#FEE2E2',
                           color: selected.abierto ? '#065F46' : '#991B1B' }}>
                  {selected.abierto ? 'Abierto' : 'Cerrado'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: PAL[getStatus(selected)].t + '33',
                           color: PAL[getStatus(selected)].l }}>
                  {statusLabel(getStatus(selected))}
                </span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ color: '#A67C52' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { label: 'Pedidos activos', value: selected.pedidos_activos },
              { label: 'Espera media',    value: formatWait(selected.espera_min) },
              { label: 'Ingresos hoy',   value: `${Number(selected.ingresos_hoy).toFixed(0)}€` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-2 text-center border"
                   style={{ backgroundColor: '#FDF6EE', borderColor: '#E8D5C0' }}>
                <p className="text-sm font-extrabold" style={{ color: '#A67C52' }}>{value}</p>
                <p className="text-[9px]" style={{ color: '#8B6650' }}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setSelected(null); navigate('stands'); }}
            className="w-full text-center text-xs font-bold py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#A67C52', color: '#fff' }}>
            Ver detalle completo →
          </button>
        </div>
      )}
    </div>
  );
}

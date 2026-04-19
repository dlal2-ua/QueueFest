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

/* ─── Isometric projection ───────────────────────────────────────────────
   TW=40, TH=20 per tile. Much larger grid (18×12) so zones breathe.
   OX/OY is the screen position of grid point (0,0).
   iso(col, row) → {x, y} screen coords.
──────────────────────────────────────────────────────────────────────── */
const TW = 40;
const TH = 20;
const OX = 230;
const OY = 55;

function iso(col: number, row: number) {
  return {
    x: OX + (col - row) * (TW / 2),
    y: OY + (col + row) * (TH / 2),
  };
}

/* Draw isometric box at (col,row), size w×d tiles, height h tiles.
   Returns polygon point strings for top/left/right faces + center. */
function isoBox(col: number, row: number, w: number, d: number, h: number) {
  const { x, y } = iso(col, row);
  const tw = TW * w;   // pixel width of footprint
  const td = TH * d;   // pixel depth of footprint
  const hp = h * TH;   // pixel height
  return {
    topPts:   `${x+tw/2},${y-hp}   ${x+tw},${y+td/2-hp} ${x+tw/2},${y+td-hp} ${x},${y+td/2-hp}`,
    leftPts:  `${x},${y+td/2-hp}   ${x+tw/2},${y+td-hp}  ${x+tw/2},${y+td}   ${x},${y+td/2}`,
    rightPts: `${x+tw/2},${y+td-hp} ${x+tw},${y+td/2-hp} ${x+tw},${y+td/2}   ${x+tw/2},${y+td}`,
    cx: x + tw / 2,
    cy: y + td / 2 - hp,
  };
}

/* ─── Zone layout — spread over 18 cols × 12 rows ────────────────────── */
/* LEFT ZONE  (food trucks): cols 0-6,  rows 0-5
   RIGHT ZONE (bars):        cols 10-16, rows 0-5
   Wide corridor between: cols 7-9
   Stage: above center (col 7, row -4)
   VIP:  cols 13-16, rows 7-10
   Entrance plaza: cols 6-11, rows 10-12                                  */

const GRID: [number, number][] = [
  // Left zone — 5 stands (food trucks area)
  [0, 0], [4, 0],         // back row
  [0, 3], [4, 3],         // front row
  [2, 1],                 // centre-left

  // Right zone — 5 stands (bar area)
  [10, 0], [14, 0],       // back row
  [10, 3], [14, 3],       // front row
  [12, 1],                // centre-right
];

/* ─── Stand status helpers ──────────────────────────────────────────── */
const PAL = {
  free:     { t: '#4FC78E', l: '#2A9E6A', r: '#38B47E' },
  moderate: { t: '#FFAB00', l: '#C88200', r: '#E69600' },
  busy:     { t: '#E8534A', l: '#B43230', r: '#D2403C' },
  closed:   { t: '#A0ADB8', l: '#6E7E8C', r: '#899AA8' },
};
function getStatus(p: PuestoMapa): keyof typeof PAL {
  if (!p.abierto) return 'closed';
  if (p.pedidos_activos === 0) return 'free';
  if (p.pedidos_activos <= 10) return 'moderate';
  return 'busy';
}
function statusLabel(s: keyof typeof PAL) {
  return s === 'free' ? 'Libre' : s === 'moderate' ? 'Moderado' : s === 'busy' ? 'Saturado' : 'Cerrado';
}
function standH(p: PuestoMapa, maxO: number) {
  if (!p.abierto || p.pedidos_activos === 0) return 0.5;
  return 0.7 + (p.pedidos_activos / maxO) * 1.8;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ─── Palm tree SVG helper ──────────────────────────────────────────── */
function palmSVG(cx: number, cy: number, s = 1) {
  const angles = [0, 55, 110, 165, 220, 280, 335];
  const leaves = angles.map(a =>
    `<ellipse cx="${cx}" cy="${cy - 34*s}" rx="${17*s}" ry="${5*s}"
      fill="#2D8B4E" opacity="0.87"
      transform="rotate(${a} ${cx} ${cy - 34*s})"/>`
  ).join('');
  return `<g class="palm">
    <rect x="${cx-2.5*s}" y="${cy-34*s}" width="${5*s}" height="${34*s}"
      fill="#8B6914" rx="2" transform="rotate(-4 ${cx} ${cy})"/>
    ${leaves}
    <circle cx="${cx+2.5*s}" cy="${cy-32*s}" r="${3*s}" fill="#6B4226"/>
    <circle cx="${cx-2*s}"   cy="${cy-34*s}" r="${2.2*s}" fill="#5A3820"/>
  </g>`;
}

export function MapView({ festivalId, navigate }: Props) {
  const [puestos, setPuestos]   = useState<PuestoMapa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<PuestoMapa | null>(null);
  const [tf, setTf]             = useState({ x: 0, y: 0, scale: 0.72 });
  const dragRef  = useRef({ active: false, sx: 0, sy: 0, tx: 0, ty: 0 });
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Wheel zoom */
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      setTf(t => ({ ...t, scale: clamp(t.scale * (e.deltaY < 0 ? 1.1 : 0.92), 0.3, 5) }));
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

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const onMD = (e: React.MouseEvent) => { dragRef.current = { active:true, sx:e.clientX, sy:e.clientY, tx:tf.x, ty:tf.y }; };
  const onMM = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    setTf(t => ({ ...t, x: dragRef.current.tx+(e.clientX-dragRef.current.sx), y: dragRef.current.ty+(e.clientY-dragRef.current.sy) }));
  };
  const onMU = () => { dragRef.current.active = false; };
  const onTS = (e: React.TouchEvent) => { if (e.touches.length===1) touchRef.current = { x:e.touches[0].clientX, y:e.touches[0].clientY }; };
  const onTM = (e: React.TouchEvent) => {
    if (e.touches.length===1 && touchRef.current) {
      const dx = e.touches[0].clientX - touchRef.current.x;
      const dy = e.touches[0].clientY - touchRef.current.y;
      touchRef.current = { x:e.touches[0].clientX, y:e.touches[0].clientY };
      setTf(t => ({ ...t, x:t.x+dx, y:t.y+dy }));
    }
  };

  const maxOrders = Math.max(...puestos.map(p => p.pedidos_activos), 1);
  const mapped    = puestos.slice(0, 10).map((p, i) => ({ ...p, gc: GRID[i][0], gr: GRID[i][1] }));
  const sorted    = [...mapped].sort((a, b) => (a.gc + a.gr) - (b.gc + b.gr));

  /* Palm tree positions (grid → screen) */
  const palmPositions = [
    iso(-1.5, 1), iso(-1.5, 4), iso(-1.5, 7),
    iso(2, -1.8), iso(7.5, -2), iso(13, -1.8),
    iso(17.5, 1), iso(17.5, 4), iso(17.5, 7),
    iso(4, 11.5), iso(10, 11.5),
  ];

  /* Stage layout */
  const SC = 6.5, SR = -3.5;

  /* Entrance position */
  const entrIso = iso(8, 11);

  /* VIP label position */
  const vipLabel = iso(14.5, 8.5);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
           style={{ backgroundColor: '#FFF3E4', borderBottom: '1px solid #E8D5C0' }}>
        <button onClick={() => navigate('main')} className="flex items-center gap-1 hover:opacity-70">
          <ChevronLeft className="w-5 h-5" style={{ color: '#A67C52' }} />
          <span className="text-xs font-semibold" style={{ color: '#A67C52' }}>Volver</span>
        </button>
        <h2 className="text-sm font-extrabold" style={{ color: '#A67C52' }}>Mapa del Festival</h2>
        <button onClick={load} style={{ color: '#A67C52' }} className="p-1.5 hover:opacity-70">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Zone labels bar */}
      <div className="flex-shrink-0 flex items-center justify-center gap-6 py-1.5 border-b text-[10px] font-bold"
           style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#8B6650' }}>
        <span>🍕 Zona Food</span>
        <span>🎵 Escenario</span>
        <span>🍺 Zona Barras</span>
        <span>⭐ VIP</span>
      </div>

      {/* Map canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{
          cursor: dragRef.current.active ? 'grabbing' : 'grab',
          background: 'linear-gradient(180deg, #6AAED6 0%, #A8D4F0 40%, #D4ECFA 100%)',
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
            <svg viewBox="-40 -80 540 380" width="500" height="350"
                 style={{ overflow: 'visible' }}
                 onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>

              <defs>
                <style>{`
                  .palm{animation:sway 4s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom center}
                  @keyframes sway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
                  .lpulse{animation:lp 1.8s ease-in-out infinite alternate}
                  @keyframes lp{0%{opacity:0.45}100%{opacity:1}}
                  .glow{filter:drop-shadow(0 0 6px rgba(232,83,74,0.7));animation:gb 2s ease-in-out infinite alternate}
                  @keyframes gb{0%{filter:drop-shadow(0 0 3px rgba(232,83,74,0.4))}100%{filter:drop-shadow(0 0 10px rgba(232,83,74,0.9))}}
                `}</style>
              </defs>

              {/* ── 1. MAIN GRASS (full venue base) ──────────────────── */}
              {(() => {
                const b = isoBox(-0.5, -0.5, 18, 13, 0.1);
                return <>
                  <polygon points={b.leftPts}  fill="#3D7A20" />
                  <polygon points={b.rightPts} fill="#4D9028" />
                  <polygon points={b.topPts}   fill="#5CAA30" />
                </>;
              })()}

              {/* ── 2. ZONE PADS ─────────────────────────────────────── */}
              {/* Left zone (food) — slightly brighter green */}
              {(() => {
                const b = isoBox(-0.3, -0.3, 7.5, 6, 0.13);
                return <>
                  <polygon points={b.leftPts}  fill="#448828" />
                  <polygon points={b.rightPts} fill="#54A030" />
                  <polygon points={b.topPts}   fill="#66BB3C" />
                </>;
              })()}
              {/* Right zone (bars) */}
              {(() => {
                const b = isoBox(9.5, -0.3, 7.5, 6, 0.13);
                return <>
                  <polygon points={b.leftPts}  fill="#448828" />
                  <polygon points={b.rightPts} fill="#54A030" />
                  <polygon points={b.topPts}   fill="#66BB3C" />
                </>;
              })()}
              {/* VIP zone */}
              {(() => {
                const b = isoBox(12.5, 6.5, 5, 4.5, 0.22);
                return <>
                  <polygon points={b.leftPts}  fill="#306020" />
                  <polygon points={b.rightPts} fill="#408030" />
                  <polygon points={b.topPts}   fill="#52A040" />
                  <text x={vipLabel.x} y={vipLabel.y - 7} textAnchor="middle"
                        fontSize="9" fontWeight="800" fill="rgba(255,255,255,0.9)"
                        style={{ pointerEvents:'none' }}>⭐ VIP</text>
                </>;
              })()}

              {/* ── 3. SANDY PATHS ───────────────────────────────────── */}
              {/* Central corridor (cols 7-9) */}
              {(() => {
                const b = isoBox(7, -0.3, 2.5, 6.5, 0.18);
                return <>
                  <polygon points={b.leftPts}  fill="#B89050" />
                  <polygon points={b.rightPts} fill="#CCA860" />
                  <polygon points={b.topPts}   fill="#E0BF70" />
                </>;
              })()}
              {/* Horizontal main path (rows 5-6) */}
              {(() => {
                const b = isoBox(-0.3, 5.5, 18, 1.5, 0.18);
                return <>
                  <polygon points={b.leftPts}  fill="#B89050" />
                  <polygon points={b.rightPts} fill="#CCA860" />
                  <polygon points={b.topPts}   fill="#E0BF70" />
                </>;
              })()}
              {/* Entrance plaza */}
              {(() => {
                const b = isoBox(5.5, 9.5, 6, 2.5, 0.2);
                return <>
                  <polygon points={b.leftPts}  fill="#C09858" />
                  <polygon points={b.rightPts} fill="#D4AE68" />
                  <polygon points={b.topPts}   fill="#ECC878" />
                </>;
              })()}

              {/* ── 4. STAGE ─────────────────────────────────────────── */}
              {(() => {
                const sc = SC, sr = SR;
                const base   = isoBox(sc,       sr,       6,   2.5, 0.5);
                const wall   = isoBox(sc,       sr+2.2,   6,   0.3, 3.2);
                const roof   = isoBox(sc-0.5,   sr+0.7,   7,   2,   0.18);
                const stripe = isoBox(sc-0.5,   sr+2.4,   7,   0.3, 0.13);
                const spkL   = isoBox(sc-0.7,   sr+0.7,   0.5, 0.5, 2.4);
                const spkR   = isoBox(sc+6.2,   sr+0.7,   0.5, 0.5, 2.4);
                const lpos   = iso(sc + 3, sr + 1);
                const lightCols = ['#FF3232','#3232FF','#FFFF32','#32FF32','#FF32FF'];
                return (
                  <g>
                    <polygon points={base.leftPts}   fill="#686460" />
                    <polygon points={base.rightPts}  fill="#807C78" />
                    <polygon points={base.topPts}    fill="#989490" />
                    <polygon points={wall.leftPts}   fill="#141414" />
                    <polygon points={wall.rightPts}  fill="#1E1E1E" />
                    <polygon points={wall.topPts}    fill="#282828" />
                    <polygon points={roof.leftPts}   fill="#303030" />
                    <polygon points={roof.rightPts}  fill="#3C3C3C" />
                    <polygon points={roof.topPts}    fill="#484848" />
                    <polygon points={stripe.leftPts} fill="#CC5520" />
                    <polygon points={stripe.rightPts}fill="#DD6630" />
                    <polygon points={stripe.topPts}  fill="#FF6B35" />
                    <polygon points={spkL.leftPts}   fill="#0C0C0C" />
                    <polygon points={spkL.rightPts}  fill="#141414" />
                    <polygon points={spkL.topPts}    fill="#1C1C1C" />
                    <polygon points={spkR.leftPts}   fill="#0C0C0C" />
                    <polygon points={spkR.rightPts}  fill="#141414" />
                    <polygon points={spkR.topPts}    fill="#1C1C1C" />
                    {[0.5,1.5,2.5,3.5,4.5,5.5].map((off, i) => {
                      const lt = isoBox(sc+off, sr+2.35, 0.35, 0.2, 0.4);
                      return (
                        <g key={i} className="lpulse" style={{ animationDelay: `${i*0.25}s` }}>
                          <polygon points={lt.topPts}  fill={lightCols[i % 5]} />
                          <polygon points={lt.leftPts} fill={lightCols[i % 5]} opacity={0.6} />
                        </g>
                      );
                    })}
                    <text x={lpos.x} y={lpos.y - 58} textAnchor="middle"
                          fontSize="9" fontWeight="900" fill="#fff"
                          style={{ pointerEvents:'none', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}>
                      🎵 ESCENARIO
                    </text>
                  </g>
                );
              })()}

              {/* ── 5. FENCE PERIMETER ───────────────────────────────── */}
              {[
                ...Array.from({length:18},(_,c)=>({c,r:-0.55,w:1,d:0.1,h:0.55})),
                ...Array.from({length:18},(_,c)=>({c,r:12.48,w:1,d:0.1,h:0.55})),
                ...Array.from({length:13},(_,r)=>({c:-0.55,r,w:0.1,d:1,h:0.55})),
                ...Array.from({length:13},(_,r)=>({c:17.48,r,w:0.1,d:1,h:0.55})),
              ].map(({c,r,w,d,h},i) => {
                const b = isoBox(c,r,w,d,h);
                return (
                  <g key={`f${i}`}>
                    <polygon points={b.leftPts}  fill="#3E1A08" />
                    <polygon points={b.rightPts} fill="#4E2810" />
                    <polygon points={b.topPts}   fill="#603620" />
                  </g>
                );
              })}

              {/* ── 6. DECORATIONS ───────────────────────────────────── */}
              {/* Kiosk */}
              {(() => {
                const k  = isoBox(8.2, 4, 1, 1, 0.8);
                const kr = isoBox(7.9, 3.7, 1.6, 1.6, 0.15);
                return <>
                  <polygon points={k.leftPts}  fill="#C07020" />
                  <polygon points={k.rightPts} fill="#D08030" />
                  <polygon points={k.topPts}   fill="#EE9A40" />
                  <polygon points={kr.leftPts} fill="#CC4010" />
                  <polygon points={kr.rightPts}fill="#DD5020" />
                  <polygon points={kr.topPts}  fill="#FF6428" />
                </>;
              })()}
              {/* Trash bins */}
              {[[3.5,4.8],[8.5,4.8],[13.5,4.8]].map(([c,r],i) => {
                const b = isoBox(c,r,0.3,0.3,0.6);
                return <g key={`bin${i}`}>
                  <polygon points={b.leftPts}  fill="#222" />
                  <polygon points={b.rightPts} fill="#2E2E2E" />
                  <polygon points={b.topPts}   fill="#3A3A3A" />
                </g>;
              })}
              {/* Bushes along VIP border */}
              {[[11.5,6.8],[11.5,8],[11.5,9.2],[11.5,10.4]].map(([c,r],i) => {
                const b = isoBox(c,r,0.7,0.7,0.55);
                return <g key={`bush${i}`}>
                  <polygon points={b.leftPts}  fill="#1A5818" />
                  <polygon points={b.rightPts} fill="#247022" />
                  <polygon points={b.topPts}   fill="#308830" />
                </g>;
              })}
              {/* Zone separators (small decorative lights) */}
              {[0,2,4,6,8,10,12].map((r,i) => {
                const bl = isoBox(7.1, r, 0.12, 0.12, 0.5);
                const br = isoBox(9.7, r, 0.12, 0.12, 0.5);
                return <g key={`sep${i}`}>
                  <polygon points={bl.topPts} fill="#FFD700" opacity={0.8} />
                  <polygon points={br.topPts} fill="#FFD700" opacity={0.8} />
                </g>;
              })}

              {/* ── 7. STANDS (back→front) ───────────────────────────── */}
              {sorted.map(p => {
                const st    = getStatus(p);
                const c     = PAL[st];
                const h     = standH(p, maxOrders);
                const b     = isoBox(p.gc, p.gr, 2.2, 2.2, h);
                const isSel = selected?.id === p.id;
                const isBusy= st === 'busy';
                const label = p.nombre.length > 9 ? p.nombre.slice(0,8)+'…' : p.nombre;
                return (
                  <g key={p.id} className={isBusy ? 'glow' : undefined}
                     opacity={!p.abierto ? 0.5 : 0.93}
                     onClick={e => { e.stopPropagation(); setSelected(isSel ? null : p); }}
                     style={{ cursor:'pointer' }}>
                    <polygon points={b.leftPts}  fill={c.l} />
                    <polygon points={b.rightPts} fill={c.r} />
                    <polygon points={b.topPts}   fill={c.t}
                      stroke={isSel ? '#fff' : 'rgba(0,0,0,0.15)'}
                      strokeWidth={isSel ? 2.5 : 0.8} />
                    <text x={b.cx} y={b.cy+1.5} textAnchor="middle"
                          fill="rgba(255,255,255,0.97)" fontSize="7" fontWeight="800"
                          style={{ pointerEvents:'none' }}>
                      {label}
                    </text>
                    {p.pedidos_activos > 0 && (
                      <text x={b.cx} y={b.cy+10} textAnchor="middle"
                            fill="rgba(255,255,255,0.85)" fontSize="5.5"
                            style={{ pointerEvents:'none' }}>
                        {p.pedidos_activos}p · {formatWait(p.espera_min, p.pedidos_activos > 0)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ── 8. CROWD near stage ──────────────────────────────── */}
              {Array.from({length:18}, (_,i) => {
                const cc = SC + 0.6 + (i%6)*0.85;
                const cr = SR + 3 + Math.floor(i/6)*0.65;
                const b  = isoBox(cc,cr,0.25,0.25,0.7);
                const hues=['#FF6464','#6464FF','#FFD064','#64FF96','#FF80CC','#80FFFF'];
                return <g key={`c${i}`}>
                  <polygon points={b.leftPts}  fill={hues[i%6]} opacity={0.65} />
                  <polygon points={b.topPts}   fill={hues[i%6]} opacity={0.85} />
                </g>;
              })}

              {/* ── 9. PALM TREES (SVG overlay) ──────────────────────── */}
              <g dangerouslySetInnerHTML={{ __html:
                palmPositions.map((p,i) => palmSVG(p.x, p.y, 0.78 + (i%3)*0.07)).join('')
              }} />

              {/* ── 10. ENTRANCE ARCH ────────────────────────────────── */}
              {(() => {
                const {x,y} = entrIso;
                return (
                  <g>
                    <rect x={x-28} y={y-44} width="10" height="44" fill="#A67C52" rx="2"/>
                    <rect x={x+18} y={y-44} width="10" height="44" fill="#A67C52" rx="2"/>
                    <path d={`M${x-28} ${y-44} Q${x} ${y-76} ${x+28} ${y-44}`}
                          fill="none" stroke="#A67C52" strokeWidth="8"/>
                    <text x={x} y={y-48} textAnchor="middle" fontSize="8"
                          fill="#FF6B35" fontWeight="800">FESTIVAL</text>
                    {['#FF6B35','#FFD700','#4CAF88','#FF6B35'].map((col,i) => {
                      const fx = x - 13 + i*9;
                      return <polygon key={i}
                        points={`${fx},${y-70} ${fx+5},${y-62} ${fx-5},${y-62}`}
                        fill={col}/>;
                    })}
                  </g>
                );
              })()}

            </svg>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          {[
            { lbl: <Plus className="w-4 h-4"/>,  fn: ()=>setTf(t=>({...t,scale:clamp(t.scale*1.2,0.3,5)})) },
            { lbl: <Minus className="w-4 h-4"/>, fn: ()=>setTf(t=>({...t,scale:clamp(t.scale/1.2,0.3,5)})) },
            { lbl: <span className="text-[9px] font-bold">FIT</span>, fn: ()=>setTf({x:0,y:0,scale:0.72}) },
          ].map(({lbl,fn},i) => (
            <button key={i} onClick={fn}
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border"
              style={{ backgroundColor:'rgba(255,243,228,0.92)', borderColor:'#E8D5C0', color:'#A67C52' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 py-1.5 border-t"
           style={{ backgroundColor:'#FFF3E4', borderColor:'#E8D5C0' }}>
        {([['#4FC78E','Libre'],['#FFAB00','Moderado'],['#E8534A','Saturado'],['#A0ADB8','Cerrado']] as [string,string][])
          .map(([color,label]) => (
            <span key={label} className="flex items-center gap-1 text-[10px] font-semibold" style={{color:'#8B6650'}}>
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{backgroundColor:color}}/>
              {label}
            </span>
          ))}
      </div>

      {/* Popup */}
      {selected && (
        <div className="flex-shrink-0 border-t px-4 py-3"
             style={{ backgroundColor:'#FFF3E4', borderColor:'#E8D5C0' }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-extrabold text-sm" style={{color:'#2C1810'}}>{selected.nombre}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: selected.abierto ? '#D1FAE5' : '#FEE2E2',
                           color: selected.abierto ? '#065F46' : '#991B1B' }}>
                  {selected.abierto ? 'Abierto' : 'Cerrado'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: PAL[getStatus(selected)].t+'33',
                           color: PAL[getStatus(selected)].l }}>
                  {statusLabel(getStatus(selected))}
                </span>
              </div>
            </div>
            <button onClick={()=>setSelected(null)} style={{color:'#A67C52'}}>
              <X className="w-4 h-4"/>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              {label:'Pedidos activos', value: selected.pedidos_activos},
              {label:'Espera media',    value: formatWait(selected.espera_min, selected.pedidos_activos > 0)},
              {label:'Ingresos hoy',   value: `${Number(selected.ingresos_hoy).toFixed(0)}€`},
            ].map(({label,value}) => (
              <div key={label} className="rounded-xl p-2 text-center border"
                   style={{backgroundColor:'#FDF6EE',borderColor:'#E8D5C0'}}>
                <p className="text-sm font-extrabold" style={{color:'#A67C52'}}>{value}</p>
                <p className="text-[9px]" style={{color:'#8B6650'}}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={()=>{ setSelected(null); navigate('stands'); }}
            className="w-full text-center text-xs font-bold py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{backgroundColor:'#A67C52',color:'#fff'}}>
            Ver detalle completo →
          </button>
        </div>
      )}
    </div>
  );
}

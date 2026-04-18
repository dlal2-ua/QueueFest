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

/* ── Isometric constants ──────────────────────────────────────────────── */
const TW = 54;   // tile width
const TH = 27;   // tile height (TW/2)
const OX = 88;   // screen origin X
const OY = 78;   // screen origin Y

/* Grid positions for up to 10 stands (two rows of 5, corridor row=1) */
const GRID: [number, number][] = [
  [0,0],[2,0],[4,0],[6,0],[8,0],
  [0,2],[2,2],[4,2],[6,2],[8,2],
];

function iso(col: number, row: number) {
  return {
    x: OX + (col - row) * (TW / 2),
    y: OY + (col + row) * (TH / 2),
  };
}

function boxPoints(col: number, row: number, h: number) {
  const { x, y } = iso(col, row);
  return {
    top:   `${x+TW/2},${y-h} ${x+TW},${y+TH/2-h} ${x+TW/2},${y+TH-h} ${x},${y+TH/2-h}`,
    left:  `${x},${y+TH/2-h} ${x+TW/2},${y+TH-h} ${x+TW/2},${y+TH} ${x},${y+TH/2}`,
    right: `${x+TW/2},${y+TH-h} ${x+TW},${y+TH/2-h} ${x+TW},${y+TH/2} ${x+TW/2},${y+TH}`,
    cx: x + TW / 2,
    cy: y - h + TH / 2,
  };
}

/* ── Color palettes ───────────────────────────────────────────────────── */
const PAL = {
  free:     { t: '#4FC78E', l: '#2A9E6A', r: '#38B47E' },
  moderate: { t: '#FFAB00', l: '#C88200', r: '#E69600' },
  busy:     { t: '#E8534A', l: '#B43230', r: '#D2403C' },
  closed:   { t: '#A0ADB8', l: '#6E7E8C', r: '#899AA8' },
  grass:    { t: '#78C050', l: '#5A9A38', r: '#68AE44' },
  pathT:    '#D4B483', pathL: '#B8966A', pathR: '#C9A576',
  stage:    { t: '#9CA3AF', l: '#6B7280', r: '#808E9C' },
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
function boxH(p: PuestoMapa, maxO: number) {
  if (!p.abierto || p.pedidos_activos === 0) return 10;
  return 12 + (p.pedidos_activos / maxO) * 28;
}
function boxOp(p: PuestoMapa, maxO: number) {
  if (!p.abierto) return 0.55;
  if (p.pedidos_activos === 0) return 0.68;
  return 0.72 + (p.pedidos_activos / maxO) * 0.23;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function MapView({ festivalId, navigate }: Props) {
  const [puestos, setPuestos]   = useState<PuestoMapa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<PuestoMapa | null>(null);
  const [tf, setTf] = useState({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef({ active: false, sx: 0, sy: 0, tx: 0, ty: 0 });
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Wheel zoom */
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      setTf(t => ({ ...t, scale: clamp(t.scale * (e.deltaY < 0 ? 1.12 : 0.9), 0.4, 4) }));
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

  useEffect(() => { load(); }, [load]);

  /* Mouse pan */
  const onMD = (e: React.MouseEvent) => { dragRef.current = { active:true, sx:e.clientX, sy:e.clientY, tx:tf.x, ty:tf.y }; };
  const onMM = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    setTf(t => ({ ...t, x: dragRef.current.tx+(e.clientX-dragRef.current.sx), y: dragRef.current.ty+(e.clientY-dragRef.current.sy) }));
  };
  const onMU = () => { dragRef.current.active = false; };
  const onTS = (e: React.TouchEvent) => { if (e.touches.length===1) touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const onTM = (e: React.TouchEvent) => {
    if (e.touches.length===1 && touchRef.current) {
      const dx=e.touches[0].clientX-touchRef.current.x, dy=e.touches[0].clientY-touchRef.current.y;
      touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
      setTf(t=>({...t,x:t.x+dx,y:t.y+dy}));
    }
  };

  const maxOrders = Math.max(...puestos.map(p => p.pedidos_activos), 1);

  /* Assign grid positions to stands */
  const mapped = puestos.slice(0, 10).map((p, i) => ({ ...p, gc: GRID[i][0], gr: GRID[i][1] }));
  const sorted = [...mapped].sort((a, b) => (a.gc + a.gr) - (b.gc + b.gr));

  /* Build ground tile list, sorted back-to-front */
  type Tile = { col: number; row: number; type: 'grass' | 'path' };
  const ground: Tile[] = [];
  for (let r = 0; r <= 2; r++)
    for (let c = 0; c <= 8; c++)
      ground.push({ col: c, row: r, type: r === 1 ? 'path' : 'grass' });
  ground.sort((a, b) => (a.col + a.row) - (b.col + b.row));

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
           style={{ backgroundColor: '#FFF3E4', borderBottom: '1px solid #E8D5C0' }}>
        <button onClick={() => navigate('main')} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
          <ChevronLeft className="w-5 h-5" style={{ color: '#A67C52' }} />
          <span className="text-xs font-semibold" style={{ color: '#A67C52' }}>Volver</span>
        </button>
        <h2 className="text-sm font-extrabold" style={{ color: '#A67C52' }}>Mapa 3D del Festival</h2>
        <button onClick={load} style={{ color: '#A67C52' }} className="p-1.5 hover:opacity-70">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Map canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab', backgroundColor: '#B8D4F0' }}
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
            <svg viewBox="0 0 360 265" width="360" height="265" style={{ overflow: 'visible' }}
                 onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>

              {/* ── Ground tiles (grass + corridors) ──────────────────── */}
              {ground.map(({ col, row, type }) => {
                if (type === 'grass') {
                  const { x, y } = iso(col, row);
                  const pts = `${x+TW/2},${y} ${x+TW},${y+TH/2} ${x+TW/2},${y+TH} ${x},${y+TH/2}`;
                  // Alternate shade for checkerboard depth feel
                  const shade = (col + row) % 2 === 0 ? PAL.grass.t : '#6FB849';
                  return <polygon key={`g${col}-${row}`} points={pts} fill={shade} />;
                } else {
                  // Path tile with height=3 to look like elevated walkway
                  const { top, left, right } = boxPoints(col, row, 3);
                  return (
                    <g key={`p${col}-${row}`}>
                      <polygon points={left}  fill={PAL.pathL} />
                      <polygon points={right} fill={PAL.pathR} />
                      <polygon points={top}   fill={PAL.pathT} />
                    </g>
                  );
                }
              })}

              {/* ── Stage landmark (back-left of scene) ───────────────── */}
              {(() => {
                const sc = 10, sr = -1; // behind the stands
                const { x, y } = iso(sc, sr);
                const h = 22;
                const tp = `${x+TW/2},${y-h} ${x+TW},${y+TH/2-h} ${x+TW/2},${y+TH-h} ${x},${y+TH/2-h}`;
                const lp = `${x},${y+TH/2-h} ${x+TW/2},${y+TH-h} ${x+TW/2},${y+TH} ${x},${y+TH/2}`;
                const rp = `${x+TW/2},${y+TH-h} ${x+TW},${y+TH/2-h} ${x+TW},${y+TH/2} ${x+TW/2},${y+TH}`;
                return (
                  <g opacity={0.85}>
                    <polygon points={lp} fill={PAL.stage.l} />
                    <polygon points={rp} fill={PAL.stage.r} />
                    <polygon points={tp} fill={PAL.stage.t} />
                    <text x={x+TW/2} y={y-h-4} textAnchor="middle"
                          fill="#374151" fontSize="7" fontWeight="800">🎵 ESCENARIO</text>
                  </g>
                );
              })()}

              {/* ── Stands (sorted back → front) ──────────────────────── */}
              {sorted.map(p => {
                const st  = getStatus(p);
                const c   = PAL[st] as { t:string;l:string;r:string };
                const h   = boxH(p, maxOrders);
                const op  = boxOp(p, maxOrders);
                const { top, left, right, cx, cy } = boxPoints(p.gc, p.gr, h);
                const isSel = selected?.id === p.id;
                const label = p.nombre.length > 10 ? p.nombre.slice(0, 9) + '…' : p.nombre;

                return (
                  <g key={p.id} opacity={op}
                     onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : p); }}
                     style={{ cursor: 'pointer' }}>
                    <polygon points={left}  fill={c.l} />
                    <polygon points={right} fill={c.r} />
                    <polygon points={top}   fill={c.t}
                      stroke={isSel ? '#fff' : 'rgba(0,0,0,0.12)'}
                      strokeWidth={isSel ? 2 : 0.5} />
                    {/* Name */}
                    <text x={cx} y={cy - 1} textAnchor="middle" fill="rgba(255,255,255,0.95)"
                          fontSize="6.5" fontWeight="800" style={{ pointerEvents:'none' }}>
                      {label}
                    </text>
                    {/* Orders badge */}
                    {p.pedidos_activos > 0 && (
                      <text x={cx} y={cy + 6.5} textAnchor="middle" fill="rgba(255,255,255,0.85)"
                            fontSize="5.5" style={{ pointerEvents:'none' }}>
                        {p.pedidos_activos}p · {formatWait(p.espera_min)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ── Entrada marker ────────────────────────────────────── */}
              {(() => {
                const ec = 4, er = 3;
                const { x, y } = iso(ec, er);
                const h = 5;
                const tp = `${x+TW/2},${y-h} ${x+TW},${y+TH/2-h} ${x+TW/2},${y+TH-h} ${x},${y+TH/2-h}`;
                const lp = `${x},${y+TH/2-h} ${x+TW/2},${y+TH-h} ${x+TW/2},${y+TH} ${x},${y+TH/2}`;
                const rp = `${x+TW/2},${y+TH-h} ${x+TW},${y+TH/2-h} ${x+TW},${y+TH/2} ${x+TW/2},${y+TH}`;
                return (
                  <g>
                    <polygon points={lp} fill="#C4A476" />
                    <polygon points={rp} fill="#D4B487" />
                    <polygon points={tp} fill="#E8C990" />
                    <text x={x+TW/2} y={y-h-3} textAnchor="middle"
                          fill="#8B6030" fontSize="6.5" fontWeight="700">ENTRADA</text>
                  </g>
                );
              })()}
            </svg>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          {[
            { label: <Plus className="w-4 h-4" />,   fn: () => setTf(t=>({...t,scale:clamp(t.scale*1.3,0.4,4)})) },
            { label: <Minus className="w-4 h-4" />,  fn: () => setTf(t=>({...t,scale:clamp(t.scale/1.3,0.4,4)})) },
            { label: <span className="text-[10px] font-bold">1:1</span>, fn: () => setTf({x:0,y:0,scale:1}) },
          ].map(({ label, fn }, i) => (
            <button key={i} onClick={fn}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-md border"
              style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#A67C52' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 py-2 border-t"
           style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
        {([['#4FC78E','Libre'],['#FFAB00','Moderado'],['#E8534A','Saturado']] as [string,string][]).map(([color,label]) => (
          <span key={label} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color:'#8B6650' }}>
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor:color }} />
            {label}
          </span>
        ))}
        <span className="text-[9px] italic" style={{ color:'#C8956C',opacity:0.7 }}>altura = ocupación</span>
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
                  style={{ backgroundColor: selected.abierto ? '#D1FAE5' : '#FEE2E2', color: selected.abierto ? '#065F46' : '#991B1B' }}>
                  {selected.abierto ? 'Abierto' : 'Cerrado'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: (PAL[getStatus(selected)] as any).t + '33', color: (PAL[getStatus(selected)] as any).l }}>
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

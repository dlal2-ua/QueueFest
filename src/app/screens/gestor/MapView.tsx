import { useEffect, useState, useRef, useCallback } from 'react';
import { getMapaPuestos } from '../../api';
import { ChevronLeft, RefreshCw, Plus, Minus, X } from 'lucide-react';

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

/* ── Paleta de saturación ─────────────────────────────────────────────── */
const COLOR_SAT = (n: number) => {
  if (n === 0) return { fill: '#4CAF88', stroke: '#3A9E73', label: 'Libre'    };
  if (n <= 3)  return { fill: '#F59E0B', stroke: '#D97706', label: 'Moderado' };
  return             { fill: '#EF4444', stroke: '#DC2626', label: 'Saturado' };
};

/* ── Layout del recinto (coordenadas en viewBox 360×500) ──────────────── */
const VB_W = 360, VB_H = 500;

// Pasillo horizontal central
const PASILLO_H = { x: 0, y: 215, w: VB_W, h: 54 };
// Pasillo vertical central
const PASILLO_V = { x: 163, y: 0, w: 34, h: VB_H };

// Zonas especiales (encima del pasillo v, encima del pasillo h)
const ESCENARIO = { x: 173, y: 20,  w: 170, h: 110 };
const ZONA_VIP  = { x: 173, y: 285, w: 170, h: 100 };
const ENTRADA   = { x: 113, y: 460, w: 134, h: 32  };

/* Slots para stands (12 posiciones)
   Col-izquierda (barras):   x=14..149, y evita los pasillos
   Col-izquierda inferior:   y=278..440
*/
const SLOTS: { x: number; y: number; w: number; h: number }[] = [
  // Columna izquierda — superior (y=20..207)
  { x: 14,  y: 20,  w: 140, h: 56 },
  { x: 14,  y: 84,  w: 140, h: 56 },
  { x: 14,  y: 148, w: 140, h: 56 },
  // Columna izquierda — inferior (y=278..440)
  { x: 14,  y: 278, w: 140, h: 56 },
  { x: 14,  y: 342, w: 140, h: 56 },
  { x: 14,  y: 406, w: 140, h: 46 },
  // Columna derecha — superior (x=206, y=142..207  — debajo del escenario)
  { x: 206, y: 142, w: 140, h: 56 },
  // Columna derecha — inferior (y=278..440)
  { x: 206, y: 278, w: 140, h: 56 },
  { x: 206, y: 342, w: 140, h: 56 },
  { x: 206, y: 406, w: 140, h: 46 },
  // Extra slots (si hay más de 10 stands)
  { x: 14,  y: 460, w: 65,  h: 32 },
  { x: 286, y: 460, w: 60,  h: 32 },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function MapView({ festivalId, navigate }: Props) {
  const [puestos, setPuestos] = useState<PuestoMapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PuestoMapa | null>(null);

  // Pan + zoom state
  const [tf, setTf] = useState({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; tx: number; ty: number }>({
    active: false, sx: 0, sy: 0, tx: 0, ty: 0,
  });
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Wheel zoom (passive:false necesario) */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 0.9;
      setTf(t => ({ ...t, scale: clamp(t.scale * f, 0.4, 4) }));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPuestos(await getMapaPuestos(festivalId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [festivalId]);

  useEffect(() => { load(); }, [load]);

  /* Mouse pan */
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, tx: tf.x, ty: tf.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    setTf(t => ({
      ...t,
      x: dragRef.current.tx + (e.clientX - dragRef.current.sx),
      y: dragRef.current.ty + (e.clientY - dragRef.current.sy),
    }));
  };
  const onMouseUp = () => { dragRef.current.active = false; };

  /* Touch pan */
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1)
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTf(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
    }
  };
  const onTouchEnd = () => { lastTouchRef.current = null; };

  const zoomIn  = () => setTf(t => ({ ...t, scale: clamp(t.scale * 1.3, 0.4, 4) }));
  const zoomOut = () => setTf(t => ({ ...t, scale: clamp(t.scale / 1.3, 0.4, 4) }));
  const reset   = () => setTf({ x: 0, y: 0, scale: 1 });

  /* Asignar slots a los puestos */
  const puestosConSlot = puestos.map((p, i) => {
    if (p.pos_x !== null && p.pos_y !== null) {
      // Usar coordenadas de la DB (% del canvas)
      const sw = 140, sh = 56;
      return { ...p, slot: { x: (p.pos_x / 100) * (VB_W - sw), y: (p.pos_y / 100) * (VB_H - sh), w: sw, h: sh } };
    }
    return { ...p, slot: SLOTS[i % SLOTS.length] };
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: '#FFF3E4', borderBottom: '1px solid #E8D5C0' }}
      >
        <button onClick={() => navigate('main')} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
          <ChevronLeft className="w-5 h-5" style={{ color: '#A67C52' }} />
          <span className="text-xs font-semibold" style={{ color: '#A67C52' }}>Volver</span>
        </button>
        <h2 className="text-sm font-extrabold" style={{ color: '#A67C52' }}>Mapa del Festival</h2>
        <button onClick={load} style={{ color: '#A67C52' }} className="p-1.5 hover:opacity-70 transition-opacity">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Área del mapa */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab', backgroundColor: '#F0E6D3' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`,
              transformOrigin: 'center center',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              width="100%"
              height="100%"
              style={{ maxWidth: VB_W, overflow: 'visible' }}
              onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
            >
              {/* ── Fondo del recinto ─────────────────────────────────── */}
              <rect x="4" y="4" width={VB_W - 8} height={VB_H - 8} rx="16"
                fill="#F5ECD7" stroke="#D4B896" strokeWidth="2" />

              {/* ── Pasillos ─────────────────────────────────────────── */}
              <rect {...PASILLO_H} fill="#E8D5B7" />
              <text x={VB_W / 2} y={PASILLO_H.y + PASILLO_H.h / 2 + 4}
                textAnchor="middle" fill="#B8977A" fontSize="9" fontWeight="600" letterSpacing="1">
                PASILLO PRINCIPAL
              </text>
              <rect {...PASILLO_V} fill="#EAD9BC" />

              {/* ── Escenario ────────────────────────────────────────── */}
              <rect {...ESCENARIO} rx="10" fill="#DFC9A0" stroke="#C8A87A" strokeWidth="1.5" />
              <text x={ESCENARIO.x + ESCENARIO.w / 2} y={ESCENARIO.y + ESCENARIO.h / 2 - 6}
                textAnchor="middle" fill="#8B6030" fontSize="13" fontWeight="800">
                🎵
              </text>
              <text x={ESCENARIO.x + ESCENARIO.w / 2} y={ESCENARIO.y + ESCENARIO.h / 2 + 10}
                textAnchor="middle" fill="#8B6030" fontSize="10" fontWeight="700">
                ESCENARIO
              </text>

              {/* ── Zona VIP ─────────────────────────────────────────── */}
              <rect {...ZONA_VIP} rx="10" fill="#E8D5B7" stroke="#C8A87A" strokeWidth="1" strokeDasharray="4,3" />
              <text x={ZONA_VIP.x + ZONA_VIP.w / 2} y={ZONA_VIP.y + ZONA_VIP.h / 2 + 4}
                textAnchor="middle" fill="#A67C52" fontSize="10" fontWeight="700">
                ZONA VIP
              </text>

              {/* ── Entrada ──────────────────────────────────────────── */}
              <rect {...ENTRADA} rx="8" fill="#DFC9A0" stroke="#C8A87A" strokeWidth="1" />
              <text x={ENTRADA.x + ENTRADA.w / 2} y={ENTRADA.y + ENTRADA.h / 2 + 4}
                textAnchor="middle" fill="#8B6030" fontSize="9" fontWeight="700">
                ENTRADA
              </text>

              {/* ── Etiquetas de zona ─────────────────────────────────── */}
              <text x="84" y="13" textAnchor="middle" fill="#A67C52" fontSize="8" fontWeight="700" opacity="0.8">
                BARRAS
              </text>
              <text x="286" y="13" textAnchor="middle" fill="#A67C52" fontSize="8" fontWeight="700" opacity="0.8">
                FOOD TRUCKS
              </text>

              {/* ── Stands ──────────────────────────────────────────── */}
              {puestosConSlot.map(p => {
                const { slot } = p;
                const cs = COLOR_SAT(p.pedidos_activos);
                const isSelected = selected?.id === p.id;
                const nombreCorto = p.nombre.length > 16 ? p.nombre.slice(0, 15) + '…' : p.nombre;

                return (
                  <g key={p.id} onClick={(e) => { e.stopPropagation(); setSelected(isSelected ? null : p); }}
                     style={{ cursor: 'pointer' }}>
                    {/* Sombra */}
                    <rect x={slot.x + 2} y={slot.y + 3} width={slot.w} height={slot.h}
                      rx="10" fill="rgba(0,0,0,0.09)" />
                    {/* Cuerpo */}
                    <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h}
                      rx="10"
                      fill={p.abierto ? cs.fill : '#C4B5A5'}
                      stroke={isSelected ? '#1a1a1a' : cs.stroke}
                      strokeWidth={isSelected ? 2.5 : 1}
                      opacity={p.abierto ? 1 : 0.5}
                    />
                    {/* Nombre */}
                    <text x={slot.x + slot.w / 2} y={slot.y + slot.h / 2 - 5}
                      textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
                      {nombreCorto}
                    </text>
                    {/* Métricas */}
                    <text x={slot.x + slot.w / 2} y={slot.y + slot.h / 2 + 8}
                      textAnchor="middle" fill="rgba(255,255,255,0.88)" fontSize="8">
                      {p.pedidos_activos} pedidos · {Math.round(p.espera_min)}m espera
                    </text>
                    {/* Badge cerrado */}
                    {!p.abierto && (
                      <text x={slot.x + slot.w - 6} y={slot.y + 13}
                        textAnchor="end" fill="#fff" fontSize="7" fontWeight="800">
                        CERRADO
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Controles de zoom */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          <button onClick={zoomIn}
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-md border"
            style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#A67C52' }}>
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={zoomOut}
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-md border"
            style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#A67C52' }}>
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={reset}
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-md border text-[10px] font-bold"
            style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#A67C52' }}>
            1:1
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-4 py-2 border-t"
        style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}
      >
        {[
          { color: '#4CAF88', label: 'Libre'    },
          { color: '#F59E0B', label: 'Moderado' },
          { color: '#EF4444', label: 'Saturado' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#8B6650' }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Popup del puesto seleccionado */}
      {selected && (
        <div
          className="flex-shrink-0 border-t px-4 py-3"
          style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-extrabold text-sm" style={{ color: '#2C1810' }}>{selected.nombre}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: selected.abierto ? '#D1FAE5' : '#FEE2E2',
                    color: selected.abierto ? '#065F46' : '#991B1B',
                  }}>
                  {selected.abierto ? 'Abierto' : 'Cerrado'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: COLOR_SAT(selected.pedidos_activos).fill + '33',
                           color: COLOR_SAT(selected.pedidos_activos).stroke }}>
                  {COLOR_SAT(selected.pedidos_activos).label}
                </span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="hover:opacity-70 transition-opacity" style={{ color: '#A67C52' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { label: 'Pedidos activos', value: selected.pedidos_activos },
              { label: 'Espera media',    value: `${Math.round(selected.espera_min)}m` },
              { label: 'Ingresos hoy',   value: `${Number(selected.ingresos_hoy).toFixed(0)}€` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-2 text-center border"
                style={{ backgroundColor: '#FDF6EE', borderColor: '#E8D5C0' }}>
                <p className="text-sm font-extrabold" style={{ color: '#A67C52' }}>{value}</p>
                <p className="text-[9px]" style={{ color: '#8B6650' }}>{label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setSelected(null); navigate('stands'); }}
            className="w-full text-center text-xs font-bold py-2 rounded-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#A67C52', color: '#fff' }}
          >
            Ver detalle completo →
          </button>
        </div>
      )}
    </div>
  );
}

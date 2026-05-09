import { useState, useEffect, useCallback } from 'react';
import { getParametros, actualizarParametros, getStockMinimos, updateStockMinimo } from '../../api';
import { Save, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  festivalId: number;
}

interface StockPuestoItem {
  materia_prima_id: number;
  mp_nombre: string;
  unidad_medida: string;
  stock_minimo: number;
  stock_actual: number;
}

interface StockPuesto {
  puesto_id: number;
  puesto_nombre: string;
  items: StockPuestoItem[];
}

interface Parametros {
  umbral_cola: number;
  umbral_ventas_bajas: number;
  porcentaje_bajada: number;
  pricing_dinamico_activo: boolean;
  promociones_activas: boolean;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        position: 'relative',
        width: 44,
        height: 22,
        borderRadius: 11,
        backgroundColor: value ? '#C8956C' : '#D1C4B8',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background-color 0.25s',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'transform 0.25s',
        transform: value ? 'translateX(22px)' : 'translateX(0)',
        display: 'block',
      }} />
    </button>
  );
}

function NumberInput({ value, onChange, min = 1, max = 100, step = 1 }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
      }}
      className="w-20 text-center font-bold rounded-xl border-2 px-2 py-1.5 outline-none text-sm"
      style={{ borderColor: '#C8956C', color: '#2C1810', backgroundColor: '#fff' }}
    />
  );
}

function ParamRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0"
         style={{ borderColor: '#F1E8DE' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#2C1810' }}>{label}</p>
        {description && <p className="text-[11px] mt-0.5" style={{ color: '#8B6650' }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

function StockMinimoRow({ item, puestoId, onChange }: {
  item: StockPuestoItem; puestoId: number;
  onChange: (puestoId: number, mpId: number, val: number) => void;
}) {
  const [val, setVal] = useState(item.stock_minimo);
  const [saving, setSaving] = useState(false);
  const critico = item.stock_actual < item.stock_minimo;

  const handleBlur = async () => {
    if (val === item.stock_minimo) return;
    setSaving(true);
    try {
      await updateStockMinimo(puestoId, item.materia_prima_id, val);
      onChange(puestoId, item.materia_prima_id, val);
      toast.success(`${item.mp_nombre}: mínimo actualizado`);
    } catch {
      toast.error('Error al guardar');
      setVal(item.stock_minimo);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
         style={{ borderColor: '#F1E8DE' }}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {critico && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#EF4444' }} />}
        <div>
          <p className="text-xs font-semibold truncate" style={{ color: '#2C1810' }}>{item.mp_nombre}</p>
          <p className="text-[10px]" style={{ color: '#8B6650' }}>
            Actual: <span className="font-bold" style={{ color: critico ? '#EF4444' : '#10B981' }}>
              {item.stock_actual} {item.unidad_medida}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input
          type="number"
          min={0}
          step={item.unidad_medida === 'unidad' ? 1 : 0.5}
          value={val}
          onChange={e => setVal(parseFloat(e.target.value) || 0)}
          onBlur={handleBlur}
          disabled={saving}
          className="w-20 text-center font-bold rounded-xl border-2 px-2 py-1 outline-none text-xs"
          style={{ borderColor: '#C8956C', color: '#2C1810', backgroundColor: '#fff', opacity: saving ? 0.5 : 1 }}
        />
        <span className="text-[10px]" style={{ color: '#8B6650' }}>{item.unidad_medida}</span>
      </div>
    </div>
  );
}

function PuestoAccordion({ puesto, onItemChange }: {
  puesto: StockPuesto;
  onItemChange: (puestoId: number, mpId: number, val: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const criticos = puesto.items.filter(i => i.stock_actual < i.stock_minimo).length;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ backgroundColor: open ? '#FFF3E4' : '#fff' }}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold" style={{ color: '#2C1810' }}>{puesto.puesto_nombre}</p>
          {criticos > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: '#EF4444' }}>
              {criticos} crítico{criticos > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: '#C8956C' }} />
          : <ChevronDown className="w-4 h-4" style={{ color: '#C8956C' }} />
        }
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1" style={{ backgroundColor: '#FDFAF7' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#94A3B8' }}>
            Mínimo por materia prima (editar y perder foco para guardar)
          </p>
          {puesto.items.map(item => (
            <StockMinimoRow
              key={item.materia_prima_id}
              item={item}
              puestoId={puesto.puesto_id}
              onChange={onItemChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ConfigView({ festivalId }: Props) {
  const [params, setParams] = useState<Parametros>({
    umbral_cola: 5,
    umbral_ventas_bajas: 3,
    porcentaje_bajada: 10,
    pricing_dinamico_activo: true,
    promociones_activas: true,
  });
  const [loadingParams, setLoadingParams] = useState(true);
  const [savingParams, setSavingParams] = useState(false);

  const [stockPuestos, setStockPuestos] = useState<StockPuesto[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  const cargarParametros = useCallback(async () => {
    try {
      const data = await getParametros();
      setParams({
        umbral_cola:             Number(data.umbral_cola)             || 5,
        umbral_ventas_bajas:     Number(data.umbral_ventas_bajas)     || 3,
        porcentaje_bajada:       Number(data.porcentaje_bajada)       || 10,
        pricing_dinamico_activo: Boolean(data.pricing_dinamico_activo),
        promociones_activas:     Boolean(data.promociones_activas),
      });
    } catch {
      toast.error('Error al cargar parámetros');
    } finally {
      setLoadingParams(false);
    }
  }, []);

  const cargarStock = useCallback(async () => {
    setStockError(null);
    try {
      const data = await getStockMinimos(festivalId);
      setStockPuestos(data);
    } catch (e: any) {
      setStockError(e?.message || 'Error desconocido');
    } finally {
      setLoadingStock(false);
    }
  }, [festivalId]);

  useEffect(() => { cargarParametros(); cargarStock(); }, [cargarParametros, cargarStock]);

  const handleGuardar = async () => {
    setSavingParams(true);
    try {
      await actualizarParametros({
        umbral_cola:             params.umbral_cola,
        umbral_ventas_bajas:     params.umbral_ventas_bajas,
        porcentaje_bajada:       params.porcentaje_bajada,
        pricing_dinamico_activo: params.pricing_dinamico_activo ? 1 : 0,
        promociones_activas:     params.promociones_activas ? 1 : 0,
      });
      toast.success('Parámetros guardados');
    } catch {
      toast.error('Error al guardar parámetros');
    } finally {
      setSavingParams(false);
    }
  };

  const handleStockChange = (puestoId: number, mpId: number, val: number) => {
    setStockPuestos(prev => prev.map(p =>
      p.puesto_id !== puestoId ? p : {
        ...p,
        items: p.items.map(i => i.materia_prima_id !== mpId ? i : { ...i, stock_minimo: val }),
      }
    ));
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#FDF6EE' }}>
      <div className="px-4 py-4 space-y-5 pb-10">

        {/* Header */}
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#2C1810' }}>Ajustes</h2>
          <p className="text-[11px]" style={{ color: '#8B6650' }}>Parámetros del motor de decisiones automáticas</p>
        </div>

        {/* Parámetros globales */}
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: '#E8D5C0' }}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#C8956C' }}>
            Decisiones automáticas
          </h3>

          {loadingParams ? (
            <p className="text-sm text-center py-4" style={{ color: '#C8956C', opacity: 0.5 }}>Cargando…</p>
          ) : (
            <>
              <ParamRow
                label="Cola máxima (cerrar barra)"
                description="Pedidos activos simultáneos antes de pausar nuevos pedidos"
              >
                <NumberInput value={params.umbral_cola} min={1} max={50}
                  onChange={v => setParams(p => ({ ...p, umbral_cola: v }))} />
              </ParamRow>

              <ParamRow
                label="Ventas mínimas (test A/B)"
                description="Producto con menos ventas que este umbral se incluye en test de descuento"
              >
                <NumberInput value={params.umbral_ventas_bajas} min={1} max={20}
                  onChange={v => setParams(p => ({ ...p, umbral_ventas_bajas: v }))} />
              </ParamRow>

              <ParamRow
                label="% descuento en test A/B"
                description="Porcentaje de bajada aplicado al producto más lento en el test"
              >
                <div className="flex items-center gap-1">
                  <NumberInput value={params.porcentaje_bajada} min={1} max={50}
                    onChange={v => setParams(p => ({ ...p, porcentaje_bajada: v }))} />
                  <span className="text-sm font-bold" style={{ color: '#8B6650' }}>%</span>
                </div>
              </ParamRow>

              <ParamRow
                label="Tests A/B automáticos"
                description="El sistema propone descuentos para productos con bajas ventas"
              >
                <Toggle value={params.pricing_dinamico_activo}
                  onChange={v => setParams(p => ({ ...p, pricing_dinamico_activo: v }))} />
              </ParamRow>

              <ParamRow
                label="Promociones automáticas"
                description="El sistema detecta y propone activar promociones inactivas"
              >
                <Toggle value={params.promociones_activas}
                  onChange={v => setParams(p => ({ ...p, promociones_activas: v }))} />
              </ParamRow>

              <button
                onClick={handleGuardar}
                disabled={savingParams}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#C8956C' }}
              >
                <Save className="w-4 h-4" />
                {savingParams ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </>
          )}
        </div>

        {/* Stock mínimo por puesto */}
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#C8956C' }}>
            Stock mínimo por puesto
          </h3>
          <p className="text-[11px] mb-3" style={{ color: '#8B6650' }}>
            Cuando el stock baja de este umbral el sistema genera una alerta de reposición.
            Edita el valor y haz clic fuera para guardar.
          </p>

          {loadingStock ? (
            <p className="text-sm text-center py-4" style={{ color: '#C8956C', opacity: 0.5 }}>Cargando…</p>
          ) : stockError ? (
            <p className="text-xs text-center py-4 font-semibold" style={{ color: '#EF4444' }}>
              Error: {stockError}
            </p>
          ) : stockPuestos.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#C8956C', opacity: 0.4 }}>
              No hay stock configurado para este festival.<br/>
              <span className="text-[11px]">Los puestos deben tener materias primas asignadas en stock_puesto.</span>
            </p>
          ) : (
            <div className="space-y-2">
              {stockPuestos.map(p => (
                <PuestoAccordion key={p.puesto_id} puesto={p} onItemChange={handleStockChange} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

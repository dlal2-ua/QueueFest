import { useEffect, useState } from 'react';
import { getHeatmap, getPedidosPuesto } from '../api';
import { BarChart2, X } from 'lucide-react';

type PuestoInfo = {
  pedidos_activos: number;
  espera_actual_min: number;
  ingresos_hoy: number;
};

type HeatmapData = Record<string, PuestoInfo>;

const METRIC_CONFIG = {
  pedidos_activos:   { label: 'Pedidos activos', unit: ''    },
  espera_actual_min: { label: 'Espera (min)',     unit: 'min' },
  ingresos_hoy:      { label: 'Ingresos hoy',    unit: '€'   },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

export default function Heatmap() {
  const [data, setData] = useState<HeatmapData>({} as HeatmapData);
  const [metric, setMetric] = useState<MetricKey>('pedidos_activos');
  const [selectedPuesto, setSelectedPuesto] = useState<string | null>(null);
  const [puestoPedidos, setPuestoPedidos] = useState<any[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getHeatmap();
        setData(res);
      } catch (e) {
        console.error('Error loading heatmap', e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const puestos = Object.entries(data).sort(([a], [b]) => Number(a) - Number(b));
  const values = puestos.map(([, v]) => v[metric] ?? 0);
  const max = Math.max(...values, 1);

  const getBarColor = (val: number) => {
    const r = val / max;
    if (r < 0.33) return '#10b981';
    if (r < 0.66) return '#f59e0b';
    return '#ef4444';
  };

  const getSaturationInfo = (val: number) => {
    const r = val / max;
    if (r < 0.33) return { label: 'Libre',    color: 'text-emerald-600' };
    if (r < 0.66) return { label: 'Moderado', color: 'text-amber-600'   };
    return              { label: 'Saturado',  color: 'text-red-600'     };
  };

  const handlePuestoClick = async (id: string) => {
    setSelectedPuesto(id);
    setLoadingPedidos(true);
    try {
      const res = await getPedidosPuesto(Number(id));
      setPuestoPedidos(res);
    } catch (e) {
      console.error('Error loading orders', e);
    } finally {
      setLoadingPedidos(false);
    }
  };

  const cfg = METRIC_CONFIG[metric];

  return (
    <div className="p-4">
      {/* Título + leyenda */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-800 text-sm font-bold flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-violet-500" />
          Mapa de calor
        </h2>
        <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Libre</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Mod.</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Sat.</span>
        </div>
      </div>

      {/* Selector de métrica */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {(Object.keys(METRIC_CONFIG) as MetricKey[]).map(k => (
          <button
            key={k}
            onClick={() => setMetric(k)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              metric === k
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {METRIC_CONFIG[k].label}
          </button>
        ))}
      </div>

      {/* Barras por puesto */}
      {puestos.length === 0 ? (
        <p className="text-gray-400 text-xs text-center py-4">Sin datos de puestos</p>
      ) : (
        <div className="space-y-2">
          {puestos.map(([id, info]) => {
            const val = info[metric] ?? 0;
            const ratio = val / max;
            const barColor = getBarColor(val);
            const { label, color } = getSaturationInfo(val);
            return (
              <button
                key={id}
                onClick={() => handlePuestoClick(id)}
                className="w-full flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <span className="text-gray-400 text-[11px] font-mono w-6 text-right flex-shrink-0">
                  #{id}
                </span>
                <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{
                      width: `${Math.max(ratio * 100, 4)}%`,
                      background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                    }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600">
                    {val}{cfg.unit}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold w-14 text-right flex-shrink-0 ${color}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Panel de detalle */}
      {selectedPuesto && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-white">
            <h3 className="text-gray-800 text-sm font-bold">Puesto #{selectedPuesto}</h3>
            <button onClick={() => setSelectedPuesto(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto p-3">
            {loadingPedidos ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : puestoPedidos.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">No hay pedidos registrados</p>
            ) : (
              <ul className="space-y-2">
                {puestoPedidos.map((p: any) => {
                  const estadoStyle =
                    p.estado === 'entregado' ? 'bg-gray-100 text-gray-500' :
                    p.estado === 'cancelado' ? 'bg-red-100 text-red-600' :
                    'bg-green-100 text-green-700';
                  return (
                    <li key={p.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                      <div>
                        <span className="text-gray-800 text-xs font-bold">#{p.id}</span>
                        <span className="text-gray-400 text-[10px] ml-2">
                          {new Date(p.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoStyle}`}>
                          {p.estado.toUpperCase()}
                        </span>
                        <span className="text-gray-800 text-xs font-bold">{p.total}€</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

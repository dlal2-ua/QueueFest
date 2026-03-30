import React, { useEffect, useState } from 'react';
import { getHeatmap, getPedidosPuesto } from '../api';
import { BarChart2 } from 'lucide-react';

type PuestoInfo = {
    pedidos_activos: number;
    espera_actual_min: number;
    ingresos_hoy: number;
};

type HeatmapData = Record<string, PuestoInfo>;

export default function Heatmap() {
    const [data, setData] = useState<HeatmapData>({} as HeatmapData);
    const [metric, setMetric] = useState<keyof PuestoInfo>('pedidos_activos');
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
        const interval = setInterval(fetchData, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const puestos = Object.entries(data).sort(([a], [b]) => Number(a) - Number(b));
    const values = puestos.map(([, v]) => v[metric] ?? 0);
    const max = Math.max(...values, 1);
    const getColor = (val: number) => {
        const ratio = val / max;
        const red = Math.round(255 * ratio);
        const green = Math.round(255 * (1 - ratio));
        return `rgb(${red},${green},0)`;
    };

    const handlePuestoClick = async (id: string) => {
        setSelectedPuesto(id);
        setLoadingPedidos(true);
        try {
            const res = await getPedidosPuesto(Number(id));
            // Filter to only active orders by default. But gestor might want to see all or just active.
            // Returning all orders sorted by newest first.
            setPuestoPedidos(res);
        } catch (e) {
            console.error('Error loading orders', e);
        } finally {
            setLoadingPedidos(false);
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Mapa de calor de puestos
            </h2>
            <div className="mb-2">
                <label className="mr-2 font-medium">Métrica:</label>
                <select
                    value={metric}
                    onChange={e => setMetric(e.target.value as keyof PuestoInfo)}
                    className="border rounded p-1"
                >
                    <option value="pedidos_activos">Pedidos activos</option>
                    <option value="espera_actual_min">Espera media (min)</option>
                    <option value="ingresos_hoy">Ingresos hoy (€)</option>
                </select>
            </div>
            <div
                className="grid gap-1"
                style={{
                    gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(puestos.length))}, minmax(0, 1fr))`,
                }}
            >
                {puestos.map(([id, info]) => (
                    <div
                        key={id}
                        onClick={() => handlePuestoClick(id)}
                        className="flex items-center justify-center text-sm font-medium text-white rounded shadow cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                            backgroundColor: getColor(info[metric] ?? 0),
                            height: '60px',
                        }}
                        title={`Puesto ${id}\nPedidos: ${info.pedidos_activos}\nEspera: ${info.espera_actual_min} min\nIngresos: €${info.ingresos_hoy}`}
                    >
                        {id}
                    </div>
                ))}
            </div>

            {selectedPuesto && (
                <div className="mt-4 p-4 border rounded bg-gray-50 h-64 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold">Pedidos Puesto {selectedPuesto}</h3>
                        <button onClick={() => setSelectedPuesto(null)} className="text-red-500 text-sm font-medium hover:underline">
                            Cerrar
                        </button>
                    </div>
                    {loadingPedidos ? (
                        <p className="text-sm text-gray-500 text-center py-4">Cargando...</p>
                    ) : puestoPedidos.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No hay pedidos registrados</p>
                    ) : (
                        <ul className="space-y-2">
                            {puestoPedidos.map((p: any) => (
                                <li key={p.id} className="text-sm bg-white p-3 border rounded shadow-sm flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold">#{p.id}</span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${p.estado === 'entregado' ? 'bg-gray-100 text-gray-700' :
                                            p.estado === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {p.estado.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-gray-500 text-xs">
                                            {new Date(p.creado_en).toLocaleString()}
                                        </span>
                                        <span className="font-bold">{p.total}€</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

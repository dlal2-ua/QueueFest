import { useEffect, useState } from 'react';
import { getAdminProductos, getMisPuestosOperador, buildImageUrl, setProductoAgotado } from '../api';
import { RefreshCw } from 'lucide-react';

type Producto = {
    id: number;
    puesto_id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    precio_dinamico?: number;
    stock?: number;
    activo: number | boolean;
    foto_url?: string | null;
};

export function OperatorMenuScreen() {
    const [puestoId, setPuestoId] = useState<number | null>(null);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

    const cargarDatos = async () => {
        try {
            setError(null);
            let currentPuestoId = puestoId;

            if (!currentPuestoId) {
                const puestos = await getMisPuestosOperador();
                if (!Array.isArray(puestos) || puestos.length === 0) {
                    setProductos([]);
                    setLoading(false);
                    return;
                }
                currentPuestoId = Number(puestos[0].id);
                setPuestoId(currentPuestoId);
            }

            const data = await getAdminProductos(currentPuestoId);
            setProductos(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e?.message || 'Error cargando menú');
            setProductos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const onToggleAgotado = async (producto: Producto, agotado: boolean) => {
        setSavingId(producto.id);

        setProductos((prev) =>
            prev.map((p) =>
                p.id === producto.id ? { ...p, activo: agotado ? 0 : 1 } : p
            )
        );

        try {
            await setProductoAgotado(producto, agotado);
        } catch (e) {
            setProductos((prev) =>
                prev.map((p) =>
                    p.id === producto.id ? { ...p, activo: producto.activo } : p
                )
            );
        } finally {
            setSavingId(null);
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
            <p className="text-sm" style={{ color: '#C8956C', opacity: 0.6 }}>Cargando menú...</p>
        </div>
    );

    if (error) return (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
            <p className="text-sm text-red-600">{error}</p>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

            {/* Header */}
            <div
                className="flex-shrink-0 flex items-center justify-between px-4 py-3"
                style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)', boxShadow: '0 2px 8px rgba(166,124,82,0.20)' }}
            >
                <h1 className="text-sm font-extrabold text-white">Menú del puesto</h1>
                <button
                    onClick={cargarDatos}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                >
                    <RefreshCw className="w-3 h-3" />
                    Actualizar
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 pb-4 space-y-2">
                {productos.length === 0 ? (
                    <p className="text-center text-sm py-10" style={{ color: '#C8956C', opacity: 0.6 }}>
                        No hay productos para este puesto.
                    </p>
                ) : (
                    productos.map((p) => {
                        const agotado = Number(p.activo) === 0;
                        const imgSrc = buildImageUrl(p.foto_url);
                        const errorKey = `${p.id}-${p.foto_url || ''}`;
                        const hasError = imageErrorMap[errorKey] === true;

                        console.log('Producto', p.id, 'foto_url=', p.foto_url, 'imgSrc=', imgSrc);

                        return (
                            <div
                                key={p.id}
                                className="rounded-2xl border"
                                style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', padding: '12px 14px' }}
                            >
                                <div className="flex gap-3">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#E8D5C0' }}>
                                        {imgSrc && !hasError ? (
                                            <img
                                                src={imgSrc}
                                                alt={p.nombre}
                                                className="w-full h-full object-cover"
                                                onLoad={() => {
                                                    setImageErrorMap(prev => {
                                                        if (!prev[errorKey]) return prev;
                                                        const copy = { ...prev };
                                                        delete copy[errorKey];
                                                        return copy;
                                                    });
                                                }}
                                                onError={() => {
                                                    console.error('Error cargando imagen', { id: p.id, foto_url: p.foto_url, imgSrc });
                                                    setImageErrorMap(prev => ({ ...prev, [errorKey]: true }));
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: '#C8956C' }}>
                                                Sin foto
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h2 className="text-xs font-extrabold truncate" style={{ color: '#2C1810' }}>{p.nombre}</h2>
                                                <p className="text-[11px] line-clamp-2 mt-0.5" style={{ color: '#8B6650' }}>{p.descripcion}</p>
                                            </div>
                                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: '#A67C52' }}>
                                                {Number(p.precio).toFixed(2)}€
                                            </span>
                                        </div>

                                        <div className="mt-2.5 flex items-center justify-between">
                                            <span className="text-[11px] font-semibold" style={{ color: agotado ? '#EF4444' : '#4CAF88' }}>
                                                {agotado ? 'Agotado' : 'Disponible'}
                                            </span>

                                            <button
                                                type="button"
                                                disabled={savingId === p.id}
                                                onClick={() => onToggleAgotado(p, !agotado)}
                                                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                                                style={{ backgroundColor: agotado ? '#EF4444' : '#4CAF88', opacity: savingId === p.id ? 0.6 : 1 }}
                                                aria-label={`Marcar ${p.nombre} como ${agotado ? 'disponible' : 'agotado'}`}
                                            >
                                                <span
                                                    className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                                    style={{ transform: agotado ? 'translateX(4px)' : 'translateX(24px)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

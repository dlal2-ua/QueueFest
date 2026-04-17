import { useEffect, useState } from 'react';
import { getAdminProductos, getMisPuestosOperador, buildImageUrl, setProductoAgotado } from '../api';

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

        // Optimista (UI inmediata)
        setProductos((prev) =>
            prev.map((p) =>
                p.id === producto.id ? { ...p, activo: agotado ? 0 : 1 } : p
            )
        );

        try {
            await setProductoAgotado(producto, agotado);
        } catch (e) {
            // rollback si falla
            setProductos((prev) =>
                prev.map((p) =>
                    p.id === producto.id ? { ...p, activo: producto.activo } : p
                )
            );
        } finally {
            setSavingId(null);
        }
    };

    if (loading) return <div className="p-4">Cargando menú...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="p-4 pb-24">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Menú del puesto</h1>
                <button
                    onClick={cargarDatos}
                    className="text-sm bg-white border border-gray-300 px-3 py-1 rounded-full shadow-sm hover:bg-gray-50"
                >
                    Actualizar
                </button>
            </div>

            {productos.length === 0 ? (
                <p className="text-gray-600">No hay productos para este puesto.</p>
            ) : (
                <div className="space-y-3">
                    {productos.map((p) => {
                        const agotado = Number(p.activo) === 0;
                        const imgSrc = buildImageUrl(p.foto_url);
                        const errorKey = `${p.id}-${p.foto_url || ''}`;
                        const hasError = imageErrorMap[errorKey] === true;

                        console.log('Producto', p.id, 'foto_url=', p.foto_url, 'imgSrc=', imgSrc);

                        return (
                            <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm border">
                                <div className="flex gap-3">
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                        {imgSrc && !hasError ? (
                                            <img
                                                src={imgSrc}
                                                alt={p.nombre}
                                                className="w-full h-full object-cover"
                                                onLoad={() => {
                                                    // si cargó, limpiamos error previo
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
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                                Sin foto
                                            </div>
                                        )}
                                    </div>


                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h2 className="font-semibold truncate">{p.nombre}</h2>
                                                <p className="text-sm text-gray-500 line-clamp-2">{p.descripcion}</p>
                                            </div>
                                            <span className="font-semibold text-sm whitespace-nowrap">
                                                {Number(p.precio).toFixed(2)}€
                                            </span>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between">
                                            <span className={`text-xs font-medium ${agotado ? 'text-red-600' : 'text-green-600'}`}>
                                                {agotado ? 'Agotado' : 'Disponible'}
                                            </span>

                                            {/* Switch deslizante */}
                                            <button
                                                type="button"
                                                disabled={savingId === p.id}
                                                onClick={() => onToggleAgotado(p, !agotado)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${agotado ? 'bg-red-500' : 'bg-green-500'
                                                    } ${savingId === p.id ? 'opacity-60' : ''}`}
                                                aria-label={`Marcar ${p.nombre} como ${agotado ? 'disponible' : 'agotado'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${agotado ? 'translate-x-1' : 'translate-x-6'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
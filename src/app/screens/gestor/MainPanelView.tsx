import { useEffect, useState, useCallback } from 'react';
import { getEstadisticas } from '../../api';
import { useGestorSSE } from '../../hooks/useGestorSSE';
import { ChevronLeft, Store, Euro, Map, ShoppingBag, Clock, LogOut, Tag } from 'lucide-react';
import { formatWait } from '../../utils/formatTime';

interface Props {
  festivalId: number;
  festivalNombre: string;
  onChangeFestival: () => void;
  onLogout: () => void;
  navigate: (view: string) => void;
}

export function MainPanelView({ festivalId, festivalNombre, onChangeFestival, onLogout, navigate }: Props) {
  const [stats, setStats] = useState<any>(null);

  const cargarStats = useCallback(async () => {
    try { setStats(await getEstadisticas(festivalId)); }
    catch (e) { console.error(e); }
  }, [festivalId]);

  useEffect(() => {
    cargarStats();
    const iv = setInterval(cargarStats, 30000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line
  useGestorSSE(festivalId, (type) => { if (type === 'order_changed') cargarStats(); });

  const metricas = [
    { icon: Store,       valor: stats?.puestos_abiertos ?? '—', label: 'Puestos activos',   color: '#A67C52' },
    { icon: Euro,        valor: stats?.ingresos_hoy !== undefined ? `${Number(stats.ingresos_hoy).toFixed(0)}€` : '—', label: 'Ingresos hoy', color: '#4CAF88' },
    { icon: ShoppingBag, valor: stats?.pedidos_hoy ?? '—',       label: 'Pedidos hoy',      color: '#6366F1' },
    { icon: Clock,       valor: stats?.espera_media !== undefined ? formatWait(Number(stats.espera_media)) : '—', label: 'Espera media', color: '#F59E0B' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* Header — sticky top */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{
          backgroundColor: '#FFF3E4',
          borderBottom: '1px solid #E8D5C0',
          boxShadow: '0 2px 8px rgba(166,124,82,0.08)',
        }}
      >
        <button
          onClick={onChangeFestival}
          className="flex items-center gap-1 hover:opacity-70 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: '#A67C52' }} />
          <span className="text-xs font-semibold" style={{ color: '#A67C52' }}>Cambiar</span>
        </button>

        <h2
          className="text-sm font-extrabold truncate max-w-[140px]"
          style={{ color: '#A67C52' }}
        >
          {festivalNombre}
        </h2>

        <button
          onClick={onLogout}
          className="flex items-center gap-1 hover:opacity-70 transition-opacity"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" style={{ color: '#A67C52' }} />
          <span className="text-xs font-semibold" style={{ color: '#A67C52' }}>Salir</span>
        </button>
      </div>

      {/* Contenido central — columna vertical única centrada */}
      <div className="flex-1 overflow-y-auto">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            padding: '20px 16px',
            maxWidth: 320,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* 1 — Botón Mapa (pill, ancho completo) */}
          <button
            onClick={() => navigate('map')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #C8956C, #A67C52)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 50,
              padding: '16px 24px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(168,124,82,0.35)',
              transition: 'transform 0.15s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Map style={{ width: 20, height: 20 }} />
            Ver mapa del festival
          </button>

          {/* 2 — Fila de 2 métricas */}
          <button
            onClick={() => navigate('promotions')}
            style={{
              width: '100%',
              backgroundColor: '#FFF3E4',
              color: '#A67C52',
              fontWeight: 800,
              fontSize: 14,
              borderRadius: 18,
              padding: '14px 18px',
              border: '1px solid #E8D5C0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(166,124,82,0.10)',
            }}
          >
            <Tag style={{ width: 18, height: 18 }} />
            Gestionar promociones
          </button>

          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {metricas.slice(0, 2).map(({ icon: Icon, valor, label, color }) => (
              <div
                key={label}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #E8D5C0',
                  borderRadius: 20,
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 20px rgba(166,124,82,0.08)',
                }}
              >
                <Icon style={{ width: 22, height: 22, color }} />
                <p style={{ fontSize: 28, fontWeight: 800, color: '#2C1810', lineHeight: 1 }}>{valor}</p>
                <p style={{ fontSize: 11, color: '#8B6650', textAlign: 'center' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* 3 — Segunda fila de 2 métricas */}
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {metricas.slice(2, 4).map(({ icon: Icon, valor, label, color }) => (
              <div
                key={label}
                style={{
                  backgroundColor: '#FFF3E4',
                  border: '1px solid #E8D5C0',
                  borderRadius: 20,
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 20px rgba(166,124,82,0.08)',
                }}
              >
                <Icon style={{ width: 22, height: 22, color }} />
                <p style={{ fontSize: 28, fontWeight: 800, color: '#2C1810', lineHeight: 1 }}>{valor}</p>
                <p style={{ fontSize: 11, color: '#8B6650', textAlign: 'center' }}>{label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { getFestivalesPublicos } from '../../api';
import { Calendar, ArrowRight, ChevronDown, Check } from 'lucide-react';

interface Props {
  onEnter: (festivalId: number, nombre: string) => void;
}

export function WelcomeView({ onEnter }: Props) {
  const [festivales, setFestivales] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const saved = localStorage.getItem('gestorFestivalId');
    return saved ? Number(saved) : null;
  });
  const [open, setOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFestivalesPublicos()
      .then(data => { if (Array.isArray(data)) setFestivales(data); })
      .catch(console.error);
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedFestival = festivales.find(f => f.id === selectedId);

  const handleEnter = () => {
    if (!selectedFestival) return;
    setEntering(true);
    localStorage.setItem('gestorFestivalId', String(selectedFestival.id));
    setTimeout(() => onEnter(selectedFestival.id, selectedFestival.nombre), 300);
  };

  const select = (id: number) => { setSelectedId(id); setOpen(false); };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10"
         style={{ backgroundColor: '#000000' }}>

      {/* Eyebrow */}
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4"
         style={{ color: '#FF6B35' }}>
        Panel del Gestor
      </p>

      {/* Title */}
      <h1 className="text-center text-3xl font-extrabold leading-tight mb-3"
          style={{ color: '#FF6B35' }}>
        ¿Qué festival vamos a<br />bordar hoy?
      </h1>

      {/* Subtitle */}
      <p className="text-sm mb-8" style={{ color: '#888888' }}>
        Selecciona tu evento para comenzar
      </p>

      {/* Separator */}
      <div className="w-10 h-0.5 rounded-full mb-8" style={{ backgroundColor: '#FF6B35' }} />

      {/* Custom dropdown */}
      <div className="w-full max-w-xs" ref={dropRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 border transition-all"
          style={{
            backgroundColor: '#1A1A1A',
            borderColor: open ? '#FF6B35' : '#333333',
            color: selectedFestival ? '#FFFFFF' : '#666666',
          }}
        >
          <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: '#FF6B35' }} />
          <span className="flex-1 text-left text-sm font-semibold truncate">
            {selectedFestival ? selectedFestival.nombre : 'Elige un festival…'}
          </span>
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
            style={{ color: '#FF6B35', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {/* Dropdown list */}
        {open && (
          <div
            className="absolute left-0 right-0 rounded-2xl border overflow-hidden"
            style={{
              top: 'calc(100% + 8px)',
              backgroundColor: '#1A1A1A',
              borderColor: '#FF6B35',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              zIndex: 50,
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {festivales.length === 0 ? (
              <div className="px-5 py-4 text-sm" style={{ color: '#666' }}>Cargando…</div>
            ) : (
              festivales.map(f => {
                const isSelected = f.id === selectedId;
                return (
                  <button
                    key={f.id}
                    onClick={() => select(f.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,107,53,0.18)' : 'transparent',
                      color: isSelected ? '#FF6B35' : '#CCCCCC',
                      borderBottom: '1px solid #282828',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#252525'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <span className="flex-1 text-sm font-semibold">
                      {f.nombre}
                      {!f.activo && (
                        <span className="ml-2 text-[10px] font-normal" style={{ color: '#555' }}>(inactivo)</span>
                      )}
                    </span>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#FF6B35' }} />}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Enter button */}
        <div className={`mt-4 transition-all duration-300 ${selectedId ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
          <button
            onClick={handleEnter}
            disabled={entering || !selectedId}
            className="w-full py-4 rounded-full text-base font-extrabold tracking-wide
                       transition-transform active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(90deg, #FF6B35, #FF9A00)', color: '#000000' }}
          >
            {entering ? 'Cargando…' : (
              <><span>Entrar al festival</span><ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

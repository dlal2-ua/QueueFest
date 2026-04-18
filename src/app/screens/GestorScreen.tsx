// GestorScreen.tsx — Phone frame + multi-view router for the gestor role
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getModoAuto, setModoAuto } from '../api';
import { toast } from 'sonner';
import { Map, CheckSquare, Home, LayoutGrid } from 'lucide-react';

import { WelcomeView }   from './gestor/WelcomeView';
import { MainPanelView } from './gestor/MainPanelView';
import { MapView }       from './gestor/MapView';
import { DecisionsView } from './gestor/DecisionsView';
import { StandsView }    from './gestor/StandsView';

type View = 'welcome' | 'main' | 'map' | 'decisions' | 'stands';

const BOTTOM_NAV: { id: View; icon: typeof Map }[] = [
  { id: 'map',       icon: Map         },
  { id: 'decisions', icon: CheckSquare },
  { id: 'main',      icon: Home        },
  { id: 'stands',    icon: LayoutGrid  },
];

export function GestorScreen() {
  const { logout } = useAuth();

  const [view, setView]               = useState<View>('welcome');
  const [festivalId, setFestivalId]   = useState<number | null>(() => {
    const s = localStorage.getItem('gestorFestivalId');
    return s ? Number(s) : null;
  });
  const [festivalNombre, setFestivalNombre] = useState('');
  const [modoAuto, setModoAutoState]  = useState(true);

  // Set orange body background
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#FF6B35';
    document.body.style.margin = '0';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  // Load auto mode when festival is set
  useEffect(() => {
    if (!festivalId) return;
    getModoAuto(festivalId)
      .then(d => setModoAutoState(d.modo_auto))
      .catch(console.error);
  }, [festivalId]);

  const handleToggleModo = useCallback(async () => {
    if (!festivalId) return;
    const nuevo = !modoAuto;
    setModoAutoState(nuevo);
    try {
      await setModoAuto(festivalId, nuevo);
      toast.success(`${nuevo ? 'Automatic' : 'Manual'} mode activated`);
    } catch {
      toast.warning('Server not updated. Mode changed locally.');
    }
  }, [festivalId, modoAuto]);

  const handleFestivalEnter = (id: number, nombre: string) => {
    setFestivalId(id);
    setFestivalNombre(nombre);
    setView('main');
  };

  const navigate = (v: string) => setView(v as View);

  const showBottomNav = view !== 'welcome';

  return (
    // Orange browser background + centered phone
    <div
      className="min-h-screen flex items-start justify-center md:py-6 md:px-4"
      style={{ backgroundColor: '#FF6B35' }}
    >
      {/* ── Phone mockup frame ─────────────────────────────────────────── */}
      <div
        className="
          phone-frame
          relative w-full min-h-screen flex flex-col overflow-hidden
          md:min-h-0 md:w-[360px]
          md:rounded-[45px]
          md:border-[10px] md:border-[#1a1a1a]
        "
        style={{ backgroundColor: view === 'welcome' ? '#000000' : '#FDF6EE' }}
      >
        {/* Notch — desktop only */}
        <div
          className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 z-50"
          style={{ width: 110, height: 28, backgroundColor: '#1a1a1a', borderRadius: '0 0 18px 18px' }}
        />

        {/* Status bar — desktop only */}
        <div
          className="hidden md:flex items-center justify-between px-6 pt-1.5 pb-0 h-8 flex-shrink-0"
          style={{ backgroundColor: view === 'welcome' ? '#000000' : '#FFF3E4' }}
        >
          <span className="text-[10px] font-semibold" style={{ color: view === 'welcome' ? '#FF6B35' : '#C8956C' }}>9:41</span>
          <div className="w-20" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-sm border" style={{ borderColor: view === 'welcome' ? '#FF6B35' : '#C8956C' }}>
              <div className="w-1/2 h-full" style={{ backgroundColor: view === 'welcome' ? '#FF6B35' : '#C8956C' }} />
            </div>
          </div>
        </div>

        {/* ── View content ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {view === 'welcome' && (
            <WelcomeView onEnter={handleFestivalEnter} />
          )}

          {view === 'main' && festivalId && (
            <MainPanelView
              festivalId={festivalId}
              festivalNombre={festivalNombre}
              modoAuto={modoAuto}
              onToggleModo={handleToggleModo}
              onChangeFestival={() => setView('welcome')}
              onLogout={logout}
              navigate={navigate}
            />
          )}

          {view === 'map' && festivalId && (
            <MapView
              festivalId={festivalId}
              festivalNombre={festivalNombre}
              navigate={navigate}
            />
          )}

          {view === 'decisions' && festivalId && (
            <DecisionsView
              festivalId={festivalId}
              festivalNombre={festivalNombre}
              modoAuto={modoAuto}
            />
          )}

          {view === 'stands' && festivalId && (
            <StandsView festivalId={festivalId} navigate={navigate} />
          )}
        </div>

        {/* ── Bottom Navigation Bar ────────────────────────────────────── */}
        {showBottomNav && (
          <div
            className="flex-shrink-0 flex items-center border-t"
            style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', height: 66 }}
          >
            {BOTTOM_NAV.map(({ id, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
                  style={{ height: '100%' }}
                >
                  <Icon
                    className={`transition-all ${id === 'main' ? 'w-7 h-7' : 'w-5 h-5'}`}
                    style={{ color: active ? '#A67C52' : '#C4B5A5' }}
                  />
                  {/* Dot indicator */}
                  <div
                    className="w-1 h-1 rounded-full transition-all"
                    style={{ backgroundColor: active ? '#A67C52' : 'transparent' }}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Home indicator — desktop only */}
        <div
          className="hidden md:flex justify-center items-center py-1.5 flex-shrink-0"
          style={{ backgroundColor: view === 'welcome' ? '#000000' : '#FFF3E4' }}
        >
          <div className="w-24 h-1 rounded-full" style={{ backgroundColor: view === 'welcome' ? '#333' : 'rgba(0,0,0,0.15)' }} />
        </div>
      </div>

      {/* CSS: sombra y alto del marco solo en desktop */}
      <style>{`
        @media (min-width: 768px) {
          .phone-frame {
            height: min(840px, 93vh);
            box-shadow: 0 0 0 2px #333, 0 30px 80px rgba(0,0,0,0.50), inset 0 0 0 1px #555;
          }
        }
      `}</style>
    </div>
  );
}

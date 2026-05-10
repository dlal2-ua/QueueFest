// GestorScreen.tsx — Desktop sidebar + mobile bottom nav router for gestor role
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getModoAuto, setModoAuto } from '../api';
import { toast } from 'sonner';
import { Bot, Home, LayoutGrid, Tag, LogOut, Settings2, LayoutPanelLeft } from 'lucide-react';

import { WelcomeView }    from './gestor/WelcomeView';
import { MainPanelView }  from './gestor/MainPanelView';
import { StandsView }     from './gestor/StandsView';
import { PromotionsView } from './gestor/PromotionsView';
import { BotDashboardView } from './gestor/BotDashboardView';
import { ConfigView }       from './gestor/ConfigView';
import { SplitView }        from './gestor/SplitView';

type View = 'welcome' | 'main' | 'stands' | 'promotions' | 'bot' | 'config' | 'split';

const NAV_ITEMS: { id: View; icon: typeof Home; label: string }[] = [
  { id: 'split',      icon: LayoutPanelLeft, label: 'Mapa + Decisiones' },
  { id: 'main',       icon: Home,            label: 'Inicio'            },
  { id: 'stands',     icon: LayoutGrid,      label: 'Puestos'           },
  { id: 'promotions', icon: Tag,             label: 'Promociones'       },
  { id: 'bot',        icon: Bot,             label: 'Bot'               },
  { id: 'config',     icon: Settings2,       label: 'Ajustes'           },
];

export function GestorScreen() {
  const { logout } = useAuth();

  const [view, setView]             = useState<View>('welcome');
  const [festivalId, setFestivalId] = useState<number | null>(() => {
    const s = localStorage.getItem('gestorFestivalId');
    return s ? Number(s) : null;
  });
  const [festivalNombre, setFestivalNombre] = useState('');
  const [modoAuto, setModoAutoState]        = useState(true);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.backgroundColor = '';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

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

  // ── Welcome screen ──────────────────────────────────────────────────────
  if (view === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#000000' }}>
        <WelcomeView onEnter={handleFestivalEnter} />
      </div>
    );
  }

  // ── Main app layout ──────────────────────────────────────────────────────
  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* ── Sidebar — desktop only ──────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-56 h-screen flex-shrink-0 border-r"
        style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#E8D5C0' }}>
          <p className="text-lg font-black" style={{ color: '#FF6B35' }}>QueueFest</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: '#8B6650' }}>{festivalNombre}</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: active ? '#FF6B35' : 'transparent',
                  color: active ? '#fff' : '#8B6650',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,107,53,0.08)';
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t" style={{ borderColor: '#E8D5C0' }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
            style={{ color: '#C8956C' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(220,38,38,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">

          {view === 'main' && festivalId && (
            <MainPanelView
              festivalId={festivalId}
              festivalNombre={festivalNombre}
              onChangeFestival={() => setView('welcome')}
              onLogout={logout}
              navigate={navigate}
            />
          )}

          {view === 'stands' && festivalId && (
            <StandsView festivalId={festivalId} navigate={navigate} />
          )}

          {view === 'promotions' && festivalId && (
            <PromotionsView festivalId={festivalId} festivalNombre={festivalNombre} />
          )}

          {view === 'bot' && festivalId && (
            <BotDashboardView
              festivalId={festivalId}
              festivalNombre={festivalNombre}
              modoAuto={modoAuto}
              onToggleModo={handleToggleModo}
              navigate={navigate}
            />
          )}

          {view === 'config' && festivalId && (
            <ConfigView festivalId={festivalId} />
          )}

          {view === 'split' && festivalId && (
            <SplitView
              festivalId={festivalId}
              festivalNombre={festivalNombre}
              modoAuto={modoAuto}
              onToggleModo={handleToggleModo}
              navigate={navigate}
            />
          )}

        </div>

        {/* ── Bottom nav — mobile only ─────────────────────────────────── */}
        <div
          className="md:hidden flex-shrink-0 flex items-center border-t"
          style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', height: 66 }}
        >
          {NAV_ITEMS.map(({ id, icon: Icon }) => {
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
                <div
                  className="w-1 h-1 rounded-full transition-all"
                  style={{ backgroundColor: active ? '#A67C52' : 'transparent' }}
                />
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

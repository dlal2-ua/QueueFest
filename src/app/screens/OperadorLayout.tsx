import { useState, useEffect, type ReactNode } from 'react';
import { OperatorPuestoProvider, useOperatorPuesto } from '../context/OperatorPuestoContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Ticket, UtensilsCrossed, Package, LogOut, ChevronDown, Check } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Pedidos', path: '/operador/pedidos', icon: ShoppingBag },
  { label: 'Tickets', path: '/operador/tickets', icon: Ticket      },
  { label: 'Menú',    path: '/operador/menu',    icon: UtensilsCrossed },
  { label: 'Stock',   path: '/operador/stock',   icon: Package     },
];

function PuestoDropdown() {
  const { puestos, puestoId, setPuestoId } = useOperatorPuesto();
  const [open, setOpen] = useState(false);
  if (puestos.length <= 1) return null;
  const current = puestos.find(p => p.id === puestoId);
  return (
    <div className="relative px-2 pb-2" style={{ zIndex: 40 }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border"
        style={{ backgroundColor: '#FDF6EE', borderColor: '#E8D5C0', color: '#2C1810' }}
      >
        <span className="truncate">{current?.nombre ?? '—'}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 ml-1" style={{ color: '#A67C52', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }} />
      </button>
      {open && (
        <div className="absolute left-2 right-2 rounded-xl border shadow-lg overflow-hidden" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          {puestos.map(p => (
            <button
              key={p.id}
              onClick={() => { setPuestoId(p.id); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs border-b transition-colors"
              style={{ borderColor: '#E8D5C0', backgroundColor: p.id === puestoId ? 'rgba(166,124,82,0.12)' : 'transparent', color: p.id === puestoId ? '#A67C52' : '#2C1810', fontWeight: p.id === puestoId ? 700 : 400 }}
              onMouseEnter={e => { if (p.id !== puestoId) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(166,124,82,0.06)'; }}
              onMouseLeave={e => { if (p.id !== puestoId) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <span className="truncate">{p.nombre}</span>
              {p.id === puestoId && <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#A67C52' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobilePuestoSelector() {
  const { puestos, puestoId, setPuestoId } = useOperatorPuesto();
  const [open, setOpen] = useState(false);
  if (puestos.length <= 1) return null;
  const current = puestos.find(p => p.id === puestoId);
  return (
    <div className="relative flex-shrink-0 md:hidden" style={{ zIndex: 40 }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 border-b text-sm font-semibold"
        style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#2C1810' }}
      >
        <span className="truncate">{current?.nombre ?? 'Seleccionar puesto'}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2 transition-transform" style={{ color: '#A67C52', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 border-b shadow-md" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          {puestos.map(p => (
            <button key={p.id} onClick={() => { setPuestoId(p.id); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm border-t"
              style={{ borderColor: '#E8D5C0', backgroundColor: p.id === puestoId ? 'rgba(166,124,82,0.10)' : 'transparent', color: p.id === puestoId ? '#A67C52' : '#2C1810', fontWeight: p.id === puestoId ? 700 : 400 }}
            >
              <span className="truncate">{p.nombre}</span>
              {p.id === puestoId && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#A67C52' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LayoutShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const currentPath = window.location.pathname;

  const goTo = (path: string) => (window as any).navigateTo(path);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.backgroundColor = '';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FDF6EE' }}>

      {/* ── Sidebar — desktop only ───────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen flex-shrink-0 border-r" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
        {/* Brand */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#E8D5C0' }}>
          <p className="text-lg font-black" style={{ color: '#FF6B35' }}>QueueFest</p>
          <p className="text-xs mt-0.5" style={{ color: '#8B6650' }}>Panel Operador</p>
        </div>

        {/* Puesto selector */}
        <div className="pt-3">
          <PuestoDropdown />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = currentPath === path || currentPath.startsWith(path + '/');
            return (
              <button
                key={path}
                onClick={() => goTo(path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: active ? '#FF6B35' : 'transparent', color: active ? '#fff' : '#8B6650' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,107,53,0.08)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
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

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Mobile puesto selector */}
        <MobilePuestoSelector />

        {/* Screen content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>

        {/* Bottom nav — mobile only */}
        <nav
          className="md:hidden flex-shrink-0 flex items-center border-t"
          style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', height: 66 }}
        >
          {NAV_ITEMS.map(({ label, path }) => {
            const active = currentPath === path || currentPath.startsWith(path + '/');
            return (
              <button
                key={path}
                onClick={() => goTo(path)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
                style={{ height: '100%' }}
              >
                <span className="text-xs font-semibold" style={{ color: active ? '#A67C52' : '#C4B5A5' }}>{label}</span>
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: active ? '#A67C52' : 'transparent' }} />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <OperatorPuestoProvider>
      <LayoutShell>{children}</LayoutShell>
    </OperatorPuestoProvider>
  );
}

type Tab = {
    label: string;
    path: string;
};

const tabs: Tab[] = [
    { label: 'Pedidos', path: '/operador/pedidos' },
    { label: 'Tickets', path: '/operador/tickets' },
    { label: 'Menú', path: '/operador/menu' },
    { label: 'Stock', path: '/operador/stock' },
];

export function OperatorBottomNav() {
    const currentPath = window.location.pathname;

    const goTo = (path: string) => {
        (window as any).navigateTo(path);
    };

    return (
        <nav
            className="flex-shrink-0 flex items-center border-t"
            style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', height: 66 }}
        >
            {tabs.map((tab) => {
                const isActive = currentPath === tab.path || currentPath.startsWith(tab.path + '/');
                return (
                    <button
                        key={tab.path}
                        onClick={() => goTo(tab.path)}
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
                        style={{ height: '100%' }}
                    >
                        <span
                            className="text-xs font-semibold transition-all"
                            style={{ color: isActive ? '#A67C52' : '#C4B5A5' }}
                        >
                            {tab.label}
                        </span>
                        <div
                            className="w-1 h-1 rounded-full transition-all"
                            style={{ backgroundColor: isActive ? '#A67C52' : 'transparent' }}
                        />
                    </button>
                );
            })}
        </nav>
    );
}

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
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-16 bg-white border-t border-gray-200 z-40 grid grid-cols-4">
            {tabs.map((tab) => {
                const isActive = currentPath === tab.path;
                return (
                    <button
                        key={tab.path}
                        onClick={() => goTo(tab.path)}
                        className={`text-sm font-medium ${isActive ? 'text-orange-600 bg-orange-50' : 'text-gray-600'
                            }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
}
export function OperatorStockScreen() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>
            <div
                className="flex-shrink-0 px-4 py-3"
                style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)' }}
            >
                <h1 className="text-sm font-extrabold text-white">Stock</h1>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <p className="text-sm" style={{ color: '#C8956C', opacity: 0.5 }}>Pantalla de stock del operador.</p>
            </div>
        </div>
    );
}

// PickupQR.tsx
// Componente reutilizable para mostrar el código QR de recogida del pedido
// El QR codifica "QUEUEFEST:QF-XXXX" para ser escaneable con cualquier cámara
// También muestra el código en texto legible y un botón para copiarlo

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PickupQRProps {
    orderId: number;
}

export function PickupQR({ orderId }: PickupQRProps) {
    const [copied, setCopied] = useState(false);

    // Formato visual: QF-0002 (4 dígitos con ceros a la izquierda)
    const pickupCode = `QF-${String(orderId).padStart(4, '0')}`;

    // Datos que va a codificar el QR
    const qrData = `QUEUEFEST:${pickupCode}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(pickupCode);
            setCopied(true);
            toast.success('Código copiado');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('No se pudo copiar');
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100">
                <QRCodeSVG
                    value={qrData}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#111111"
                    level="M"
                    includeMargin={false}
                />
            </div>

            {/* Pickup code + copy button */}
            <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tracking-widest text-gray-900">
                    {pickupCode}
                </span>
                <button
                    onClick={handleCopy}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    title="Copiar código"
                >
                    {copied
                        ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                        : <Copy className="w-5 h-5 text-gray-500" />
                    }
                </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
                Muestra este código al recoger tu pedido
            </p>
        </div>
    );
}

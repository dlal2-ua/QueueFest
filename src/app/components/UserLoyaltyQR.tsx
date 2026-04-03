import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserLoyaltyQRProps {
  userId: number;
  userName: string;
  userEmail: string;
}

export function UserLoyaltyQR({ userId, userName, userEmail }: UserLoyaltyQRProps) {
  const [copied, setCopied] = useState(false);

  const loyaltyCode = `QFU-${String(userId || 0).padStart(6, '0')}`;
  const qrData = JSON.stringify({
    type: 'QUEUEFEST_LOYALTY',
    userId,
    loyaltyCode,
    userName,
    userEmail
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${loyaltyCode} - ${userEmail}`);
      setCopied(true);
      toast.success('Codigo de loyalty copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el codigo');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
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

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-sm font-medium text-gray-500">{userName}</span>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-widest text-gray-900">{loyaltyCode}</span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Copiar codigo de loyalty"
          >
            {copied ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center max-w-xs">
        Muestra este QR antes de pagar para asociar una compra presencial a tu cuenta y sumar royalties automaticamente.
      </p>
    </div>
  );
}

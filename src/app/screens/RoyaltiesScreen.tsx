import { ChevronLeft } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { BottomNav } from '../components/BottomNav';
import { RoyaltiesPanel } from '../components/RoyaltiesPanel';

export function RoyaltiesScreen() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Royalties</h1>
            <p className="text-sm text-gray-500">Tu saldo virtual, progreso y QR de identificacion.</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <RoyaltiesPanel />
      </div>

      <BottomNav />
    </div>
  );
}

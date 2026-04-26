import { useMemo } from 'react';
import { Coins, Gift, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import { ROYALTY_WELCOME_BONUS } from '../data/profileData';

export function WelcomeBonusScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const welcomeData = useMemo(() => {
    try {
      const raw = window.sessionStorage.getItem('welcomeBonus');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const points = Number(welcomeData?.points ?? ROYALTY_WELCOME_BONUS);
  const userName = String(welcomeData?.name || user?.nombre || 'festivalero');
  const confettiPieces = Array.from({ length: 22 }, (_, index) => ({
    id: index,
    left: `${(index * 4.2) % 100}%`,
    delay: index * 0.08,
    duration: 2.8 + (index % 5) * 0.35,
    rotate: index % 2 === 0 ? 180 : -180,
    color: ['#F97316', '#F59E0B', '#EC4899', '#22C55E', '#3B82F6'][index % 5]
  }));

  const handleViewProfile = () => {
    window.sessionStorage.removeItem('welcomeBonus');
    navigate('/profile');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffe4e6_55%,_#ffffff)] px-6 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettiPieces.map((piece) => (
          <motion.span
            key={piece.id}
            className="absolute top-[-10%] h-4 w-2 rounded-full"
            style={{ left: piece.left, backgroundColor: piece.color }}
            initial={{ y: -80, opacity: 0, rotate: 0 }}
            animate={{ y: '120vh', opacity: [0, 1, 1, 0], rotate: piece.rotate }}
            transition={{ repeat: Infinity, duration: piece.duration, delay: piece.delay, ease: 'linear' }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full rounded-[2rem] border border-orange-100 bg-white/90 p-8 text-center shadow-2xl backdrop-blur"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg">
            <Gift className="h-10 w-10" />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
            <Sparkles className="h-4 w-4" />
            Bienvenido a QueueFest
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-gray-900">
            {userName}, ya tienes tus primeros puntos
          </h1>
          <p className="mt-3 text-base text-gray-600">
            Acabas de estrenar tu cuenta y te hemos regalado un bonus de bienvenida para empezar a pedir con ventaja.
          </p>

          <div className="mt-6 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-white shadow-xl">
            <div className="flex items-center justify-center gap-3">
              <Coins className="h-7 w-7" />
              <span className="text-4xl font-black tracking-tight">{points.toLocaleString('es-ES')}</span>
            </div>
            <p className="mt-2 text-sm text-white/90">Royalties de bienvenida ya abonados en tu perfil</p>
          </div>

          <button
            onClick={handleViewProfile}
            className="mt-8 w-full rounded-2xl bg-gray-950 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-black"
          >
            Verlo
          </button>
        </motion.div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate } from '../utils/navigation';
import { UtensilsCrossed } from 'lucide-react';
import { motion } from 'motion/react';

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <UtensilsCrossed className="w-24 h-24 text-white mx-auto mb-4" />
        </motion.div>
        <h1 className="text-4xl font-bold text-white mb-2">FoodFest</h1>
        <p className="text-white/90 text-lg">Order from Food Trucks & Bars</p>
      </motion.div>
    </div>
  );
}

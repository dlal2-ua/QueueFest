import { useNavigate } from '../utils/navigation';
import { Truck, Wine } from 'lucide-react';
import { motion } from 'motion/react';

export function SelectionScreen() {
  const navigate = useNavigate();

  const options = [
    {
      icon: Truck,
      title: 'Food Trucks',
      description: 'Browse delicious food from local trucks',
      color: 'from-orange-500 to-red-500',
      path: '/home'
    },
    {
      icon: Wine,
      title: 'Bars',
      description: 'Discover drinks and cocktails',
      color: 'from-purple-500 to-pink-500',
      path: '/home'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-bold mb-2">What are you craving?</h1>
        <p className="text-gray-600">Choose a service to get started</p>
      </motion.div>

      <div className="w-full max-w-md space-y-4">
        {options.map((option, index) => (
          <motion.button
            key={option.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => {
              localStorage.setItem('selectedService', option.title.toLowerCase());
              navigate(option.path);
            }}
            className="w-full group"
          >
            <div className={`bg-gradient-to-br ${option.color} p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-105`}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <option.icon className="w-8 h-8" />
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-2xl font-bold mb-1">{option.title}</h2>
                  <p className="text-white/90">{option.description}</p>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from '../utils/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - just navigate to selection
    navigate('/selection');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to continue ordering</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button 
              type="button" 
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">
            Don't have an account?{' '}
            <button 
              onClick={() => navigate('/register')}
              className="text-orange-600 font-medium hover:text-orange-700"
            >
              Register
            </button>
          </p>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-orange-50 to-red-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-white transition-colors">
              Google
            </button>
            <button className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-white transition-colors">
              Apple
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

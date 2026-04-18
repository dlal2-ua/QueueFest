// LoginScreen.tsx
// Pantalla de inicio de sesión
// Llama a la API real con email y contraseña
// Si el login es correcto guarda el token y redirige según el rol:
// - administrador → /admin
// - gestor → /gestor
// - operador → /operador
// - usuario → /festival-select

import { useState, useEffect } from 'react';
import { useNavigate } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../api';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#FF6B35';
    document.body.style.margin = '0';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      login(data.token, data.user);
      if (data.user.rol === 'administrador') navigate('/admin');
      else if (data.user.rol === 'gestor') navigate('/gestor');
      else if (data.user.rol === 'operador') navigate('/operador');
      else navigate('/festival-select');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-start justify-center md:py-6 md:px-4"
      style={{ backgroundColor: '#FF6B35' }}
    >
      {/* Phone frame */}
      <div
        className="
          phone-frame
          relative w-full min-h-screen flex flex-col overflow-hidden
          md:min-h-0 md:w-[360px]
          md:rounded-[45px]
          md:border-[10px] md:border-[#1a1a1a]
        "
        style={{ backgroundColor: '#ffffff', transform: 'translate(0, 0)' }}
      >
        {/* Notch */}
        <div
          className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 z-50"
          style={{ width: 110, height: 28, backgroundColor: '#1a1a1a', borderRadius: '0 0 18px 18px' }}
        />
        {/* Status bar */}
        <div className="hidden md:flex items-center justify-between px-6 pt-1.5 pb-0 h-8 flex-shrink-0">
          <span className="text-[10px] font-semibold text-gray-500">9:41</span>
          <div className="w-20" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-sm border border-gray-400">
              <div className="w-1/2 h-full bg-gray-400" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-red-50">
          <div className="w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">QueueFest</h1>
              <p className="text-gray-600">Inicia sesión para continuar</p>
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
                    placeholder="tu@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contraseña</label>
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
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                ¿No tienes cuenta?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-orange-600 font-medium hover:text-orange-700"
                >
                  Regístrate
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div
          className="hidden md:flex justify-center items-center py-1.5 flex-shrink-0"
          style={{ backgroundColor: '#f9fafb' }}
        >
          <div className="w-24 h-1 rounded-full bg-gray-300" />
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .phone-frame {
            height: min(840px, 93vh);
            box-shadow: 0 0 0 2px #333, 0 30px 80px rgba(0,0,0,0.50), inset 0 0 0 1px #555;
          }
        }
      `}</style>
    </div>
  );
}

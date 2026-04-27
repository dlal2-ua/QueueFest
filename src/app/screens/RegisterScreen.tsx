import { useState } from 'react';
import { ChevronLeft, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { login as loginApi, register as registerApi } from '../api';
import { ROYALTY_WELCOME_BONUS } from '../data/profileData';
import { toast } from 'sonner';

export function RegisterScreen() {
  const navigate = useNavigate();
  const { isRTL, t } = useLanguage();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error('Por favor, introduce tu nombre');
      return;
    }
    if (!formData.email.includes('@')) {
      toast.error('Por favor, introduce un correo valido');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contrasenas no coinciden');
      return;
    }

    try {
      await registerApi(formData.email.trim(), formData.password, formData.fullName.trim());
      const session = await loginApi(formData.email.trim(), formData.password);
      login(session.token, session.user);

      window.sessionStorage.setItem(
        'welcomeBonus',
        JSON.stringify({
          points: ROYALTY_WELCOME_BONUS,
          email: formData.email.trim(),
          name: formData.fullName.trim()
        })
      );

      toast.success('Cuenta creada correctamente');
      navigate('/welcome-bonus');
    } catch (err) {
      toast.error('No se pudo crear la cuenta. Puede que ese correo ya exista.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <button
          onClick={() => navigate('/login')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors inline-flex"
        >
          <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Crear cuenta</h1>
            <p className="text-gray-600">{t('loyalty.registerSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Tu nombre y apellidos"
                    required
                  />
                  <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electronico
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="tu.correo@ejemplo.com"
                    required
                  />
                  <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contrasena
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pl-12 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Minimo 6 caracteres"
                    required
                  />
                  <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repite la contrasena
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 pl-12 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Vuelve a escribirla"
                    required
                  />
                  <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl py-4 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Crear cuenta
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-orange-600 font-semibold hover:text-orange-700"
              >
                Inicia sesion
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

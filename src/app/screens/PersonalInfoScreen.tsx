import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../data/profileData';
import { BottomNav } from '../components/BottomNav';
import { updateProfile } from '../api';
import { toast } from 'sonner';

export function PersonalInfoScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado del formulario con todos los campos editables
  const [formData, setFormData] = useState({
    alias: user?.alias || '',
    telefono: user?.telefono || '',
    fecha_nacimiento: user?.fecha_nacimiento || '',
    ciudad: user?.ciudad || '',
    idioma_preferido: user?.idioma_preferido || 'es',
    festival_favorito: user?.festival_favorito || '',
    preferencias_dieteticas: user?.preferencias_dieteticas || '',
    alergias: user?.alergias || '',
    notificaciones_push: user?.notificaciones_push ?? true,
    notificaciones_email: user?.notificaciones_email ?? false,
    acepta_marketing: user?.acepta_marketing ?? false
  });

  // Actualizar formData cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setFormData({
        alias: user.alias || '',
        telefono: user.telefono || '',
        fecha_nacimiento: user.fecha_nacimiento || '',
        ciudad: user.ciudad || '',
        idioma_preferido: user.idioma_preferido || 'es',
        festival_favorito: user.festival_favorito || '',
        preferencias_dieteticas: user.preferencias_dieteticas || '',
        alergias: user.alergias || '',
        notificaciones_push: user.notificaciones_push ?? true,
        notificaciones_email: user.notificaciones_email ?? false,
        acepta_marketing: user.acepta_marketing ?? false
      });
    }
  }, [user]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(formData);
      toast.success('Perfil actualizado correctamente');
      // Refrescar datos del usuario en el contexto
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-semibold">{t('personalInfo.title')}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Sección: Identidad y contacto */}
        <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Identidad y contacto</h2>
            <p className="text-sm text-gray-500">Información básica de tu perfil.</p>
          </div>

          <div className="space-y-4">
            {/* Nombre (no editable) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('personalInfo.name')}</label>
              <div className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500">
                {user?.nombre}
              </div>
              <p className="text-xs text-gray-400 mt-1">El nombre no es editable</p>
            </div>

            {/* Alias */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alias en la app</label>
              <input
                type="text"
                value={formData.alias}
                onChange={(e) => handleChange('alias', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Tu alias o apodo"
              />
            </div>

            {/* Email (no editable) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('personalInfo.email')}</label>
              <div className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500">
                {user?.email}
              </div>
              <p className="text-xs text-gray-400 mt-1">El email no es editable</p>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('personalInfo.phone')}</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="+34 123 456 789"
              />
            </div>

            {/* Fecha de nacimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de nacimiento</label>
              <input
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad de referencia</label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => handleChange('ciudad', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Madrid, Barcelona, Valencia..."
              />
            </div>
          </div>
        </section>

        {/* Sección: Experiencia en el festival */}
        <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Experiencia en el festival</h2>
            <p className="text-sm text-gray-500">Preferencias y restricciones alimentarias.</p>
          </div>

          <div className="space-y-4">
            {/* Festival favorito */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Festival favorito</label>
              <input
                type="text"
                value={formData.festival_favorito}
                onChange={(e) => handleChange('festival_favorito', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Primavera Sound, Mad Cool..."
              />
            </div>

            {/* Idioma preferido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Idioma preferido</label>
              <select
                value={formData.idioma_preferido}
                onChange={(e) => handleChange('idioma_preferido', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="ca">Català</option>
                <option value="fr">Français</option>
              </select>
            </div>

            {/* Preferencias dietéticas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferencias dietéticas</label>
              <textarea
                value={formData.preferencias_dieteticas}
                onChange={(e) => handleChange('preferencias_dieteticas', e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Vegetariano, vegano, sin gluten..."
              />
            </div>

            {/* Alergias */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alergias o restricciones</label>
              <textarea
                value={formData.alergias}
                onChange={(e) => handleChange('alergias', e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Frutos secos, lactosa, mariscos..."
              />
            </div>
          </div>
        </section>

        {/* Sección: Permisos y comunicación */}
        <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Permisos y comunicación</h2>
            <p className="text-sm text-gray-500">Configura cómo quieres recibir información.</p>
          </div>

          <div className="space-y-4">
            {/* Notificaciones push */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">Notificaciones push</label>
                <p className="text-xs text-gray-500">Recibe alertas en tu dispositivo</p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('notificaciones_push', !formData.notificaciones_push)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.notificaciones_push ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.notificaciones_push ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notificaciones email */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">Notificaciones por email</label>
                <p className="text-xs text-gray-500">Recibe emails informativos</p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('notificaciones_email', !formData.notificaciones_email)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.notificaciones_email ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.notificaciones_email ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Marketing */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">Consentimiento comercial</label>
                <p className="text-xs text-gray-500">Acepto recibir ofertas y promociones</p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('acepta_marketing', !formData.acepta_marketing)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.acepta_marketing ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.acepta_marketing ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Miembro desde (no editable) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Miembro desde</label>
              <div className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500">
                {user?.creado_en ? new Date(user.creado_en).toLocaleDateString('es-ES') : 'N/A'}
              </div>
            </div>
          </div>
        </section>

        {/* Botón de guardar */}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar cambios'
          )}
        </button>
      </form>

      <BottomNav />
    </div>
  );
}

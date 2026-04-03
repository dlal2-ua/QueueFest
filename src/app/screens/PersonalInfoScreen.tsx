import { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../data/profileData';

export function PersonalInfoScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();

  const profile = useMemo(
    () =>
      getUserProfile({
        fullName: user?.nombre,
        displayName: user?.nombre,
        email: user?.email
      }),
    [user?.email, user?.nombre]
  );

  const sections = [
    {
      title: 'Identidad y contacto',
      fields: [
        { label: t('personalInfo.name'), value: profile.fullName },
        { label: 'Alias en la app', value: profile.displayName },
        { label: t('personalInfo.email'), value: profile.email },
        { label: t('personalInfo.phone'), value: profile.phone },
        { label: 'Fecha de nacimiento', value: profile.birthDate },
        { label: 'Ciudad de referencia', value: profile.city }
      ]
    },
    {
      title: 'Experiencia en el festival',
      fields: [
        { label: 'Festival favorito', value: profile.favoriteFestival },
        { label: 'Idioma preferido', value: profile.preferredLanguage },
        { label: 'Preferencias dieteticas', value: profile.dietaryPreferences },
        { label: 'Alergias o restricciones', value: profile.allergies }
      ]
    },
    {
      title: 'Permisos y comunicacion',
      fields: [
        { label: 'Notificaciones', value: profile.notifications },
        { label: 'Consentimiento comercial', value: profile.marketingConsent },
        { label: 'Miembro desde', value: profile.memberSince }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-semibold">{t('personalInfo.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          Estos campos se muestran como placeholders funcionales hasta que conectemos la edicion real con la base de datos.
        </div>

        {sections.map((section) => (
          <section key={section.title} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
              <p className="text-sm text-gray-500">Vista previa de los atributos recomendados para el perfil de usuario.</p>
            </div>

            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.label}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                  <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900">
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

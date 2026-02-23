import { ChevronLeft, Check } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage, Language } from '../context/LanguageContext';

const languages: { code: Language; nativeName: string; flag: string }[] = [
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'en', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', nativeName: 'العربية', flag: '🇸🇦' },
];

export function LanguageScreen() {
  const navigate = useNavigate();
  const { language, setLanguage, t, isRTL } = useLanguage();

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-semibold">{t('profile.language')}</h1>
        </div>
      </div>

      {/* Languages List */}
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{lang.flag}</span>
                <span className="font-medium text-lg">{lang.nativeName}</span>
              </div>
              {language === lang.code && (
                <Check className="w-6 h-6 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

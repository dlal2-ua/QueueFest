import { useState } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

interface FAQ {
  question: string;
  answer: string;
}

export function HelpSupportScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: ''
  });

  const faqs: FAQ[] = [
    {
      question: '¿Cómo puedo hacer un pedido?',
      answer: 'Selecciona un food truck o bar, elige tus productos y añádelos al carrito. Luego procede al pago.'
    },
    {
      question: '¿Cuánto tiempo tarda mi pedido?',
      answer: 'El tiempo de espera se muestra en cada vendor. Puedes seguir el estado de tu pedido en tiempo real.'
    },
    {
      question: '¿Puedo cancelar mi pedido?',
      answer: 'Sí, puedes cancelar tu pedido antes de que entre en preparación desde la sección de seguimiento.'
    },
    {
      question: '¿Cómo funcionan los cupones?',
      answer: 'Introduce el código del cupón en la pantalla del carrito antes de proceder al pago.'
    },
    {
      question: '¿Qué métodos de pago aceptan?',
      answer: 'Aceptamos tarjetas de crédito/débito (Visa, Mastercard, Amex) y Apple Pay.'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.subject || !contactForm.message) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    // In a real app, this would send the message to support
    toast.success(t('help.messageSent'));
    setContactForm({ subject: '', message: '' });
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
          <h1 className="text-xl font-semibold">{t('help.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-700">{t('help.faq')}</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {faqs.map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full px-4 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                      expandedFAQ === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFAQ === index && (
                  <div className="px-4 pb-4 text-gray-600 text-sm">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-700 mb-4">{t('help.contact')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('help.subject')}
              </label>
              <input
                type="text"
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Problema con mi pedido"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('help.message')}
              </label>
              <textarea
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe tu consulta o problema..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-2xl font-semibold shadow-lg hover:bg-gray-800 transition-colors"
            >
              {t('help.send')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

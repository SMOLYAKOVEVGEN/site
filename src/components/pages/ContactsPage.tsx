import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createLead } from '@/lib/lead-service';
import { usePageMeta } from '@/lib/use-page-meta';

type ContactsFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
};

function getInitialFormData(): ContactsFormData {
  return {
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  };
}

function getUtmParams() {
  if (typeof window === 'undefined') {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
    };
  }

  const searchParams = new URLSearchParams(window.location.search);

  return {
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
  };
}

export default function ContactsPage() {
  const [formData, setFormData] = useState<ContactsFormData>(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');
  const [submitErrorMessage, setSubmitErrorMessage] = useState('');

  usePageMeta({
    title: 'Контакты',
    description: 'Свяжитесь с АВТОграф: телефон +7 (812) 640-39-96, email info@cnc.su. Санкт-Петербург, ул. Заусадебная д. 15, стр. Б.',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.location.hash === '#request-form') {
      const el = document.getElementById('request-form');
      if (!el) return;

      window.setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setSubmitSuccessMessage('');
    setSubmitErrorMessage('');

    try {
      const utm = getUtmParams();

      await createLead({
        customer_name: formData.name,
        phone: formData.phone,
        email: formData.email,
        company: formData.company,
        comment: formData.message,
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        source: 'quick_request',
        items: [
          {
            product_name: 'Общий запрос с формы контактов',
            product_slug: 'contacts-form-request',
            quantity: 1,
          },
        ],
      });

      setSubmitSuccessMessage(
        'Спасибо! Ваш запрос отправлен. Мы свяжемся с вами в ближайшее время.'
      );
      setSubmitErrorMessage('');
      setFormData(getInitialFormData());
    } catch (error: any) {
      console.error('Contacts form submit error:', error);

      const message =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось отправить сообщение. Попробуйте еще раз.';

      setSubmitErrorMessage(message);
      setSubmitSuccessMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main">
      <section className="bg-graphite text-primary-foreground py-12 sm:py-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6 leading-tight">
              Контакты
            </h1>
            <p className="font-paragraph text-base sm:text-xl text-primary-foreground/90 max-w-3xl leading-relaxed">
              Свяжитесь с нами удобным для вас способом
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-24">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-heading text-2xl sm:text-4xl text-graphite mb-6 sm:mb-8">
                Наши контакты
              </h2>

              <div className="space-y-4 sm:space-y-8">
                <div className="flex gap-3 sm:gap-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 bg-primary rounded-lg flex items-center justify-center">
                    <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base sm:text-xl text-graphite mb-1 sm:mb-2">
                      Телефон
                    </h3>
                    <a
                      href="tel:+78126403996"
                      className="font-paragraph text-sm sm:text-lg text-steel-gray hover:text-primary transition-colors"
                    >
                      +7 (812) 640-39-96
                    </a>
                  </div>
                </div>

                <div className="flex gap-3 sm:gap-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 bg-primary rounded-lg flex items-center justify-center">
                    <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base sm:text-xl text-graphite mb-1 sm:mb-2">
                      Email
                    </h3>
                    <a
                      href="mailto:info@cnc.su"
                      className="font-paragraph text-sm sm:text-lg text-steel-gray hover:text-primary transition-colors"
                    >
                      info@cnc.su
                    </a>
                  </div>
                </div>

                <div className="flex gap-3 sm:gap-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 bg-primary rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base sm:text-xl text-graphite mb-1 sm:mb-2">
                      Адрес
                    </h3>
                    <p className="font-paragraph text-sm sm:text-lg text-steel-gray">
                      г. Санкт-Петербург,
                      <br />
                      ул. Заусадебная, д. 15, строение 5
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 sm:gap-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 bg-primary rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base sm:text-xl text-graphite mb-1 sm:mb-2">
                      Режим работы
                    </h3>
                    <p className="font-paragraph text-sm sm:text-lg text-steel-gray">
                      Понедельник - Пятница: 9:00 - 18:00
                      <br />
                      Суббота - Воскресенье: выходной
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 sm:mt-12 overflow-hidden rounded-lg border border-graphite/10 bg-white">
                <iframe
                  src="https://yandex.com/map-widget/v1/?ll=30.404844%2C59.982955&mode=search&ol=geo&ouri=ymapsbm1%3A%2F%2Fgeo%3Fdata%3DCgozMjM1Mzg2NjE3ElXQoNC-0YHRgdC40Y8sINCh0LDQvdC60YIt0J_QtdGC0LXRgNCx0YPRgNCzLCDQl9Cw0YPRgdCw0LTQtdCx0L3QsNGPINGD0LvQuNGG0LAsIDE10YE1IgoNQjfyQRWP829C&z=10.39"
                  width="100%"
                  height="420"
                  frameBorder="0"
                  allowFullScreen
                  loading="lazy"
                  className="block w-full"
                  title="Карта офиса"
                />
              </div>
            </motion.div>

            <motion.div
              id="request-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="scroll-mt-28"
            >
              <div className="bg-white p-4 sm:p-8 lg:p-12 rounded-lg border border-graphite/10">
                <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                  <Send className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                  <h2 className="font-heading text-xl sm:text-3xl text-graphite">
                    Напишите нам
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
                  <div>
                    <label className="font-paragraph text-xs sm:text-sm text-steel-gray mb-1 sm:mb-2 block">
                      Ваше имя *
                    </label>
                    <Input
                      type="text"
                      placeholder="Иван Иванов"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isSubmitting}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-paragraph text-xs sm:text-sm text-steel-gray mb-1 sm:mb-2 block">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="ivan@company.ru"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={isSubmitting}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-paragraph text-xs sm:text-sm text-steel-gray mb-1 sm:mb-2 block">
                      Телефон *
                    </label>
                    <Input
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      disabled={isSubmitting}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-paragraph text-xs sm:text-sm text-steel-gray mb-1 sm:mb-2 block">
                      Компания
                    </label>
                    <Input
                      type="text"
                      placeholder="ООО «Ваша компания»"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      disabled={isSubmitting}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-paragraph text-xs sm:text-sm text-steel-gray mb-1 sm:mb-2 block">
                      Сообщение *
                    </label>
                    <Textarea
                      placeholder="Опишите вашу задачу или вопрос"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      required
                      disabled={isSubmitting}
                      className="text-sm"
                    />
                  </div>

                  {submitSuccessMessage && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {submitSuccessMessage}
                    </div>
                  )}

                  {submitErrorMessage && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitErrorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-paragraph text-sm sm:text-base py-3 sm:py-6 h-auto disabled:opacity-70"
                  >
                    {isSubmitting ? 'Отправка...' : 'Отправить сообщение'}
                    <Send className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>

                  <p className="font-paragraph text-xs sm:text-sm text-steel-gray text-center">
                    Нажимая кнопку, вы соглашаетесь с{' '}
                    <a href="/privacy" className="text-primary hover:underline">
                      политикой конфиденциальности
                    </a>
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-24 bg-white border-t border-graphite/10">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="font-heading text-2xl sm:text-4xl text-graphite mb-3 sm:mb-4">
              Реквизиты компании
            </h2>
            <p className="font-paragraph text-base sm:text-xl text-steel-gray">
              Для оформления договоров и счетов
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto bg-background p-4 sm:p-8 rounded-lg border border-graphite/10">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 font-paragraph text-sm sm:text-base">
              <div>
                <p className="text-xs sm:text-sm text-steel-gray mb-1">Полное наименование</p>
                <p className="text-graphite font-medium">ООО «АВТОграф Инструментальные Решения»</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-steel-gray mb-1">ИНН / КПП</p>
                <p className="text-graphite font-medium">7800000000 / 780001001</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-steel-gray mb-1">ОГРН</p>
                <p className="text-graphite font-medium">1234567890123</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-steel-gray mb-1">Расчетный счет</p>
                <p className="text-graphite font-medium">40702810000000000000</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-steel-gray mb-1">Банк</p>
                <p className="text-graphite font-medium">ПАО «Банк»</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-steel-gray mb-1">БИК</p>
                <p className="text-graphite font-medium">044030000</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs sm:text-sm text-steel-gray mb-1">Юридический адрес</p>
                <p className="text-graphite font-medium">
                  190000, г. Санкт-Петербург, ул. Заусадебная, д. 15, стр. 5
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
}
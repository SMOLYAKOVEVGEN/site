import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { usePageMeta } from '@/lib/use-page-meta';

type ServiceRow = {
  id: string;
  service_name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  hero_image: string | null;
  work_stages: string | null;
  advantages: string | null;
  case_studies_summary: string | null;
  faq: string | null;
};

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [service, setService] = useState<ServiceRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  usePageMeta({
    title: service?.service_name || 'Услуга',
    description: service?.short_description || service?.description || 'Инженерная услуга компании АВТОграф.',
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });

  useEffect(() => {
    loadService();
  }, [slug]);

  const loadService = async () => {
    if (!slug) {
      setService(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          service_name,
          slug,
          short_description,
          description,
          hero_image,
          work_stages,
          advantages,
          case_studies_summary,
          faq
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;

      setService((data as ServiceRow | null) || null);
    } catch (error) {
      console.error('Error loading service:', error);
      setService(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.');
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      message: '',
    });
  };

  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />

      <div style={{ minHeight: '600px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <LoadingSpinner />
          </div>
        ) : !service ? (
          <div className="max-w-[100rem] mx-auto px-8 py-32 text-center">
            <h1 className="font-heading text-4xl text-graphite mb-4">Услуга не найдена</h1>
            <Link to="/services">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Вернуться к услугам
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <section
              className="relative bg-graphite text-primary-foreground overflow-hidden"
              style={{ minHeight: '60vh' }}
            >
              <div className="absolute inset-0">
                <Image
                  src={
                    service.hero_image ||
                    '/fallback-logo.png'
                  }
                  alt={service.service_name || 'Service'}
                  className="w-full h-full object-cover opacity-30"
                  width={1920}
                />
              </div>

              <div className="relative max-w-[100rem] mx-auto px-8 py-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex items-center gap-3 mb-6 font-paragraph text-primary-foreground/80">
                    <Link to="/" className="hover:text-secondary transition-colors">Главная</Link>
                    <span>/</span>
                    <Link to="/services" className="hover:text-secondary transition-colors">Услуги</Link>
                    <span>/</span>
                    <span className="text-primary-foreground">{service.service_name}</span>
                  </div>

                  <h1 className="font-heading text-5xl lg:text-6xl mb-6 max-w-4xl">
                    {service.service_name}
                  </h1>

                  <p className="font-paragraph text-xl text-primary-foreground/90 max-w-3xl">
                    {service.short_description}
                  </p>
                </motion.div>
              </div>
            </section>

            <section className="py-16 bg-white">
              <div className="max-w-[100rem] mx-auto px-8">
                <div className="grid lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                    >
                      <h2 className="font-heading text-3xl text-graphite mb-6">Описание услуги</h2>
                      <div className="font-paragraph text-steel-gray leading-relaxed space-y-4 text-lg">
                        {(service.description || '').split('\n').filter(Boolean).map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    </motion.div>

                    {service.work_stages && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mt-16"
                      >
                        <h2 className="font-heading text-3xl text-graphite mb-8">Этапы работы</h2>
                        <div className="space-y-6">
                          {service.work_stages.split('\n').filter(Boolean).map((stage, index) => (
                            <div key={index} className="flex gap-6">
                              <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-heading text-xl font-bold">
                                {index + 1}
                              </div>
                              <div className="flex-1 pt-2">
                                <p className="font-paragraph text-lg text-graphite">{stage}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {service.advantages && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mt-16"
                      >
                        <h2 className="font-heading text-3xl text-graphite mb-8">Преимущества</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                          {service.advantages.split('\n').filter(Boolean).map((advantage, index) => (
                            <div key={index} className="flex gap-4 bg-background p-6 rounded-lg">
                              <CheckCircle className="flex-shrink-0 w-6 h-6 text-primary mt-1" />
                              <p className="font-paragraph text-graphite">{advantage}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {service.case_studies_summary && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mt-16"
                      >
                        <h2 className="font-heading text-3xl text-graphite mb-6">Примеры реализованных проектов</h2>
                        <div className="font-paragraph text-steel-gray leading-relaxed space-y-4 text-lg">
                          {service.case_studies_summary.split('\n').filter(Boolean).map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {service.faq && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mt-16"
                      >
                        <h2 className="font-heading text-3xl text-graphite mb-8">Часто задаваемые вопросы</h2>
                        <div className="space-y-6">
                          {service.faq.split('\n\n').filter(Boolean).map((item, index) => {
                            const [question, ...answerParts] = item.split('\n');
                            const answer = answerParts.join('\n');

                            return (
                              <div key={index} className="bg-background p-6 rounded-lg">
                                <h3 className="font-heading text-xl text-graphite mb-3">{question}</h3>
                                <p className="font-paragraph text-steel-gray leading-relaxed">{answer}</p>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-white p-8 rounded-lg shadow-xl sticky top-24">
                      <h3 className="font-heading text-2xl text-graphite mb-6">Заказать услугу</h3>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Input
                            type="text"
                            placeholder="Ваше имя *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <Input
                            type="email"
                            placeholder="Email *"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <Input
                            type="tel"
                            placeholder="Телефон *"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <Input
                            type="text"
                            placeholder="Компания"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          />
                        </div>

                        <div>
                          <Textarea
                            placeholder="Опишите вашу задачу"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={4}
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-paragraph py-6"
                        >
                          Отправить заявку
                        </Button>
                      </form>

                      <div className="mt-8 pt-8 border-t border-background">
                        <p className="font-paragraph text-sm text-steel-gray mb-4">
                          Или свяжитесь с нами напрямую:
                        </p>

                        <div className="space-y-3">
                          <a href="tel:+78126403996" className="block font-paragraph text-graphite hover:text-primary transition-colors">
                            +7 (812) 640-39-96
                          </a>
                          <a href="mailto:info@cnc.su" className="block font-paragraph text-graphite hover:text-primary transition-colors">
                            info@cnc.su
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-16 bg-dark-blue text-primary-foreground">
              <div className="max-w-[100rem] mx-auto px-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="font-heading text-4xl mb-6">Готовы начать проект?</h2>
                  <p className="font-paragraph text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                    Свяжитесь с нами для получения консультации и расчета стоимости
                  </p>
                  <Link to="/contacts">
                    <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-paragraph text-lg px-8 py-6 h-auto">
                      Связаться с нами
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </section>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
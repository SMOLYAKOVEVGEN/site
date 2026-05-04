import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Image } from '@/components/ui/image';
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

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  usePageMeta({
    title: 'Инженерные услуги',
    description: 'Комплексная техническая поддержка производства: проектирование, монтаж, пусконаладка, сервисное обслуживание оборудования.',
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
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
        .order('created_at', { ascending: true });

      if (error) throw error;

      setServices((data as ServiceRow[]) || []);
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main">
      <section className="bg-dark-blue text-primary-foreground py-20">
        <div className="max-w-[100rem] mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-5xl lg:text-6xl mb-6">
              Инженерные услуги
            </h1>
            <p className="font-paragraph text-xl text-primary-foreground/90 max-w-3xl">
              Комплексная техническая поддержка вашего производства от проектирования до сервисного обслуживания
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24" style={{ minHeight: '600px' }}>
        <div className="max-w-[100rem] mx-auto px-8">
          {isLoading ? (
            <div className="text-center py-16 text-steel-gray font-paragraph">
              Загрузка услуг...
            </div>
          ) : services.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Link to={`/services/${service.slug}`} className="group block h-full">
                    <div className="bg-white rounded-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 h-full flex flex-col">
                      <div className="relative h-72 overflow-hidden">
                        <Image
                          src={
                            service.hero_image ||
                            '/fallback-logo.png'
                          }
                          alt={service.service_name || 'Service'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          width={800}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-graphite/90 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                          <h2 className="font-heading text-3xl text-white mb-2">
                            {service.service_name}
                          </h2>
                          <p className="font-paragraph text-primary-foreground/90">
                            {service.short_description}
                          </p>
                        </div>
                      </div>

                      <div className="p-8 flex-1 flex flex-col">
                        <p className="font-paragraph text-steel-gray mb-6 flex-1 leading-relaxed">
                          {service.description
                            ? `${service.description.substring(0, 200)}...`
                            : 'Описание услуги скоро появится.'}
                        </p>

                        <div className="flex items-center text-primary group-hover:text-secondary transition-colors">
                          <span className="font-paragraph font-medium">Подробнее об услуге</span>
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-steel-gray font-paragraph">
              Услуги пока не найдены.
            </div>
          )}
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
}
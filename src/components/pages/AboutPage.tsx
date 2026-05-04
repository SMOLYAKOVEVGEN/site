import { motion } from 'framer-motion';
import { Award, Users, Target, TrendingUp, CheckCircle } from 'lucide-react';
import { Image } from '@/components/ui/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePageMeta } from '@/lib/use-page-meta';

export default function AboutPage() {
  usePageMeta({
    title: 'О компании',
    description: 'АВТОграф — поставщик металлорежущего инструмента и инженерных решений для производственных предприятий России с 2005 года.',
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main">
      {/* Hero Section */}
      <section className="relative bg-graphite text-primary-foreground overflow-hidden" style={{ minHeight: '60vh' }}>
        <div className="absolute inset-0 opacity-20">
          <Image 
            src="/fallback-logo.png" 
            alt="Company background"
            className="w-full h-full object-cover"
            width={1920}
          />
        </div>
        <div className="relative max-w-[100rem] mx-auto px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-5xl lg:text-6xl mb-6">
              О компании
            </h1>
            <p className="font-paragraph text-xl text-primary-foreground/90 max-w-3xl">
              Надежный партнер в области инструментальных решений для промышленных предприятий
            </p>
          </motion.div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-24 bg-white">
        <div className="max-w-[100rem] mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-heading text-4xl text-graphite mb-6">
                Наша история
              </h2>
              <div className="space-y-4 font-paragraph text-lg text-steel-gray leading-relaxed">
                <p>
                  «АВТОграф Инструментальные Решения» — это команда профессионалов с многолетним опытом работы в области поставок металлорежущего инструмента и промышленного оборудования.
                </p>
                <p>
                  Мы начинали как небольшая компания, специализирующаяся на поставках инструмента для местных производств. Сегодня мы выросли в надежного партнера для крупных промышленных предприятий по всей России.
                </p>
                <p>
                  Наш успех основан на глубоком понимании потребностей производственных предприятий, прямых контактах с ведущими мировыми производителями и стремлении к долгосрочному партнерству с нашими клиентами.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Image 
                src="/fallback-logo.png"
                alt="Company history"
                className="w-full h-auto rounded-lg shadow-xl"
                width={800}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-24 bg-background">
        <div className="max-w-[100rem] mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl lg:text-5xl text-graphite mb-6">
              Миссия и ценности
            </h2>
            <p className="font-paragraph text-xl text-steel-gray max-w-3xl mx-auto">
              Принципы, которыми мы руководствуемся в работе
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Target,
                title: 'Миссия',
                description: 'Обеспечивать промышленные предприятия качественным инструментом и комплексными решениями для повышения эффективности производства'
              },
              {
                icon: Award,
                title: 'Качество',
                description: 'Работаем только с проверенными производителями и гарантируем подлинность всей продукции'
              },
              {
                icon: Users,
                title: 'Партнерство',
                description: 'Строим долгосрочные отношения с клиентами, основанные на доверии и взаимной выгоде'
              },
              {
                icon: TrendingUp,
                title: 'Развитие',
                description: 'Постоянно расширяем ассортимент и совершенствуем сервис для наших клиентов'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-8 rounded-lg hover:shadow-xl transition-shadow duration-300"
              >
                <item.icon className="w-12 h-12 text-primary mb-6" />
                <h3 className="font-heading text-2xl text-graphite mb-4">
                  {item.title}
                </h3>
                <p className="font-paragraph text-steel-gray leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Competencies */}
      <section className="py-24 bg-white">
        <div className="max-w-[100rem] mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl lg:text-5xl text-graphite mb-6">
              Наши компетенции
            </h2>
            <p className="font-paragraph text-xl text-steel-gray max-w-3xl mx-auto">
              Что мы умеем делать лучше всего
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              'Комплексные поставки металлорежущего инструмента',
              'Подбор оптимальных решений для конкретных задач',
              'Техническая поддержка и консультации',
              'Ремонт и обслуживание оборудования',
              'Изготовление инструмента на заказ',
              'Комплектация производственных участков',
              'Обучение персонала работе с инструментом',
              'Оптимизация технологических процессов'
            ].map((competency, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex items-start gap-4 bg-background p-6 rounded-lg"
              >
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <p className="font-paragraph text-graphite text-lg">
                  {competency}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-24 bg-dark-blue text-primary-foreground">
        <div className="max-w-[100rem] mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl lg:text-5xl mb-6">
              Цифры и факты
            </h2>
            <p className="font-paragraph text-xl text-primary-foreground/90 max-w-3xl mx-auto">
              Наши достижения в цифрах
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { number: '15+', label: 'Лет на рынке' },
              { number: '500+', label: 'Постоянных клиентов' },
              { number: '50 000+', label: 'Наименований в каталоге' },
              { number: '50+', label: 'Брендов-партнеров' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="font-heading text-5xl lg:text-6xl text-secondary mb-4">
                  {stat.number}
                </div>
                <p className="font-paragraph text-xl text-primary-foreground/90">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificates */}
      <section className="py-24 bg-background">
        <div className="max-w-[100rem] mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl lg:text-5xl text-graphite mb-6">
              Сертификаты и партнерства
            </h2>
            <p className="font-paragraph text-xl text-steel-gray max-w-3xl mx-auto">
              Официальные дистрибьюторские соглашения и сертификаты качества
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-8 rounded-lg shadow-lg"
              >
                <Image 
                  src="/fallback-logo.png"
                  alt={`Certificate ${item}`}
                  className="w-full h-auto"
                  width={400}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
}

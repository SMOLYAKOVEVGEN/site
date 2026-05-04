import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  FileText,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { usePageMeta } from '@/lib/use-page-meta';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const paymentMethods = [
  {
    icon: Building2,
    title: 'Безналичный расчёт',
    description:
      'Для юридических лиц доступна оплата заказа по безналичному расчету. При оформлении заказа вы сможете создать учетную запись, чтобы не вводить платежные реквизиты повторно при следующих заказах.',
  },
  {
    icon: CreditCard,
    title: 'Оплата банковской картой',
    description:
      'Оплата банковской картой доступна в случае самовывоза со склада компании «АВТОграф Инструментальные Решения» или из её региональных представительств.',
  },
];

const advantages = [
  'Для юридических лиц после оформления заказа счет можно скачать в личном кабинете.',
  'Рекомендуем указывать номер телефона, чтобы менеджер мог оперативно уточнить условия доставки и детали заказа.',
  'Список городов, где доступны офисы, магазины и склады компаний-поставщиков, размещен на странице «Контакты».',
];

export default function PaymentPage() {
  usePageMeta({
    title: 'Оплата',
    description: 'Информация об оплате заказов.',
  });
  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />

      <section className="py-8 sm:py-10 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-[28px] border border-border bg-graphite text-primary-foreground py-14 sm:py-20 lg:py-24 px-6 sm:px-8 lg:px-12 overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%)]" />

            <div className="relative max-w-4xl">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-primary-foreground/80 mb-6">
                Информация для покупателей
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl leading-tight mb-5">
                Условия оплаты
              </h1>

              <p className="font-paragraph text-base sm:text-xl text-primary-foreground/85 leading-relaxed max-w-3xl">
                Выберите удобный способ оплаты заказа. Для юридических и физических
                лиц доступны разные варианты в зависимости от формата оформления и
                способа получения товара.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl px-6 h-12 text-base"
                >
                  <Link to="/catalog">
                    Перейти в каталог
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-6 h-12 text-base border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/contacts">Контакты и представительства</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-12 sm:pb-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
            {paymentMethods.map((method, index) => {
              const Icon = method.icon;

              return (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  className="rounded-2xl border border-border bg-white p-6 sm:p-8 lg:p-10 shadow-[0_10px_34px_rgba(18,57,112,0.05)]"
                >
                  <div className="w-14 h-14 rounded-2xl border border-border bg-[#f5f8fc] text-primary flex items-center justify-center mb-6">
                    <Icon className="h-7 w-7" />
                  </div>

                  <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-4">
                    {method.title}
                  </h2>

                  <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                    {method.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-12 sm:pb-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="rounded-[28px] border border-border bg-white p-6 sm:p-8 lg:p-10 shadow-[0_10px_34px_rgba(18,57,112,0.05)]"
          >
            <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-10">
              <div className="rounded-2xl border border-border bg-[#f8fafc] p-6 sm:p-8">
                <div className="w-14 h-14 rounded-2xl border border-border bg-white text-primary flex items-center justify-center mb-6">
                  <FileText className="h-7 w-7" />
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-4">
                  Для юридических лиц
                </h2>

                <div className="space-y-4 font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                  <p>
                    При оформлении заказа юридическое лицо может сохранить данные
                    учетной записи, чтобы в дальнейшем не вводить платежные
                    реквизиты повторно.
                  </p>
                  <p>
                    После завершения оформления заказа счет будет доступен для
                    скачивания в личном кабинете.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-6 sm:p-8">
                <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-6">
                  Важная информация
                </h2>

                <div className="space-y-4">
                  {advantages.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-[#f8fafc] p-4"
                    >
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-primary shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-border bg-primary/5 p-5 sm:p-6">
                  <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                    Оплата банковской картой применяется только при самовывозе.
                    Для уточнения деталей получения заказа и доступных вариантов
                    оплаты с вами может связаться менеджер.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-14 sm:pb-24">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="rounded-[28px] border border-border bg-graphite text-primary-foreground p-6 sm:p-8 lg:p-12 overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%)]" />

            <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <h2 className="font-heading text-2xl sm:text-4xl mb-4 leading-tight">
                  Нужна помощь с выбором способа оплаты?
                </h2>

                <p className="font-paragraph text-sm sm:text-lg text-primary-foreground/85 leading-relaxed max-w-3xl">
                  Свяжитесь с нами — подскажем, какой вариант оплаты подойдет для
                  вашего заказа, и уточним условия получения товара.
                </p>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 mt-6 text-sm sm:text-base">
                  <a
                    href="tel:+78126403996"
                    className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    +7 (812) 640-39-96
                  </a>

                  <a
                    href="mailto:info@cnc.su"
                    className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    info@cnc.su
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl px-6 h-12 text-base"
                >
                  <Link to="/contacts">Связаться с нами</Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-6 h-12 text-base border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/help">Как оформить заказ</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
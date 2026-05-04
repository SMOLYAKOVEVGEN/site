import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  UserRound,
  Truck,
  CreditCard,
  FileText,
  CheckCircle2,
  ArrowRight,
  Mail,
  Phone,
} from 'lucide-react';
import { usePageMeta } from '@/lib/use-page-meta';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const orderSteps = [
  {
    icon: UserRound,
    title: 'Регистрация и вход',
    description:
      'Если у вас уже есть аккаунт, авторизуйтесь в личном кабинете. Если вы на сайте впервые, зарегистрируйтесь и укажите тип клиента: юридическое или физическое лицо.',
  },
  {
    icon: ShoppingCart,
    title: 'Добавление товаров в корзину',
    description:
      'Выберите нужные позиции, добавьте их в корзину и перейдите к оформлению заказа.',
  },
  {
    icon: FileText,
    title: 'Заполнение данных',
    description:
      'При оформлении заказа заполните данные покупателя. Для юридических лиц — реквизиты организации, для физических лиц — ФИО, телефон и e-mail.',
  },
  {
    icon: Truck,
    title: 'Выбор доставки',
    description:
      'Выберите удобный способ получения: самовывоз или доставка транспортной компанией.',
  },
  {
    icon: CreditCard,
    title: 'Выбор способа оплаты',
    description:
      'Для юридических лиц доступен безналичный расчет. Оплата банковской картой доступна при самовывозе.',
  },
  {
    icon: CheckCircle2,
    title: 'Подтверждение заказа',
    description:
      'Проверьте данные, подтвердите заказ и ожидайте обратной связи от менеджера в рабочее время.',
  },
];

const deliveryOptions = [
  {
    title: 'Самовывоз',
    text: 'Вы можете самостоятельно забрать товар со склада компании «АВТОграф Инструментальные Решения» или из региональных представительств.',
  },
  {
    title: 'Доставка транспортной компанией',
    text: 'Мы сотрудничаем с большинством российских транспортных компаний, чтобы вы могли выбрать наиболее удобный вариант получения заказа.',
  },
];

const paymentOptions = [
  {
    title: 'Безналичный расчет',
    text: 'Для юридических лиц доступна оплата по безналичному расчету. После оформления заказа счет можно скачать в личном кабинете.',
  },
  {
    title: 'Оплата банковской картой',
    text: 'Оплата картой доступна в случае самовывоза со склада компании «АВТОграф Инструментальные Решения» или из ее региональных представительств.',
  },
];

export default function HelpPage() {
  usePageMeta({
    title: 'Помощь',
    description: 'Справочная информация по работе с сайтом и заказам.',
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
                Помощь
              </h1>

              <p className="font-paragraph text-base sm:text-xl text-primary-foreground/85 leading-relaxed max-w-3xl">
                На этой странице собрана основная информация по оформлению заказа,
                регистрации, доставке и оплате. Мы сделали процесс покупки простым,
                понятным и удобным для физических и юридических лиц.
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
                  <Link to="/contacts#request-form">Связаться с менеджером</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-12 sm:pb-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-10"
          >
            <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 lg:p-10 shadow-[0_10px_40px_rgba(18,57,112,0.06)]">
              <h2 className="font-heading text-2xl sm:text-4xl text-graphite mb-6">
                Как оформить заказ
              </h2>

              <div className="space-y-5 text-steel-gray font-paragraph leading-relaxed text-sm sm:text-base">
                <p>
                  Если вы уже совершали покупки на нашем сайте, рекомендуем сразу
                  авторизоваться через личный кабинет. В этом случае часть полей
                  при оформлении заказа будет заполнена автоматически.
                </p>

                <p>
                  Если пароль утерян, воспользуйтесь функцией восстановления
                  доступа. Новый пароль будет отправлен на e-mail, указанный при
                  регистрации.
                </p>

                <p>
                  Если вы впервые оформляете заказ, зарегистрируйтесь на сайте.
                  При регистрации необходимо выбрать тип клиента: юридическое лицо
                  или физическое лицо. От этого зависит состав полей в личном
                  кабинете и при оформлении заказа.
                </p>

                <div className="rounded-2xl bg-[#f6f8fb] border border-border p-5 sm:p-6">
                  <div className="font-heading text-lg text-graphite mb-3">
                    Важно
                  </div>
                  <p className="text-sm sm:text-base text-steel-gray leading-relaxed">
                    Для юридических лиц в форме заказа должны быть доступны поля
                    для реквизитов организации. Для физических лиц — персональные
                    контактные данные покупателя.
                  </p>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="bg-gradient-to-br from-primary to-[#163e73] text-white rounded-2xl border border-border p-6 sm:p-8 lg:p-10 shadow-[0_16px_48px_rgba(18,57,112,0.18)]"
            >
              <h2 className="font-heading text-2xl sm:text-3xl mb-6">
                Что потребуется для оформления
              </h2>

              <div className="space-y-5 font-paragraph text-white/90 leading-relaxed text-sm sm:text-base">
                <div>
                  <div className="font-heading text-white text-lg mb-2">
                    Для юридических лиц
                  </div>
                  <p>
                    Укажите реквизиты организации и контактный номер телефона,
                    чтобы менеджер мог оперативно согласовать детали поставки.
                  </p>
                </div>

                <div className="h-px bg-white/15" />

                <div>
                  <div className="font-heading text-white text-lg mb-2">
                    Для физических лиц
                  </div>
                  <p>
                    Укажите ФИО, e-mail и номер телефона. При необходимости в
                    комментарии можно добавить сведения, важные для доставки.
                  </p>
                </div>

                <div className="h-px bg-white/15" />

                <div>
                  <div className="font-heading text-white text-lg mb-2">
                    После оформления
                  </div>
                  <p>
                    Наш менеджер в рабочие часы обязательно свяжется с вами для
                    уточнения условий доставки, оплаты и других деталей заказа.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
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
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-heading text-2xl sm:text-4xl text-graphite mb-3">
                  Пошаговое оформление заказа
                </h2>
                <p className="font-paragraph text-steel-gray text-sm sm:text-base max-w-3xl leading-relaxed">
                  Ниже показана последовательность оформления заказа на сайте —
                  от регистрации до подтверждения заявки.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {orderSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.05 }}
                    className="group rounded-2xl bg-white border border-border p-6 sm:p-7 shadow-[0_8px_30px_rgba(18,57,112,0.05)] hover:shadow-[0_14px_36px_rgba(18,57,112,0.10)] transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl border border-border bg-[#f2f6fb] text-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="font-heading text-sm text-primary/50">
                        Шаг {index + 1}
                      </div>
                    </div>

                    <h3 className="font-heading text-xl text-graphite mb-3 leading-snug">
                      {step.title}
                    </h3>

                    <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-12 sm:pb-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="bg-white rounded-2xl border border-border p-6 sm:p-8 lg:p-10 shadow-[0_10px_34px_rgba(18,57,112,0.05)]"
            >
              <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-6">
                Доставка
              </h2>

              <div className="space-y-6">
                {deliveryOptions.map((item) => (
                  <div key={item.title} className="rounded-2xl bg-[#f8fafc] border border-border p-5">
                    <h3 className="font-heading text-lg sm:text-xl text-graphite mb-3">
                      {item.title}
                    </h3>
                    <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-primary/5 border border-border p-5 sm:p-6">
                <div className="font-heading text-lg text-graphite mb-3">
                  Условия доставки транспортной компанией
                </div>

                <ul className="space-y-3 font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                  <li>
                    Бесплатная доставка до терминала транспортной компании в вашем
                    городе при заказе от 20 000 рублей.
                  </li>
                  <li>
                    Для оформления бесплатной доставки напишите менеджеру или на
                    почту info@cnc.su информацию по отправке груза и номер счета.
                  </li>
                  <li>
                    Мы бесплатно доставим товар до терминала транспортной компании
                    в г. Санкт-Петербург.
                  </li>
                  <li>
                    Стоимость перевозки между терминалами оплачивается отдельно по
                    тарифу выбранной транспортной компании.
                  </li>
                  <li>
                    Рекомендуем указывать в комментариях к заказу предпочитаемые
                    транспортные компании.
                  </li>
                </ul>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.06 }}
              className="bg-white rounded-2xl border border-border p-6 sm:p-8 lg:p-10 shadow-[0_10px_34px_rgba(18,57,112,0.05)]"
            >
              <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-6">
                Оплата
              </h2>

              <div className="space-y-6">
                {paymentOptions.map((item) => (
                  <div key={item.title} className="rounded-2xl bg-[#f8fafc] border border-border p-5">
                    <h3 className="font-heading text-lg sm:text-xl text-graphite mb-3">
                      {item.title}
                    </h3>
                    <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-[#f6f8fb] border border-border p-5 sm:p-6">
                <div className="font-heading text-lg text-graphite mb-3">
                  Дополнительно
                </div>

                <div className="space-y-3 font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed">
                  <p>
                    После заполнения данных покупателя проверьте позиции заказа,
                    местоположение, выбранный способ доставки и контактную
                    информацию.
                  </p>
                  <p>
                    Перед завершением оформления необходимо подтвердить согласие
                    на обработку персональных данных.
                  </p>
                  <p>
                    После отправки заказа при необходимости менеджер свяжется с
                    вами для уточнения деталей.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
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
                  Остались вопросы по оформлению заказа?
                </h2>

                <p className="font-paragraph text-sm sm:text-lg text-primary-foreground/85 leading-relaxed max-w-3xl">
                  Напишите нам или свяжитесь с менеджером. Мы поможем выбрать
                  способ оплаты, уточним условия доставки и подскажем, как быстрее
                  оформить заказ.
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
                  <Link to="/contacts#request-form">Написать нам</Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-6 h-12 text-base border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/catalog">Открыть каталог</Link>
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
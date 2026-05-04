import { Link } from 'react-router-dom';
import { Phone, Mail, Send, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-graphite text-primary-foreground">
      <div className="max-w-[100rem] mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 sm:gap-10 mb-8 sm:mb-12">
          <div>
            <h3 className="font-heading text-lg sm:text-xl mb-4 sm:mb-6">Информация</h3>

            <ul className="space-y-3">
              <li>
                <Link
                  to="/help"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Помощь
                </Link>
              </li>
              <li>
                <Link
                  to="/payment"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Условия оплаты
                </Link>
              </li>
              <li>
                <Link
                  to="/delivery"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Условия доставки
                </Link>
              </li>
              <li>
                <Link
                  to="/warranty"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Гарантия на товар
                </Link>
              </li>
              <li>
                <Link
                  to="/cookies"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Политика использования файлов cookie
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Политика конфиденциальности
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-lg sm:text-xl mb-4 sm:mb-6">Компания</h3>

            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  О компании
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Услуги
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Отраслевые решения
                </Link>
              </li>
              <li>
                <Link
                  to="/brands"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Бренды
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Блог
                </Link>
              </li>
              <li>
                <Link
                  to="/requisites"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Реквизиты
                </Link>
              </li>
              <li>
                <Link
                  to="/licenses-certificates"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Лицензии и сертификаты
                </Link>
              </li>
              <li>
                <Link
                  to="/contacts"
                  className="font-paragraph text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h3 className="font-heading text-lg sm:text-xl">Адреса филиалов и представительств</h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] border border-white/10 overflow-hidden">
              <div className="bg-white/5">
                <div className="p-5 border-b border-white/10">
                  <div className="font-paragraph text-sm text-white leading-relaxed">
                    Центральный офис, г. Санкт-Петербург, ул. Заусадебная, д. 15, строение 5
                  </div>
                  <div className="font-paragraph text-sm text-white/60 mt-2">+7 (812) 640-39-96</div>
                </div>

                <div className="p-5 border-b border-white/10">
                  <div className="font-paragraph text-sm text-white leading-relaxed">
                    Екатеринбург, ул. Академика Вонсовского, д. 1-А
                  </div>
                  <div className="font-paragraph text-sm text-white/60 mt-2">+7 (812) 640-39-96</div>
                </div>

                <div className="p-5 border-b border-white/10">
                  <div className="font-paragraph text-sm text-white leading-relaxed">
                    Казань, ул. Михаила Миля, д. 33-А
                  </div>
                  <div className="font-paragraph text-sm text-white/60 mt-2">+7 (843) 2-111-900</div>
                  <div className="font-paragraph text-sm text-white/60 mt-1">+7 (929) 118-43-40</div>
                </div>

                <div className="p-5">
                  <div className="font-paragraph text-sm text-white leading-relaxed">
                    Краснодар, ул. Шевченко, 152/2
                  </div>
                  <div className="font-paragraph text-sm text-white/60 mt-2">+7 (911) 194-67-47</div>
                </div>
              </div>

              <div className="relative min-h-[320px] bg-white/5">
                <iframe
                  src="https://yandex.ru/map-widget/v1/?um=constructor%3A4f95d86a8eee97cb53e1462594aef163210b74749234127d4e223eb788352814&amp;source=constructor"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  title="Карта филиалов и представительств"
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-6 sm:pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <div className="font-heading text-sm mb-2">Адрес</div>
              <div className="font-paragraph text-sm text-primary-foreground/70 leading-relaxed">
                г. Санкт-Петербург,
                <br />
                ул. Заусадебная, д. 15,
                <br />
                стр. 5
              </div>
            </div>

            <div>
              <div className="font-heading text-sm mb-2">График работы</div>
              <div className="font-paragraph text-sm text-primary-foreground/70 leading-relaxed">
                Пн–Пт: 9:00–18:00
                <br />
                Сб–Вс: выходной
              </div>
            </div>

            <div>
              <div className="font-heading text-sm mb-2">Контакты</div>
              <div className="space-y-2">
                <a
                  href="tel:+78126403996"
                  className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>+7 (812) 640-39-96</span>
                </a>

                <a
                  href="mailto:info@cnc.su"
                  className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span>info@cnc.su</span>
                </a>
              </div>
            </div>

            <div>
              <div className="font-heading text-sm mb-2">Мессенджеры</div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Telegram"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-secondary text-white flex items-center justify-center transition-colors"
                >
                  <Send className="h-4 w-4" />
                </a>

                <a
                  href="https://wa.me/78126403996"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-secondary text-white flex items-center justify-center transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>

                <a
                  href="mailto:info@cnc.su"
                  aria-label="Email"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-secondary text-white flex items-center justify-center transition-colors"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-8 pt-6">
          <div className="space-y-4">
            <p className="font-paragraph text-primary-foreground/60 text-sm">
              © 2026 ООО «АВТОграф Инструментальные Решения»
            </p>

            <p className="font-paragraph text-primary-foreground/55 text-sm leading-relaxed">
              Информация на данном интернет-сайте носит исключительно ознакомительный характер и ни при каких условиях не является публичной офертой, определяемой положениями Статьи 437 Гражданского кодекса РФ. Поставщик оставляет за собой право без предварительного уведомления вносить изменения в стоимость, конструкцию и комплектацию изделий.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

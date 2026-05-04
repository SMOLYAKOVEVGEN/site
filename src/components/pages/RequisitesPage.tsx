import { motion } from 'framer-motion';
import { Building2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePageMeta } from '@/lib/use-page-meta';

export default function RequisitesPage() {
  usePageMeta({
    title: 'Реквизиты',
    description: 'Юридические реквизиты компании АВТОграф.',
  });
  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />
      
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <Building2 className="h-12 w-12 text-primary" />
              <h1 className="font-heading text-5xl text-graphite">
                Реквизиты компании
              </h1>
            </div>

            <div className="bg-white p-8 lg:p-12 rounded-lg shadow-xl mb-8">
              <div className="space-y-8">
                <div>
                  <h2 className="font-heading text-2xl text-graphite mb-6">Общая информация</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Полное наименование</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">
                        Общество с ограниченной ответственностью «АВТОграф Инструментальные Решения»
                      </p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Сокращенное наименование</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">
                        ООО «АВТОграф Инструментальные Решения»
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-background pt-8">
                  <h2 className="font-heading text-2xl text-graphite mb-6">Регистрационные данные</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">ИНН</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">7800000000</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">КПП</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">780001001</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">ОГРН</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">1234567890123</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">ОКПО</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">12345678</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-background pt-8">
                  <h2 className="font-heading text-2xl text-graphite mb-6">Юридический адрес</h2>
                  <p className="font-paragraph text-lg text-graphite">
                    190000, Российская Федерация, г. Санкт-Петербург, ул. Заусадебная, д. 15, строение 5
                  </p>
                </div>

                <div className="border-t border-background pt-8">
                  <h2 className="font-heading text-2xl text-graphite mb-6">Фактический адрес</h2>
                  <p className="font-paragraph text-lg text-graphite">
                    190000, Российская Федерация, г. Санкт-Петербург, ул. Заусадебная, д. 15, строение 5
                  </p>
                </div>

                <div className="border-t border-background pt-8">
                  <h2 className="font-heading text-2xl text-graphite mb-6">Банковские реквизиты</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Расчетный счет</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">40702810000000000000</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Корреспондентский счет</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">30101810000000000000</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Наименование банка</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">ПАО «Банк» г. Санкт-Петербург</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">БИК</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">044030000</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-background pt-8">
                  <h2 className="font-heading text-2xl text-graphite mb-6">Контактная информация</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Телефон</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">+7 (812) 640-39-96</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Email</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">info@cnc.su</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Веб-сайт</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">cnc.su</p>
                    </div>
                    <div>
                      <p className="font-paragraph text-sm text-steel-gray mb-2">Генеральный директор</p>
                      <p className="font-paragraph text-lg text-graphite font-medium">Иванов Иван Иванович</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-paragraph">
                <Download className="mr-2 h-5 w-5" />
                Скачать реквизиты (PDF)
              </Button>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-paragraph">
                <FileText className="mr-2 h-5 w-5" />
                Скачать карточку предприятия
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

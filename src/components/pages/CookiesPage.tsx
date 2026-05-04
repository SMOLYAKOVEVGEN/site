import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePageMeta } from '@/lib/use-page-meta';

export default function CookiesPage() {
  usePageMeta({
    title: 'Cookie',
    description: 'Информация об использовании cookie на сайте.',
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
            <h1 className="font-heading text-5xl text-graphite mb-8">
              Политика использования cookie
            </h1>

            <div className="prose prose-lg max-w-none font-paragraph text-steel-gray leading-relaxed space-y-6">
              <p className="text-lg">
                Настоящая Политика использования cookie-файлов (далее – Политика) описывает, как ООО «АВТОграф Инструментальные Решения» использует cookie-файлы и аналогичные технологии на своем веб-сайте.
              </p>

              <h2 className="font-heading text-3xl text-graphite mt-12 mb-4">1. Что такое cookie?</h2>
              <p>
                Cookie (куки) – это небольшие текстовые файлы, которые сохраняются на вашем устройстве (компьютере, планшете или мобильном телефоне) при посещении веб-сайта. Cookie-файлы широко используются для обеспечения работы веб-сайтов или повышения эффективности их работы, а также для предоставления информации владельцам сайта.
              </p>

              <h2 className="font-heading text-3xl text-graphite mt-12 mb-4">2. Какие cookie мы используем?</h2>
              
              <h3 className="font-heading text-2xl text-graphite mt-8 mb-3">Необходимые cookie</h3>
              <p>
                Эти cookie-файлы необходимы для работы веб-сайта и не могут быть отключены в наших системах. Обычно они устанавливаются только в ответ на ваши действия, равнозначные запросу услуг, такие как настройка параметров конфиденциальности, вход в систему или заполнение форм.
              </p>

              <h3 className="font-heading text-2xl text-graphite mt-8 mb-3">Функциональные cookie</h3>
              <p>
                Эти cookie-файлы позволяют веб-сайту предоставлять расширенные функциональные возможности и персонализацию. Они могут устанавливаться нами или сторонними поставщиками услуг, услуги которых мы добавили на наши страницы.
              </p>

              <h3 className="font-heading text-2xl text-graphite mt-8 mb-3">Аналитические cookie</h3>
              <p>
                Эти cookie-файлы позволяют нам подсчитывать посещения и источники трафика, чтобы мы могли измерять и улучшать производительность нашего сайта. Они помогают нам узнать, какие страницы наиболее и наименее популярны, и увидеть, как посетители перемещаются по сайту.
              </p>

              <h2 className="font-heading text-3xl text-graphite mt-12 mb-4">3. Цели использования cookie</h2>
              <p>
                Мы используем cookie-файлы для следующих целей:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Обеспечение функционирования веб-сайта</li>
                <li>Улучшение пользовательского опыта</li>
                <li>Анализ использования веб-сайта</li>
                <li>Персонализация контента</li>
                <li>Запоминание ваших предпочтений</li>
              </ul>

              <h2 className="font-heading text-3xl text-graphite mt-12 mb-4">4. Управление cookie</h2>
              <p>
                Вы можете контролировать и/или удалять cookie-файлы по своему усмотрению. Вы можете удалить все cookie-файлы, которые уже находятся на вашем компьютере, и настроить большинство браузеров так, чтобы они не сохранялись.
              </p>
              <p>
                Однако в этом случае вам, возможно, придется вручную настраивать некоторые параметры при каждом посещении сайта, и некоторые услуги и функции могут не работать.
              </p>

              <h2 className="font-heading text-3xl text-graphite mt-12 mb-4">5. Сторонние cookie</h2>
              <p>
                Наш веб-сайт может содержать встроенный контент от сторонних сервисов (например, видео, карты, формы обратной связи). При посещении страниц с таким контентом эти сторонние сервисы могут устанавливать свои cookie-файлы.
              </p>
              <p>
                Мы не контролируем установку этих cookie-файлов и рекомендуем вам ознакомиться с политиками конфиденциальности соответствующих сторонних сервисов.
              </p>

              <h2 className="font-heading text-3xl text-graphite mt-12 mb-4">6. Изменения в политике</h2>
              <p>
                Мы можем периодически обновлять настоящую Политику. Мы рекомендуем вам периодически просматривать эту страницу для получения актуальной информации о том, как мы используем cookie-файлы.
              </p>

              <h2 className="font-heading text-3xl text-graphite mt-12 mb-4">7. Контактная информация</h2>
              <p>
                Если у вас есть вопросы относительно использования cookie-файлов на нашем веб-сайте, пожалуйста, свяжитесь с нами:
              </p>
              <ul className="list-none space-y-2">
                <li>Email: info@cnc.su</li>
                <li>Телефон: +7 (812) 640-39-96</li>
                <li>Адрес: г. Санкт-Петербург, ул. Заусадебная, д. 15, стр. 5</li>
              </ul>

              <p className="mt-12 text-sm text-steel-gray">
                Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

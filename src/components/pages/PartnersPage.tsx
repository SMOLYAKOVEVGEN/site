import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Image } from '@/components/ui/image';
import { usePageMeta } from '@/lib/use-page-meta';

type OfficialPartner = {
  id: string;
  name: string;
  logo: string;
  description: string;
  address: string;
  phones: string[];
  emails: string[];
  website?: string;
};

const officialPartners: OfficialPartner[] = [
  {
    id: 'qptool',
    name: 'ООО «КупиТул»',
    logo: 'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/official-partners/qptool.png',
    description:
      'ООО «КупиТул» — официальный поставщик металлорежущего инструмента, станочной оснастки, смазочно-охлаждающих жидкостей в Уральском федеральном округе.',
    address: '620144, Россия, Екатеринбург, ул. Московская, д. 195, оф. 1026',
    phones: ['+7 (343) 302-00-96', '+7 (912) 051-82-21'],
    emails: ['info@qptool.ru', 'qptool@mail.ru'],
  },
  {
    id: 'incut',
    name: 'ООО «Инкат»',
    logo: 'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/official-partners/incut.jpg',
    description:
      'ООО «Инкат» — официальный поставщик металлорежущего инструмента, станочной оснастки, смазочно-охлаждающих жидкостей в Санкт-Петербурге.',
    address: '195248, г. Санкт-Петербург, проспект Энергетиков, дом 37, литер А, офис 916',
    phones: ['+7 (812) 245-65-66'],
    emails: ['info@incut.ru'],
  },
];

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export default function PartnersPage() {
  usePageMeta({
    title: 'Партнеры',
    description:
      'Официальные партнеры и представители ООО «АВТОграф Инструментальные Решения».',
  });

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      <Header />

      <main id="main">
        <section className="bg-graphite py-12 text-primary-foreground sm:py-20">
          <div className="mx-auto max-w-[100rem] px-4 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-4 text-sm text-white/70">
                <Link to="/" className="transition-colors hover:text-white">
                  Главная
                </Link>
                <span className="mx-2">/</span>
                <span>Партнеры</span>
              </div>

              <div className="mb-7 h-[2px] w-20 bg-secondary" />

              <h1 className="mb-4 max-w-5xl font-heading text-4xl leading-tight sm:mb-6 sm:text-6xl lg:text-7xl">
                Официальные партнеры
              </h1>

              <p className="max-w-4xl font-paragraph text-base leading-relaxed text-primary-foreground/85 sm:text-xl">
                Официальные партнеры и представители ООО «АВТОграф Инструментальные Решения» в регионах России.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-10 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[100rem] px-4 sm:px-8">
            <h2 className="mb-10 font-heading text-2xl leading-tight text-graphite sm:text-4xl">
              Официальные партнеры и представители ООО «АВТОграф Инструментальные Решения»
            </h2>

            <div className="divide-y divide-[#d9dde3] border-y border-[#d9dde3]">
              {officialPartners.map((partner, index) => (
                <motion.article
                  key={partner.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.2) }}
                  className="py-8 sm:py-10"
                >
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center">
                    <div className="flex min-h-[150px] items-center justify-center bg-white p-4">
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        fittingType="fit"
                        className="max-h-[120px] max-w-full"
                        width={320}
                      />
                    </div>

                    <div>
                      <h3 className="mb-4 font-heading text-xl leading-snug text-graphite sm:text-2xl">
                        {partner.description}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-8 max-w-4xl font-paragraph text-base leading-relaxed text-graphite sm:text-lg">
                    <p>{partner.address}</p>

                    {partner.phones.length > 0 && (
                      <p className="mt-2">
                        Тел.:{' '}
                        {partner.phones.map((phone, phoneIndex) => (
                          <span key={phone}>
                            <a
                              href={phoneHref(phone)}
                              className="text-primary transition-colors hover:text-primary/80"
                            >
                              {phone}
                            </a>
                            {phoneIndex < partner.phones.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </p>
                    )}

                    {partner.emails.length > 0 && (
                      <p className="mt-2">
                        E-Mail:{' '}
                        {partner.emails.map((email, emailIndex) => (
                          <span key={email}>
                            <a
                              href={`mailto:${email}`}
                              className="text-primary transition-colors hover:text-primary/80"
                            >
                              {email}
                            </a>
                            {emailIndex < partner.emails.length - 1 ? '; ' : ''}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
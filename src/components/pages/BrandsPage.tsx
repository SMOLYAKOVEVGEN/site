import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Image } from '@/components/ui/image';
import { supabase } from '@/lib/supabase';
import { usePageMeta } from '@/lib/use-page-meta';

type PartnerRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export default function BrandsPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  usePageMeta({
    title: 'Бренды и партнёры',
    description: 'Официальный дистрибьютор ведущих мировых брендов металлорежущего инструмента: SCHWARZ, Sandvik, Seco, Kennametal и других.',
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('partners')
        .select(`
          id,
          name,
          slug,
          logo_url,
          website_url,
          description,
          is_active,
          sort_order
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setPartners((data as PartnerRow[]) || []);
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => {
      const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
      if (orderDiff !== 0) return orderDiff;

      const aName = String(a.name || '').toLowerCase();
      const bName = String(b.name || '').toLowerCase();
      return aName.localeCompare(bName, 'ru');
    });
  }, [partners]);

  return (
    <div className="min-h-screen bg-background">
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
              <span>Бренды</span>
            </div>

            <h1 className="mb-4 font-heading text-3xl leading-tight sm:mb-6 sm:text-5xl lg:text-6xl">
              Наши поставщики
            </h1>

            <p className="max-w-4xl font-paragraph text-base leading-relaxed text-primary-foreground/85 sm:text-xl">
                Наш интернет-магазин является официальным дилером представленных торговых марок. Вся продукция поставляется напрямую от производителей и является оригинальной.

                На все товары распространяется гарантия производителя. Цены соответствуют рекомендованным производителями.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-10 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[100rem] px-4 sm:px-8">
          <div className="mb-8 sm:mb-12">
            <h2 className="mb-3 font-heading text-2xl text-graphite sm:text-4xl">
              {/* Бренды в ассортименте */}
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-[#d9dde3] bg-white p-5 animate-pulse sm:p-6"
                >
                  <div className="h-28 rounded-xl bg-background sm:h-32 lg:h-36" />
                  <div className="mx-auto mt-5 h-5 w-3/4 rounded bg-background" />
                </div>
              ))}
            </div>
          ) : sortedPartners.length === 0 ? (
            <div className="rounded-2xl border border-[#d9dde3] bg-white p-10 text-center sm:p-16">
              <div className="mb-4 font-heading text-2xl text-graphite sm:text-3xl">
                Партнеры пока не найдены
              </div>
              <div className="mx-auto max-w-2xl text-steel-gray">
                Проверь таблицу partners и наличие активных записей.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
              {sortedPartners.map((partner, index) => {
                const name = partner.name || 'Партнер';
                const logo = partner.logo_url || '';

                return (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.18) }}
                    className="group h-full"
                  >
                    <Link
                      to={`/brands/${partner.slug}`}
                      className="flex h-full flex-col rounded-2xl border border-[#d9dde3] bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl sm:p-6"
                    >
                      <div className="flex h-28 items-center justify-center rounded-xl border border-graphite/10 bg-background px-4 sm:h-32 lg:h-36">
                        {logo ? (
                          <Image
                            src={logo}
                            alt={name}
                            fittingType="fit"
                            className="max-h-full max-w-full transition-transform duration-300 group-hover:scale-[1.03]"
                            width={280}
                          />
                        ) : (
                          <div className="text-center text-sm text-steel-gray">
                            Логотип не загружен
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex min-h-[52px] items-center justify-center text-center">
                        <h3 className="font-heading text-lg leading-tight text-graphite sm:text-xl">
                          {name}
                        </h3>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
}
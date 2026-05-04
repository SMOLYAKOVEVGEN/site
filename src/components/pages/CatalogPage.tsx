import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCatalogGroups, type CategoryRow } from '@/lib/catalog-service';
import { usePageMeta } from '@/lib/use-page-meta';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string;
const BUCKET = 'catalog-media';
const CATALOG_HERO_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/category-heroes/catalog-hero.png`;

function resolveImageUrl(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  // Relative path — build full Supabase Storage public URL
  const clean = image.replace(/^\/+/, '');
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/categories/${clean}`;
}

function CategoryImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  );
}

const GROUP_DESCRIPTIONS: Record<string, string> = {
  'frezernaya-obrabotka': 'Инструмент и оснастка для высокоточной фрезерной обработки металлов.',
  'tokarnaya-obrabotka': 'Резцы, пластины и оснастка для токарных операций любой сложности.',
  'metalloobrabatyvayushchie-stanki': 'Станки для комплексной обработки деталей из металла.',
  'smazochno-okhlazhdayushchie-zhidkosti-sozh': 'СОЖ для охлаждения и смазки режущего инструмента.',
  'trubki-dlya-sozh': 'Гибкие трубки для точной подачи охлаждающей жидкости.',
  'fiksatory-soedineniy-i-smazki': 'Фиксирующие составы и смазки для надёжных соединений.',
  'masla': 'Масла для металлообработки и технического обслуживания оборудования.',
  'stanochnaya-osnastka': 'Патроны, тиски и зажимные приспособления для станков.',
  'obrabotka-otverstiy': 'Сверла, зенкеры, развертки и расточной инструмент.',
  'rezbonareznoy-instrument': 'Метчики, плашки и инструмент для нарезания резьбы.',
  'izmeritelnyy-instrument': 'Штангенциркули, микрометры и контрольно-измерительный инструмент.',
  'abrazivnye-materialy': 'Шлифовальные круги, ленты и абразивный инструмент.',
  'slesarno-montazhnyy-instrument': 'Слесарный и монтажный инструмент для производства.',
  'elektroinstrument': 'Профессиональный электроинструмент для мастерской.',
};

const groupOrder = [
  'frezernaya-obrabotka',
  'tokarnaya-obrabotka',
  'metalloobrabatyvayushchie-stanki',
  'smazochno-okhlazhdayushchie-zhidkosti-sozh',
  'trubki-dlya-sozh',
  'fiksatory-soedineniy-i-smazki',
  'masla',
  'stanochnaya-osnastka',
  'obrabotka-otverstiy',
  'rezbonareznoy-instrument',
  'izmeritelnyy-instrument',
  'abrazivnye-materialy',
  'slesarno-montazhnyy-instrument',
  'stroitelnye-resheniya',
  'sistemy-podgotovki-szhatogo-vozdukha',
  'elektroinstrument',
];

function buildCategoryPath(slugs: string[] = []) {
  const normalized = slugs.map((item) => String(item || '').trim()).filter(Boolean);
  return normalized.length
    ? `/catalog/${normalized.map((item) => encodeURIComponent(item)).join('/')}`
    : '/catalog';
}

export default function CatalogPage() {
  usePageMeta({
    title: 'Каталог',
    description: 'Каталог металлорежущего инструмента, станочной оснастки, СОЖ и инженерных решений для производства.',
  });
  const [groups, setGroups] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadGroups() {
      setLoading(true);
      setError('');

      const t0 = performance.now();

      try {
        const data = await getCatalogGroups();

        if (!isMounted) return;
        console.log(`[catalog] CatalogPage loaded in ${Math.round(performance.now() - t0)}ms`);
        setGroups(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!isMounted) return;
        console.error(`[catalog] CatalogPage failed in ${Math.round(performance.now() - t0)}ms:`, e?.message);
        setError(e?.message || 'Ошибка загрузки каталога');
        setGroups([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aIndex = groupOrder.indexOf(a.slug);
      const bIndex = groupOrder.indexOf(b.slug);

      const safeA = aIndex === -1 ? 999 : aIndex;
      const safeB = bIndex === -1 ? 999 : bIndex;

      if (safeA !== safeB) return safeA - safeB;
      return a.name.localeCompare(b.name, 'ru');
    });
  }, [groups]);

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      <Header />

      <main id="main">
      <section className="relative overflow-hidden bg-[#0b1220] text-white h-[280px] md:h-[340px] flex items-center">
        <div className="absolute inset-0">
          <img
            src={CATALOG_HERO_URL}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain object-right"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1220] via-[#0b1220] to-transparent" />
        <div className="absolute inset-0 opacity-30 industrial-grid" />

        <div className="relative z-10 w-full max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="mb-4 h-[2px] w-16 bg-secondary" />
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl leading-tight">
            Каталог продукции
          </h1>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-white border-b border-graphite/10">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          {loading && (
            <div className="py-16 text-center text-steel-gray font-paragraph">
              Загрузка разделов каталога...
            </div>
          )}

          {!loading && error && (
            <div className="py-16 text-center text-red-600 font-paragraph">
              Ошибка загрузки каталога: {error}
            </div>
          )}

          {!loading && !error && sortedGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {sortedGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.45, delay: index * 0.04 }}
                  className="h-full"
                >
                  <Link
                    to={buildCategoryPath([group.slug])}
                    className="group flex h-full flex-col overflow-hidden border border-[#d9dde3] bg-white ring-1 ring-black/[0.03] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-primary hover:ring-primary/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.14)]"
                  >
                    <div className="flex h-[220px] shrink-0 items-center justify-center overflow-hidden bg-[#f4f6f8]">
                      {resolveImageUrl(group.image) ? (
                        <CategoryImage src={resolveImageUrl(group.image)!} alt={group.name} />
                      ) : (
                        <img src="/fallback-logo.png" alt="" className="h-16 w-16 object-contain opacity-20" draggable={false} />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col border-t border-black/5 p-5 md:p-6">
                      <h3 className="mb-3 font-heading text-lg leading-snug text-graphite transition-colors duration-300 group-hover:text-primary md:text-xl">
                        {group.name}
                      </h3>

                      {GROUP_DESCRIPTIONS[group.slug] && (
                        <p className="mb-5 line-clamp-2 font-paragraph text-sm leading-relaxed text-steel-gray">
                          {GROUP_DESCRIPTIONS[group.slug]}
                        </p>
                      )}

                      <div className="mt-auto inline-flex items-center gap-2 font-paragraph font-semibold text-primary">
                        Перейти в раздел
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && !error && sortedGroups.length === 0 && (
            <div className="py-16 text-center text-steel-gray font-paragraph">
              Группы каталога не найдены.
            </div>
          )}
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
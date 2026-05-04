import { usePageMeta } from '@/lib/use-page-meta';
// HPI 1.7-G
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  Wrench,
  Package,
  Headphones,
  Award,
  Factory,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BaseCrudService } from '@/integrations';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string;
const HOME_HERO_URL = `${SUPABASE_URL}/storage/v1/object/public/catalog-media/category-heroes/home-hero.png`;

import heroCncBg from '@/assets/hero-cnc-bg.png';

import categoryCnc from '@/assets/categories/stanki-s-chpu.png';
import categoryTokar from '@/assets/categories/tokarnaya-obrabotka.png';
import categorySozh from '@/assets/categories/sozh-i-masla.png';
import categoryFrez from '@/assets/categories/frezernaya-obrabotka.png';
import categoryOsnastka from '@/assets/categories/stanochnaya-osnastka.png';

import bannerDebeverMs from '@/assets/banners/debever-ms.jpg';
import bannerProian from '@/assets/banners/proian.jpg';
import bannerDebeverSafeCut from '@/assets/banners/debever-safecut.jpg';
import bannerFiksomatik from '@/assets/banners/fiksomatik.jpg';
import bannerOptimus from '@/assets/banners/optimus.jpg';
import industrySolutionsImg from '@/assets/industry-solutions.png';

type HomeProduct = any;
type HomeService = any;
type HomeBrand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};
type HomeArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  main_image: string | null;
  content: string | null;
  author: string | null;
  publish_date: string | null;
  category: string | null;
};
type HomeCategory = any;

const SectionHeading = ({
  title,
  subtitle,
  align = 'left',
}: {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) => (
  <div className={`mb-16 md:mb-24 ${align === 'center' ? 'text-center flex flex-col items-center' : ''}`}>
    {subtitle && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        className="flex items-center gap-4 mb-6"
      >
        <div className="w-8 h-[1px] bg-primary" />
        <span className="font-paragraph text-sm tracking-[0.2em] uppercase text-primary font-semibold">
          {subtitle}
        </span>
        {align === 'center' && <div className="w-8 h-[1px] bg-primary" />}
      </motion.div>
    )}
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ delay: 0.1 }}
      className="font-heading text-4xl md:text-5xl lg:text-6xl text-graphite leading-[1.1] tracking-tight max-w-4xl"
    >
      {title}
    </motion.h2>
  </div>
);

export default function HomePage() {
  usePageMeta({
    title: 'Главная',
    description: 'Поставки инструмента, станочной оснастки, СОЖ и инженерных услуг для производственных предприятий.',
  });
  const [featuredProducts, setFeaturedProducts] = useState<HomeProduct[]>([]);
  const [services, setServices] = useState<HomeService[]>([]);
  const [brands, setBrands] = useState<HomeBrand[]>([]);
  const [articles, setArticles] = useState<HomeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePromoSlide, setActivePromoSlide] = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScrollY } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(heroScrollY, [0, 1], ['0%', '40%']);
  const heroOpacity = useTransform(heroScrollY, [0, 1], [1, 0]);

  useEffect(() => {
    loadData();
  }, []);

  function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    const timer = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
    return Promise.race([promise, timer]);
  }

  const loadData = async () => {
    setIsLoading(true);

    const TIMEOUT = 5000;

    try {
      const emptyPage = { items: [], totalCount: 0, hasNext: false, currentPage: 1, pageSize: 6, nextSkip: null };
      const emptySupabase = { data: [] as any[], error: null };

      const [productsRes, servicesRes, brandsRes, articlesRes] = await Promise.all([
        withTimeout(BaseCrudService.getAll<any>('products', {}, { limit: 6 }), TIMEOUT, emptyPage),
        withTimeout(BaseCrudService.getAll<any>('services', {}, { limit: 6 }), TIMEOUT, emptyPage),
        withTimeout(
          Promise.resolve(supabase.from('brands').select('id, name, slug').order('name', { ascending: true })),
          TIMEOUT,
          emptySupabase
        ),
        withTimeout(
          Promise.resolve(
            supabase
              .from('articles')
              .select('id, title, slug, excerpt, main_image, content, author, publish_date, category')
              .order('publish_date', { ascending: false, nullsFirst: false })
              .limit(3)
          ),
          TIMEOUT,
          emptySupabase
        ),
      ]);

      if (brandsRes.error) {
        console.warn('[home] brands load error:', brandsRes.error);
      }
      if (articlesRes.error) {
        console.warn('[home] articles load error:', articlesRes.error);
      }

      const brandsWithLogos: HomeBrand[] = ((brandsRes.data as Array<{
        id: string;
        name: string;
        slug: string;
      }>) || []).map((brand) => {
        const { data } = supabase.storage.from('catalog-media').getPublicUrl(`brands/${brand.slug}.png`);
        return {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          logo: data.publicUrl || null,
        };
      });

      setFeaturedProducts(productsRes.items || []);
      setServices(servicesRes.items || []);
      setBrands(brandsWithLogos);
      setArticles((articlesRes.data as HomeArticle[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const heroImage = HOME_HERO_URL;
  const heroFallback = heroCncBg.src;
  const placeholderImage = '/fallback-logo.png';

  const engineeringServicesBg =
    'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/home/engineering-services-bg.png';

  const industrySolutionsImage = industrySolutionsImg.src;
  
  const homeCatalogGroups = [
    {
      _id: 'home-1',
      name: 'Металлообрабатывающие станки',
      slug: 'metalloobrabatyvayushchie-stanki',
      description: 'Станки и оборудование для производственных задач.',
      image: categoryCnc.src,
    },
    {
      _id: 'home-2',
      name: 'Токарная обработка',
      slug: 'tokarnaya-obrabotka',
      description: 'Инструмент и решения для токарных операций.',
      image: categoryTokar.src,
    },
    {
      _id: 'home-3',
      name: 'Станочная оснастка',
      slug: 'stanochnaya-osnastka',
      description: 'Оснастка и вспомогательное оборудование.',
      image: categoryOsnastka.src,
    },
    {
      _id: 'home-4',
      name: 'СОЖ и масла',
      slug: 'sozh-i-masla',
      description: 'Смазочно-охлаждающие жидкости и масла.',
      image: categorySozh.src,
    },
    {
      _id: 'home-5',
      name: 'Фрезерная обработка',
      slug: 'frezernaya-obrabotka',
      description: 'Инструмент и решения для фрезерной обработки.',
      image: categoryFrez.src,
    },
  ];

  const promoSlides = [
    {
      image: bannerDebeverMs.src,
      alt: 'DEBEVER MS',
      href: '/catalog',
    },
    {
      image: bannerProian.src,
      alt: 'PROIAN',
      href: '/company/brands/proian',
    },
    {
      image: bannerDebeverSafeCut.src,
      alt: 'DEBEVER SafeCut',
      href: '/catalog/smazochno-okhlazhdayushchie-zhidkosti-sozh',
    },
    {
      image: bannerFiksomatik.src,
      alt: 'Fiksomatik',
      href: '/catalog/fiksatory-soedineniy-i-smazki',
    },
    {
      image: bannerOptimus.src,
      alt: 'OPTIMUS',
      href: '/company/brands/optimus',
    },
  ];

  const advantages = [
    {
      icon: Package,
      title: 'Комплектация предприятий под ключ',
    },
    {
      icon: ShieldCheck,
      title: 'Весь товар сертифицирован',
    },
    {
      icon: Wrench,
      title: 'Инженерные услуги и техподдержка',
    },
    {
      icon: Award,
      title: 'Официальные поставки и надежные бренды',
    },
    {
      icon: Truck,
      title: 'Удобная и быстрая доставка',
    },
  ];

  useEffect(() => {
    if (promoSlides.length <= 1) return;

    const timer = setInterval(() => {
      setActivePromoSlide((prev) => (prev + 1) % promoSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [promoSlides.length]);

  const goToPrevPromoSlide = () => {
    setActivePromoSlide((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);
  };

  const goToNextPromoSlide = () => {
    setActivePromoSlide((prev) => (prev + 1) % promoSlides.length);
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground overflow-clip">
      <style>{`
        .industrial-grid {
          background-size: 40px 40px;
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        }
        .industrial-grid-dark {
          background-size: 40px 40px;
          background-image:
            linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
        }
        .marquee-container {
          overflow: hidden;
          position: relative;
          width: 100%;
          mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll 30s linear infinite;
        }
        .marquee-group {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          gap: 3rem;
          padding-right: 3rem;
        }
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .clip-diagonal {
          clip-path: polygon(0 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%);
        }
      `}</style>

      <Header />

      <main id="main">
      <section ref={heroRef} className="relative w-full h-[95vh] min-h-[760px] bg-[#0b1220] overflow-hidden flex items-center">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 w-full h-[120%]">
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-right"
            onError={(e) => { e.currentTarget.src = heroFallback; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1220] via-[#0b1220]/88 to-[#0b1220]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220]/35 via-transparent to-[#0b1220]/10" />
          <div className="absolute inset-0 industrial-grid opacity-40" />
        </motion.div>

        <div className="relative z-10 w-full max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '80px' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-[2px] bg-secondary mb-8"
            />
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading text-5xl md:text-7xl lg:text-[88px] text-primary-foreground leading-[1.02] tracking-tight mb-8"
            >
              Инструментальные <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
                решения для современного производства
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className="font-paragraph text-lg md:text-[22px] text-primary-foreground/75 max-w-2xl mb-12 leading-relaxed font-light"
            >
              Комплексные поставки металлорежущего инструмента, станочной оснастки и инженерных услуг экспертного уровня.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row gap-6"
            >
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-paragraph text-lg px-10 py-7 h-auto rounded-none clip-diagonal group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Перейти в каталог
                    <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                </Button>
              </Link>
              <Link to="/contacts#request-form">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-graphite font-paragraph text-lg px-10 py-7 h-auto rounded-none backdrop-blur-sm transition-all duration-300"
                >
                  Получить консультацию
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-6 md:py-8 bg-white border-b border-graphite/10">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {advantages.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="group h-full border border-graphite/10 bg-white px-5 py-5 md:px-6 md:py-6 hover:border-primary/30 hover:shadow-[0_10px_30px_rgba(18,57,112,0.08)] transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 border border-graphite/10 bg-[#f8fafc] flex items-center justify-center text-graphite group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-300">
                    <item.icon className="w-7 h-7" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-paragraph text-lg leading-snug text-graphite">
                      {item.title}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12 bg-[#f8fafc] border-y border-graphite/10 overflow-hidden">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-[2px] bg-primary" />
            <p className="font-paragraph text-sm tracking-[0.18em] uppercase text-primary font-semibold">
              Наши поставщики
            </p>
          </div>
        </div>

        <div className="marquee-container py-2">
          {isLoading ? (
            <div className="flex items-center gap-12 px-6 md:px-12 lg:px-24">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="w-40 h-16 bg-graphite/5 animate-pulse rounded" />
                ))}
            </div>
          ) : brands.length > 0 ? (
            <div className="marquee-track">
              <div className="marquee-group">
                {brands.map((brand) => (
                  <Link
                    key={`brand-a-${brand.id}`}
                    to="/catalog"
                    className="group flex items-center justify-center w-52 h-20 px-4"
                  >
                    <img
                      src={brand.logo || placeholderImage}
                      alt={brand.name || 'Brand'}
                      loading="lazy"
                      decoding="async"
                      className="max-w-full max-h-[52px] object-contain grayscale opacity-65 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                    />
                  </Link>
                ))}
              </div>

              <div className="marquee-group" aria-hidden="true">
                {brands.map((brand) => (
                  <Link
                    key={`brand-b-${brand.id}`}
                    to="/catalog"
                    className="group flex items-center justify-center w-52 h-20 px-4"
                  >
                    <img
                      src={brand.logo || placeholderImage}
                      alt={brand.name || 'Brand'}
                      loading="lazy"
                      decoding="async"
                      className="max-w-full max-h-[52px] object-contain grayscale opacity-65 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                    />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full text-center text-steel-gray font-paragraph">
              Бренды не найдены
            </div>
          )}
        </div>
      </section>

      <section className="py-8 md:py-10 bg-white border-b border-graphite/10">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="relative overflow-hidden bg-[#0b1220]">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${activePromoSlide * 100}%)` }}
            >
              {promoSlides.map((slide, index) => (
                <Link
                  key={index}
                  to={slide.href}
                  className="relative min-w-full block h-[240px] md:h-[320px] lg:h-[380px]"
                >
                  <Image
                    src={slide.image}
                    alt={slide.alt}
                    className="w-full h-full object-cover"
                    width={1920}
                  />
                </Link>
              ))}
            </div>

            {promoSlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPrevPromoSlide}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/95 hover:bg-white text-graphite flex items-center justify-center transition-colors shadow-lg"
                  aria-label="Предыдущий слайд"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>

                <button
                  type="button"
                  onClick={goToNextPromoSlide}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/95 hover:bg-white text-graphite flex items-center justify-center transition-colors shadow-lg"
                  aria-label="Следующий слайд"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  {promoSlides.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActivePromoSlide(index)}
                      className={`w-3 h-3 rounded-full border border-white transition-all ${
                        activePromoSlide === index ? 'bg-white scale-110' : 'bg-white/40'
                      }`}
                      aria-label={`Перейти к слайду ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section id="home-catalog" className="py-24 md:py-32 bg-background relative">
        <div className="absolute inset-0 industrial-grid-dark opacity-50 pointer-events-none" />
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 md:mb-24 gap-8">
            <SectionHeading title="Каталог продукции" subtitle="Оборудование и инструмент" />
            <Link
              to="/catalog"
              className="group flex items-center gap-2 text-primary font-paragraph font-semibold hover:text-dark-blue transition-colors pb-2 border-b border-primary/30 hover:border-dark-blue"
            >
              Смотреть весь каталог
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {isLoading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className={`bg-graphite/5 animate-pulse rounded-none ${
                      i === 0 ? 'md:col-span-2 lg:col-span-2 h-[500px]' : 'h-[400px]'
                    }`}
                  />
                ))
            ) : (
              homeCatalogGroups.map((category, index) => (
                <motion.div
                  key={category._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}
                >
                  <Link
                    to={`/catalog/${category.slug}`}
                    className={`group relative block overflow-hidden bg-graphite ${
                      index === 0 ? 'h-[500px]' : 'h-[400px]'
                    }`}
                  >
                    <Image
                      src={category.image || placeholderImage}
                      alt={category.name || 'Category'}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                      width={index === 0 ? 1200 : 600}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500" />

                    <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                      <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                        <h3 className="font-heading text-3xl md:text-4xl text-white mb-4">
                          {category.name}
                        </h3>

                        <p className="font-paragraph text-white/80 line-clamp-2 mb-6 max-w-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                          {category.description || 'Высокоточные решения для вашего производства.'}
                        </p>

                        <div className="inline-flex items-center justify-center w-12 h-12 bg-white text-graphite rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 bg-[#0b1220] text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={engineeringServicesBg}
            alt="Инженерные услуги"
            className="w-full h-full object-cover object-center"
            width={1920}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08172d] via-[#0a2346]/92 to-[#0b2f5c]/78" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08172d]/55 via-transparent to-[#08172d]/18" />
          <div className="absolute inset-0 industrial-grid opacity-25" />
        </div>

        <div className="relative z-10 max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="max-w-4xl mb-16 md:mb-20">
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              whileInView={{ opacity: 1, width: '80px' }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-[2px] bg-secondary mb-8"
            />

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-paragraph text-sm tracking-[0.2em] uppercase text-secondary font-semibold mb-6"
            >
              Экспертиза
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="font-heading text-4xl md:text-6xl lg:text-7xl text-white leading-[1.02] tracking-tight mb-8"
            >
              Инженерные услуги
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.12 }}
              className="font-paragraph text-lg md:text-[22px] text-white/75 max-w-3xl leading-relaxed font-light mb-10"
            >
              Мы не просто поставляем инструмент. Мы обеспечиваем полный цикл технической поддержки, от аудита до внедрения технологий на вашем производстве.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="flex flex-col sm:flex-row gap-6"
            >
              <Link to="/services">
                <Button
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-paragraph text-lg px-10 py-7 h-auto rounded-none clip-diagonal group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Все услуги
                    <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                </Button>
              </Link>

              <Link to="/contacts#request-form">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white hover:text-graphite font-paragraph text-lg px-10 py-7 h-auto rounded-none backdrop-blur-sm transition-all duration-300"
                >
                  Получить консультацию
                </Button>
              </Link>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {isLoading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-64 bg-white/5 border border-white/10 animate-pulse"
                  />
                ))
            ) : (
              services.map((service, index) => (
                <motion.div
                  key={service._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="group border border-white/10 bg-white/6 backdrop-blur-[3px] p-7 md:p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 shrink-0 bg-secondary/20 flex items-center justify-center text-secondary clip-diagonal group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
                      <Wrench className="w-8 h-8" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading text-2xl md:text-3xl text-white mb-4 group-hover:text-secondary transition-colors leading-snug">
                        {service.serviceName}
                      </h3>

                      <p className="font-paragraph text-white/65 leading-relaxed mb-6 max-w-2xl">
                        {service.shortDescription}
                      </p>

                      <Link
                        to={`/services/${service.slug}`}
                        className="inline-flex items-center gap-2 text-white/85 hover:text-white font-paragraph transition-colors"
                      >
                        Подробнее об услуге
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <SectionHeading title="Надежный партнер для вашего производства" subtitle="Почему выбирают нас" align="center" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(250px,auto)]">
            {[
              {
                icon: Package,
                title: 'Широкий ассортимент',
                description:
                  'Более 50 000 наименований инструмента и оснастки от ведущих мировых производителей всегда в наличии на складе.',
                span: 'md:col-span-2 lg:col-span-2',
                bg: 'bg-graphite text-white',
              },
              {
                icon: CheckCircle,
                title: 'Надежные поставки',
                description: 'Прямые контракты гарантируют стабильность и защиту от контрафакта.',
                span: 'col-span-1',
                bg: 'bg-background border border-graphite/10',
              },
              {
                icon: Headphones,
                title: 'Техподдержка 24/7',
                description: 'Квалифицированные инженеры помогут подобрать оптимальное решение.',
                span: 'col-span-1',
                bg: 'bg-background border border-graphite/10',
              },
              {
                icon: Factory,
                title: 'Комплектация предприятий',
                description: 'Берем на себя полное обеспечение инструментальных участков и цехов.',
                span: 'col-span-1',
                bg: 'bg-background border border-graphite/10',
              },
              {
                icon: Award,
                title: 'Комплексный сервис',
                description: 'От подбора инструмента до монтажа оборудования, пусконаладки и обучения персонала.',
                span: 'md:col-span-2 lg:col-span-3',
                bg: 'bg-primary text-white',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`${item.span} ${item.bg} p-8 md:p-10 flex flex-col justify-between group hover:shadow-xl transition-shadow duration-300`}
              >
                <item.icon className={`w-12 h-12 mb-8 ${item.bg.includes('bg-background') ? 'text-primary' : 'text-white/80'}`} />
                <div>
                  <h3 className={`font-heading text-2xl mb-4 ${item.bg.includes('bg-background') ? 'text-graphite' : 'text-white'}`}>
                    {item.title}
                  </h3>
                  <p className={`font-paragraph leading-relaxed ${item.bg.includes('bg-background') ? 'text-steel-gray' : 'text-white/80'}`}>
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-background border-t border-graphite/10">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <SectionHeading title="Решения для любой отрасли" subtitle="Применение" />
              <div className="space-y-6">
                {[
                  { title: 'Машиностроение', desc: 'Комплексное оснащение производственных линий.' },
                  { title: 'Серийное производство', desc: 'Оптимизация процессов и снижение себестоимости.' },
                  { title: 'Инструментальные участки', desc: 'Полный цикл оснащения от проектирования до запуска.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-6 bg-white border border-graphite/5 hover:border-primary/30 transition-colors">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-heading text-xl text-graphite mb-2">{item.title}</h4>
                      <p className="font-paragraph text-steel-gray">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Link to="/solutions">
                  <Button className="bg-graphite hover:bg-primary text-white font-paragraph px-8 py-6 rounded-none">
                    Все отраслевые решения
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative h-[600px] hidden lg:block"
            >
              <Image
                src={industrySolutionsImage}
                alt="Производственный участок со станками"
                className="w-full h-full object-cover clip-diagonal"
                width={800}
              />
              <div className="absolute -bottom-10 -left-10 bg-white p-8 shadow-2xl border border-graphite/10 max-w-xs">
                <div className="font-heading text-5xl text-primary mb-2">15+</div>
                <div className="font-paragraph text-sm text-steel-gray uppercase tracking-wider font-semibold">
                  Лет опыта в оснащении производств
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-white border-t border-graphite/10">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 md:mb-14 gap-6">
            <SectionHeading title="Экспертиза и новости" subtitle="База знаний" />
            <Link
              to="/blog"
              className="group flex items-center gap-2 text-graphite font-paragraph font-semibold hover:text-primary transition-colors pb-2 border-b border-graphite/30 hover:border-primary"
            >
              Перейти в блог
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-10">
            {isLoading ? (
              <div className="h-96 bg-graphite/5 animate-pulse" />
            ) : articles.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group cursor-pointer"
                >
                  <Link to={`/blog/${articles[0].slug}`} className="block">
                    <div className="relative h-[320px] md:h-[480px] mb-6 overflow-hidden">
                      <Image
                        src={articles[0].main_image || placeholderImage}
                        alt={articles[0].title || 'Article'}
                        className="w-full h-full object-cover object-[22%_center] group-hover:scale-105 transition-transform duration-700"
                        width={1400}
                      />
                      <div className="absolute top-6 left-6 bg-white px-4 py-2 font-paragraph text-xs font-bold tracking-widest uppercase">
                        {articles[0].category || 'Статья'}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-steel-gray font-paragraph text-sm mb-3">
                      <span>
                        {articles[0].publish_date ? new Date(articles[0].publish_date).toLocaleDateString('ru-RU') : 'Недавно'}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      <span>{articles[0].author || 'Редакция'}</span>
                    </div>

                    <h3 className="font-heading text-2xl md:text-4xl text-graphite mb-4 group-hover:text-primary transition-colors leading-tight">
                      {articles[0].title}
                    </h3>

                    <p className="font-paragraph text-steel-gray text-base md:text-lg leading-relaxed">
                      {articles[0].excerpt}
                    </p>
                  </Link>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {articles.slice(1, 3).map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 }}
                      className="group border-t border-graphite/10 pt-6"
                    >
                      <Link to={`/blog/${article.slug}`} className="block">
                        <div className="relative h-[220px] mb-5 overflow-hidden">
                          <Image
                            src={article.main_image || placeholderImage}
                            alt={article.title || 'Article'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            width={700}
                          />
                        </div>

                        <div className="text-primary font-paragraph text-xs font-bold tracking-widest uppercase mb-3">
                          {article.category || 'Новость'}
                        </div>

                        <h4 className="font-heading text-xl md:text-2xl text-graphite mb-3 group-hover:text-primary transition-colors leading-snug">
                          {article.title}
                        </h4>

                        <p className="font-paragraph text-steel-gray text-sm md:text-base leading-relaxed line-clamp-3">
                          {article.excerpt}
                        </p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="relative py-32 bg-graphite overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image src={placeholderImage} alt="Background" className="w-full h-full object-cover" width={1920} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-graphite via-graphite/90 to-graphite" />

        <div className="relative z-10 max-w-[80rem] mx-auto px-6 md:px-12 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-tight">
              Готовы модернизировать <br />
              свое производство?
            </h2>
            <p className="font-paragraph text-xl text-white/70 mb-12 max-w-3xl mx-auto font-light">
              Свяжитесь с нашими инженерами для получения профессиональной консультации, подбора инструмента и расчета
              коммерческого предложения.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link to="/contacts#request-form">
                <Button
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90 text-white font-paragraph text-lg px-12 py-8 h-auto rounded-none clip-diagonal w-full sm:w-auto"
                >
                  Запросить КП
                </Button>
              </Link>
              <a href="tel:+78126403996" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white hover:text-graphite font-paragraph text-lg px-12 py-8 h-auto rounded-none w-full sm:w-auto transition-colors"
                >
                  +7 (812) 640-39-96
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}

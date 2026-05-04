import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Download, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
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
  full_description: string | null;
  hero_image: string | null;
  is_active: boolean;
  sort_order: number;
};

type PartnerCatalogRow = {
  id: string;
  title: string;
  file_url: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

function splitParagraphs(value: string | null | undefined) {
  return String(value || '')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PartnerDetailPage() {
  const { slug } = useParams();

  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [catalogs, setCatalogs] = useState<PartnerCatalogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageMeta({
    title: partner?.name || 'Бренд',
    description:
      partner?.description ||
      partner?.full_description?.slice(0, 160) ||
      'Информация о бренде, партнере и каталоги продукции.',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPartner() {
      setIsLoading(true);
      setNotFound(false);

      try {
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select(`
            id,
            name,
            slug,
            logo_url,
            website_url,
            description,
            full_description,
            hero_image,
            is_active,
            sort_order
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (partnerError) throw partnerError;

        if (!partnerData) {
          if (isMounted) {
            setPartner(null);
            setCatalogs([]);
            setNotFound(true);
          }
          return;
        }

        const { data: catalogsData, error: catalogsError } = await supabase
          .from('partner_catalogs')
          .select(`
            id,
            title,
            file_url,
            image_url,
            sort_order,
            is_active
          `)
          .eq('partner_id', partnerData.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('title', { ascending: true });

        if (catalogsError) throw catalogsError;

        if (isMounted) {
          setPartner(partnerData as PartnerRow);
          setCatalogs((catalogsData as PartnerCatalogRow[]) || []);
        }
      } catch (error) {
        console.error('PartnerDetailPage load error:', error);

        if (isMounted) {
          setPartner(null);
          setCatalogs([]);
          setNotFound(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPartner();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (!isLoading && notFound) {
    return <Navigate to="/brands" replace />;
  }

  const paragraphs = splitParagraphs(partner?.full_description || partner?.description);
  const heroImage = partner?.hero_image || '';

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      <Header />

      <main id="main">
        <section className="relative overflow-hidden bg-[#0b1220] text-white py-14 sm:py-20 lg:py-24">
          {heroImage && (
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-contain object-right opacity-75"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1220] via-[#0b1220]/95 to-[#0b1220]/20" />

          <div className="relative z-10 mx-auto max-w-[100rem] px-4 sm:px-8">
            <div className="mb-5 text-sm text-white/70">
              <Link to="/" className="transition-colors hover:text-white">
                Главная
              </Link>
              <span className="mx-2">/</span>
              <Link to="/brands" className="transition-colors hover:text-white">
                Бренды
              </Link>
              <span className="mx-2">/</span>
              <span className="text-white">{partner?.name || 'Бренд'}</span>
            </div>

            <div className="mb-7 h-[2px] w-20 bg-secondary" />

            <h1 className="max-w-5xl font-heading text-4xl leading-tight sm:text-6xl lg:text-7xl">
              {partner?.name || 'Бренд'}
            </h1>

            {partner?.description && (
              <p className="mt-6 max-w-3xl font-paragraph text-lg leading-relaxed text-white/80 sm:text-xl">
                {partner.description}
              </p>
            )}
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[100rem] px-4 sm:px-8">
            {isLoading ? (
              <div className="h-96 animate-pulse bg-graphite/5" />
            ) : partner ? (
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  {paragraphs.length > 0 && (
                    <div className="max-w-5xl font-paragraph text-lg leading-relaxed text-graphite">
                      {paragraphs.map((paragraph, index) => (
                        <p key={index} className="mb-6">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-12">
                    <h2 className="mb-6 font-heading text-2xl text-graphite sm:text-3xl">
                      Скачать каталоги {partner.name}
                    </h2>

                    {catalogs.length > 0 ? (
                      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {catalogs.map((catalog, index) => (
                          <motion.a
                            key={catalog.id}
                            href={catalog.file_url}
                            target="_blank"
                            rel="noreferrer"
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2) }}
                            className="group flex h-full flex-col overflow-hidden border border-[#d9dde3] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
                          >
                            <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f4f6f8]">
                              {catalog.image_url ? (
                                <img
                                  src={catalog.image_url}
                                  alt={catalog.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                                  draggable={false}
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Download className="h-12 w-12 text-primary/50" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-1 flex-col p-3">
                              <h3 className="line-clamp-3 min-h-[58px] font-heading text-[15px] leading-snug text-graphite transition-colors group-hover:text-primary">
                                {catalog.title}
                              </h3>

                              <div className="mt-auto inline-flex items-center gap-2 pt-3 font-paragraph text-sm font-semibold text-primary">
                                Скачать PDF
                                <Download className="h-4 w-4" />
                              </div>
                            </div>
                          </motion.a>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-[#d9dde3] bg-white p-8 text-steel-gray">
                        Каталоги для этого бренда пока не добавлены.
                      </div>
                    )}
                  </div>
                </div>

                <aside className="h-fit border border-[#d9dde3] bg-white p-6">
                  <div className="flex min-h-[220px] items-center justify-center border border-graphite/10 bg-background p-8">
                    {partner.logo_url ? (
                      <Image
                        src={partner.logo_url}
                        alt={partner.name}
                        fittingType="fit"
                        className="max-h-[150px] max-w-full"
                        width={320}
                      />
                    ) : (
                      <div className="text-steel-gray">Логотип не загружен</div>
                    )}
                  </div>

                  {partner.website_url && (
                    <a
                      href={partner.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 bg-primary px-5 font-paragraph font-semibold text-white transition hover:bg-primary/90"
                    >
                      Перейти на сайт
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </aside>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
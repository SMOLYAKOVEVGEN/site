import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileBadge2,
  MapPin,
  Phone,
  Mail,
  X,
} from 'lucide-react';
import { usePageMeta } from '@/lib/use-page-meta';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { certificatesData, type CertificateItem } from '@/data/certificatesData';

type FilterKey = 'all' | 'certificate' | 'award';

function getStatus(item: CertificateItem): 'active' | 'archive' {
  if (item.category === 'award') return 'archive';

  if (!item.expiryDate) return 'active';

  const yearMatch = item.expiryDate.match(/(20\d{2})/);
  if (!yearMatch) return 'active';

  const expiryYear = Number(yearMatch[1]);
  const currentYear = new Date().getFullYear();

  return expiryYear < currentYear ? 'archive' : 'active';
}

function getStatusLabel(item: CertificateItem) {
  return getStatus(item) === 'active' ? 'Действует' : 'Архив';
}

function getStatusClasses(item: CertificateItem) {
  return getStatus(item) === 'active'
    ? 'border-primary/20 bg-primary/10 text-primary'
    : 'border-border bg-[#f3f5f8] text-steel-gray';
}

function SectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 sm:mb-10">
      <h2 className="font-heading text-2xl sm:text-4xl text-graphite mb-3">
        {title}
      </h2>
      <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed max-w-3xl">
        {description}
      </p>
    </div>
  );
}

function CertificateCard({
  item,
  onOpen,
}: {
  item: CertificateItem;
  onOpen: (item: CertificateItem) => void;
}) {
  const isCertificate = item.category === 'certificate';

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45 }}
      className="group rounded-[24px] border border-border bg-white overflow-hidden shadow-[0_10px_34px_rgba(18,57,112,0.05)] hover:shadow-[0_16px_42px_rgba(18,57,112,0.10)] transition-all duration-300"
    >
      <div className="relative border-b border-border bg-[#f8fafc]">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="block w-full text-left"
        >
          <div className="aspect-[4/5] overflow-hidden">
            <Image
              src={item.image}
              alt={item.title}
              fittingType="fit"
              className="w-full h-full bg-white p-3 sm:p-4 transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        </button>

        <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs text-graphite shadow-sm">
            {isCertificate ? (
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Award className="h-3.5 w-3.5 text-primary" />
            )}
            <span>{isCertificate ? 'Сертификат' : 'Диплом / благодарность'}</span>
          </div>

          <div
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs shadow-sm ${getStatusClasses(item)}`}
          >
            {getStatusLabel(item)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(item)}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs text-graphite shadow-sm hover:bg-white transition-colors"
        >
          <Eye className="h-3.5 w-3.5 text-primary" />
          Открыть
        </button>
      </div>

      <div className="p-5 sm:p-6">
        <h3 className="font-heading text-lg sm:text-xl text-graphite leading-snug mb-3 min-h-[3.25rem]">
          {item.title}
        </h3>

        <p className="font-paragraph text-sm text-steel-gray leading-relaxed mb-5 line-clamp-5">
          {item.description}
        </p>

        <div className="space-y-3">
          {item.issueDate && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-[#f8fafc] px-4 py-3">
              <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="font-paragraph text-sm text-steel-gray leading-relaxed">
                <span className="text-graphite">Дата:</span> {item.issueDate}
              </div>
            </div>
          )}

          {item.expiryDate && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-[#f8fafc] px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="font-paragraph text-sm text-steel-gray leading-relaxed">
                <span className="text-graphite">Срок действия:</span> до {item.expiryDate}
              </div>
            </div>
          )}

          {item.location && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-[#f8fafc] px-4 py-3">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="font-paragraph text-sm text-steel-gray leading-relaxed">
                {item.location}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function PreviewModal({
  item,
  onClose,
}: {
  item: CertificateItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!item) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm p-4 sm:p-6 lg:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="relative mx-auto h-full max-w-[1200px] rounded-[28px] border border-white/15 bg-white overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 sm:px-6 py-4">
              <div className="min-w-0">
                <div className="font-heading text-lg sm:text-2xl text-graphite truncate">
                  {item.title}
                </div>
                <div className="font-paragraph text-sm text-steel-gray mt-1">
                  {item.category === 'certificate'
                    ? 'Сертификат / лицензия'
                    : 'Диплом / благодарственное письмо'}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-graphite hover:bg-[#f8fafc] transition-colors shrink-0"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] h-[calc(100%-76px)]">
              <div className="bg-[#f7f9fc] flex items-center justify-center p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-border min-h-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  fittingType="fit"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="overflow-y-auto p-5 sm:p-6 bg-white">
                <div className="inline-flex items-center rounded-full border border-border bg-[#f8fafc] px-3 py-1.5 text-xs text-steel-gray mb-4">
                  {getStatusLabel(item)}
                </div>

                <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed mb-6">
                  {item.description}
                </p>

                <div className="space-y-3">
                  {item.issueDate && (
                    <div className="rounded-2xl border border-border bg-[#f8fafc] p-4">
                      <div className="font-heading text-sm text-graphite mb-1">
                        Дата
                      </div>
                      <div className="font-paragraph text-sm text-steel-gray">
                        {item.issueDate}
                      </div>
                    </div>
                  )}

                  {item.expiryDate && (
                    <div className="rounded-2xl border border-border bg-[#f8fafc] p-4">
                      <div className="font-heading text-sm text-graphite mb-1">
                        Срок действия
                      </div>
                      <div className="font-paragraph text-sm text-steel-gray">
                        до {item.expiryDate}
                      </div>
                    </div>
                  )}

                  {item.location && (
                    <div className="rounded-2xl border border-border bg-[#f8fafc] p-4">
                      <div className="font-heading text-sm text-graphite mb-1">
                        Место проведения / выдачи
                      </div>
                      <div className="font-paragraph text-sm text-steel-gray">
                        {item.location}
                      </div>
                    </div>
                  )}
                </div>

                <a
                  href={item.image}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-6 items-center gap-2 rounded-xl border border-primary bg-white px-4 py-3 text-sm text-primary hover:underline"
                >
                  Открыть оригинал изображения
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function CertificatesPage() {
  usePageMeta({
    title: 'Лицензии и сертификаты',
    description: 'Лицензии, сертификаты и подтверждающие документы компании.',
  });
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedItem, setSelectedItem] = useState<CertificateItem | null>(null);

  const certificates = useMemo(
    () => certificatesData.filter((item) => item.category === 'certificate'),
    [],
  );

  const awards = useMemo(
    () => certificatesData.filter((item) => item.category === 'award'),
    [],
  );

  const filteredAllItems = useMemo(() => {
    if (filter === 'all') return certificatesData;
    return certificatesData.filter((item) => item.category === filter);
  }, [filter]);

  const filterCounts = {
    all: certificatesData.length,
    certificate: certificates.length,
    award: awards.length,
  };

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
                Документы и подтверждения
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl leading-tight mb-5">
                Лицензии, сертификаты и благодарности
              </h1>

              <p className="font-paragraph text-base sm:text-xl text-primary-foreground/85 leading-relaxed max-w-3xl">
                На этой странице собраны сертификаты, дилерские подтверждения,
                дипломы выставок и благодарственные письма, подтверждающие
                компетенции и деловую репутацию компании.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button asChild size="lg" className="rounded-xl px-6 h-12 text-base">
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
                  <Link to="/contacts">Связаться с менеджером</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-12 sm:pb-16">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-[28px] border border-border bg-white p-5 sm:p-6 lg:p-8 shadow-[0_10px_34px_rgba(18,57,112,0.05)]"
          >
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-2">
                  Архив документов компании
                </h2>
                <p className="font-paragraph text-sm sm:text-base text-steel-gray leading-relaxed max-w-3xl">
                  Для удобства просмотра документы разделены по типам. Нажмите на
                  карточку, чтобы открыть изображение в увеличенном виде.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'all', label: 'Все документы' },
                  { key: 'certificate', label: 'Сертификаты' },
                  { key: 'award', label: 'Благодарности и дипломы' },
                ].map((tab) => {
                  const key = tab.key as FilterKey;
                  const isActive = filter === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm transition-colors ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-white text-graphite hover:bg-[#f8fafc]'
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                          isActive
                            ? 'bg-white/15 text-white'
                            : 'bg-[#f3f6fa] text-steel-gray'
                        }`}
                      >
                        {filterCounts[key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {filter === 'all' ? (
        <>
          <section className="pb-12 sm:pb-16">
            <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
              <SectionIntro
                title="Сертификаты и дилерские подтверждения"
                description="Раздел содержит документы, подтверждающие соответствие системы менеджмента качества, официальный статус поставщика и право представлять отдельные торговые марки."
              />

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {certificates.map((item) => (
                  <CertificateCard
                    key={item.id}
                    item={item}
                    onOpen={setSelectedItem}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="pb-12 sm:pb-20">
            <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
              <SectionIntro
                title="Благодарности и дипломы"
                description="Здесь собраны дипломы профильных выставок и благодарственные письма от партнеров и клиентов, отражающие участие компании в отраслевых мероприятиях и реализованных проектах."
              />

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {awards.map((item) => (
                  <CertificateCard
                    key={item.id}
                    item={item}
                    onOpen={setSelectedItem}
                  />
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="pb-12 sm:pb-20">
          <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
            <SectionIntro
              title={
                filter === 'certificate'
                  ? 'Сертификаты и дилерские подтверждения'
                  : 'Благодарности и дипломы'
              }
              description={
                filter === 'certificate'
                  ? 'Подтверждения соответствия, качества и официального статуса компании.'
                  : 'Дипломы выставок и благодарственные письма от партнеров и организаций.'
              }
            />

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAllItems.map((item) => (
                <CertificateCard
                  key={item.id}
                  item={item}
                  onOpen={setSelectedItem}
                />
              ))}
            </div>
          </div>
        </section>
      )}

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
                  Нужны документы или подтверждения по запросу?
                </h2>

                <p className="font-paragraph text-sm sm:text-lg text-primary-foreground/85 leading-relaxed max-w-3xl">
                  Свяжитесь с нами. Подскажем по наличию документов, статусу
                  сертификатов и подготовим материалы для согласования поставки.
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
                <Button asChild size="lg" className="rounded-xl px-6 h-12 text-base">
                  <Link to="/contacts">Связаться с нами</Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-6 h-12 text-base border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/about">О компании</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PreviewModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      <Footer />
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download,
  Package,
  Heart,
  BarChart3,
  ShoppingCart,
  Minus,
  Plus,
  Share2,
  Copy,
  Check,
  Info,
  Bell,
  CircleCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCatalogUI } from '@/store/catalog-ui-store';
import {
  getProductViewById,
  getRelatedProducts,
  getCompatibleProductGroupsForProduct,
  getCategoryById,
  resolveCategoryByPath,
  type ProductView,
  type RelatedProductCard,
  type CategoryRow,
  type CompatibleProductGroup,
} from '@/lib/catalog-service';
import { createLead } from '@/lib/lead-service';
import { getCurrentCustomer } from '@/lib/customer-auth';
import { getCustomerProfile } from '@/lib/customer-account-service';
import ProductImageFallback from '@/components/catalog/ProductImageFallback';
import { usePageMeta } from '@/lib/use-page-meta';

type CartPhase = 'idle' | 'launch' | 'drop' | 'exit' | 'enter' | 'done';
type ProductTab = 'description' | 'specs' | 'question' | 'compatible';

type RequestFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
};

function hasRealImage(imageUrl: string | null | undefined): boolean {
  const value = String(imageUrl || '').trim().toLowerCase();
  return Boolean(
    value &&
      !value.includes('placeholder') &&
      !value.includes('no-photo') &&
      !value.includes('нет фото') &&
      !value.includes('wixstatic.com') &&
      !value.includes('/0.png') &&
      !value.includes('/0.jpg') &&
      !value.includes('/0.jpeg') &&
      !value.includes('/0.webp')
  );
}

function animateFlyToHeader(
  event: React.MouseEvent<HTMLButtonElement>,
  imageUrl: string,
  targetSelector: string
) {
  const target = document.querySelector(targetSelector) as HTMLElement | null;
  if (!target) return;

  const sourceRect = event.currentTarget.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const flyEl = document.createElement('div');
  flyEl.style.position = 'fixed';
  flyEl.style.left = `${sourceRect.left + sourceRect.width / 2 - 28}px`;
  flyEl.style.top = `${sourceRect.top + sourceRect.height / 2 - 28}px`;
  flyEl.style.width = '56px';
  flyEl.style.height = '56px';
  flyEl.style.borderRadius = '9999px';
  flyEl.style.overflow = 'hidden';
  flyEl.style.pointerEvents = 'none';
  flyEl.style.zIndex = '99999';
  flyEl.style.background = '#f3f4f6';
  flyEl.style.border = '1px solid rgba(0,0,0,0.10)';
  flyEl.style.boxShadow = '0 16px 40px rgba(0,0,0,0.28)';
  flyEl.style.transition =
    'transform 1200ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 1200ms ease, width 1200ms ease, height 1200ms ease';

  const img = document.createElement('img');
  img.src = hasRealImage(imageUrl) ? imageUrl : '/placeholder.png';
  img.loading = 'eager';
  img.decoding = 'async';
  img.alt = '';
  img.draggable = false;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'contain';
  img.style.padding = '6px';

  flyEl.appendChild(img);
  document.body.appendChild(flyEl);

  const deltaX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const deltaY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

  requestAnimationFrame(() => {
    flyEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.32)`;
    flyEl.style.opacity = '0.45';
    flyEl.style.width = '28px';
    flyEl.style.height = '28px';
  });

  window.setTimeout(() => flyEl.remove(), 1260);
}

function getInitialMessage(productName?: string): string {
  return productName ? `Интересует товар: ${productName}` : '';
}

function getInitialFormData(productName?: string): RequestFormData {
  return { name: '', email: '', phone: '', company: '', message: getInitialMessage(productName) };
}

function getUtmParams() {
  if (typeof window === 'undefined') return { utm_source: null, utm_medium: null, utm_campaign: null };
  const sp = new URLSearchParams(window.location.search);
  return {
    utm_source: sp.get('utm_source'),
    utm_medium: sp.get('utm_medium'),
    utm_campaign: sp.get('utm_campaign'),
  };
}

function buildCategoryPath(slugs: string[] = []) {
  const normalized = slugs.map((s) => String(s || '').trim()).filter(Boolean);
  return normalized.length
    ? `/catalog/${normalized.map((s) => encodeURIComponent(s)).join('/')}`
    : '/catalog';
}

function buildCategoryHref(chain: CategoryRow[], index: number): string {
  if (!Array.isArray(chain) || index < 0 || index >= chain.length) return '/catalog';
  return buildCategoryPath(chain.slice(0, index + 1).map((c) => c.slug).filter(Boolean));
}

function parseSpecificationsText(text?: string | null): Array<{ name: string; value: string }> {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx <= 0) return [];
      const name = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (!name || !value) return [];
      return [{ name, value }];
    });
}

const QUESTION_TYPES = [
  'Нужна совместимость',
  'Нужна замена',
  'Нужны режимы резания',
  'Нужна поставка',
  'Нужна цена на объем',
  'Нужен счет',
] as const;

function getSpecTooltip(name: string, value?: string): string | null {
  const n = name.toLowerCase().replace(/ё/g, 'е').trim();
  const v = String(value || '').toLowerCase().trim();

  if (n.includes('dp') || n.includes('differential pitch') || v === 'dp') {
    return 'Неравномерный шаг зубьев. Помогает снижать вибрацию и улучшать качество обработки.';
  }

  if (n.includes('dh') || n.includes('differential helix') || v === 'dh') {
    return 'Неравномерный угол наклона спирали. Снижает усилие резания и повышает стабильность обработки.';
  }

  if (n.includes('покрытие') && v.includes('tisin')) {
    return 'Износостойкое покрытие для высокоскоростной обработки и повышения ресурса инструмента.';
  }

  if ((n.includes('хвостовик') || n.includes('тип хвостовика')) && v.includes('weldon')) {
    return 'Хвостовик с лыской под боковой зажим. Обеспечивает надежную фиксацию инструмента в патроне.';
  }

  if (n.includes('диаметр режущей')) return 'Рабочий диаметр режущей части инструмента.';
  if (n.includes('общая длина')) return 'Полная длина инструмента.';
  if (n.includes('количество зубьев')) return 'Количество режущих зубьев инструмента.';
  if (n.includes('радиус') || n.includes('размер радиуса')) return 'Радиус скругления или радиус режущей кромки.';

  return null;
}

async function loadCategoryBreadcrumbs(categoryId: string): Promise<CategoryRow[]> {
  const chain: CategoryRow[] = [];
  const visited = new Set<string>();
  let currentId: string | null = categoryId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const category = await getCategoryById(currentId);
    if (!category) break;
    chain.push(category);
    currentId = category.parent_id;
  }

  return chain.reverse();
}

function parseCatalogPathSlugs(fromValue?: string | null): string[] {
  const raw = String(fromValue || '').trim();
  if (!raw) return [];

  const cleanPath = raw.split('?')[0].split('#')[0].replace(/\/+/g, '/');
  const parts = cleanPath.split('/').filter(Boolean);

  if (parts[0] !== 'catalog') return [];

  return parts
    .slice(1)
    .map((part) => {
      try {
        return decodeURIComponent(part).trim();
      } catch {
        return String(part || '').trim();
      }
    })
    .filter(Boolean);
}

async function loadBreadcrumbsFromPath(fromValue?: string | null): Promise<CategoryRow[]> {
  const slugs = parseCatalogPathSlugs(fromValue);
  if (!slugs.length) return [];

  const chain: CategoryRow[] = [];

  for (let i = 0; i < slugs.length; i++) {
    const category = await resolveCategoryByPath(...slugs.slice(0, i + 1));
    if (!category) return [];
    chain.push(category);
  }

  return chain;
}

export default function ProductPage() {
  usePageMeta({
    title: 'Карточка товара',
    description: 'Подробная карточка товара с характеристиками, описанием и действиями покупки.',
  });

  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const fromCatalog =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof (location.state as { from?: string }).from === 'string' &&
    (location.state as { from: string }).from.startsWith('/catalog')
      ? (location.state as { from: string }).from
      : '/catalog';

  const favorites = useCatalogUI((s) => s.favorites);
  const compare = useCatalogUI((s) => s.compare);
  const cart = useCatalogUI((s) => s.cart);
  const toggleFavorite = useCatalogUI((s) => s.toggleFavorite);
  const toggleCompare = useCatalogUI((s) => s.toggleCompare);
  const addToCart = useCatalogUI((s) => s.addToCart);

  const [product, setProduct] = useState<ProductView | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProductCard[]>([]);
  const [compatibleGroups, setCompatibleGroups] = useState<CompatibleProductGroup[]>([]);
  const [selectedCompatibleGroupId, setSelectedCompatibleGroupId] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [isCompatibleLoading, setIsCompatibleLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [localQuantity, setLocalQuantity] = useState(1);
  const [cartPhase, setCartPhase] = useState<CartPhase>('idle');
  const [activeTab, setActiveTab] = useState<ProductTab>('description');
  const [questionType, setQuestionType] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [formData, setFormData] = useState<RequestFormData>(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');
  const [submitErrorMessage, setSubmitErrorMessage] = useState('');

  const timeoutsRef = useRef<number[]>([]);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const pushTimeout = (cb: () => void, ms: number) => {
    const t = window.setTimeout(cb, ms);
    timeoutsRef.current.push(t);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      if (!id) {
        if (!isMounted) return;
        setProduct(null);
        setRelatedProducts([]);
        setCompatibleGroups([]);
        setSelectedCompatibleGroupId('');
        setBreadcrumbs([]);
        setSelectedImage('');
        setFormData(getInitialFormData());
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setProduct(null);
      setRelatedProducts([]);
      setCompatibleGroups([]);
      setSelectedCompatibleGroupId('');
      setBreadcrumbs([]);
      setSelectedImage('');
      setSubmitSuccessMessage('');
      setSubmitErrorMessage('');

      try {
        const data = await getProductViewById(id);
        if (!isMounted) return;

        setProduct(data);

        if (data) {
          setSelectedImage(data.image || data.gallery?.[0] || '');
          setFormData((prev) => ({
            ...prev,
            message: prev.message?.trim() ? prev.message : getInitialMessage(data.name),
          }));

          const fromState = (location.state as { from?: string } | null)?.from || '';
          const fromPathBreadcrumbs = await loadBreadcrumbsFromPath(fromState);
          if (!isMounted) return;

          if (fromPathBreadcrumbs.length > 0) {
            setBreadcrumbs(fromPathBreadcrumbs);
          } else if (data.categoryId) {
            const chain = await loadCategoryBreadcrumbs(data.categoryId);
            if (!isMounted) return;
            setBreadcrumbs(chain);
          } else {
            setBreadcrumbs([]);
          }
        } else {
          setFormData(getInitialFormData());
          setBreadcrumbs([]);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading product:', error);
        setProduct(null);
        setBreadcrumbs([]);
        setFormData(getInitialFormData());
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id, location.state]);

  useEffect(() => {
    let isMounted = true;

    async function loadRelated() {
      if (!product?.id) {
        if (isMounted) setRelatedProducts([]);
        return;
      }

      setIsRelatedLoading(true);

      try {
        const related = await getRelatedProducts(
          product.categoryId,
          product.brandId,
          product.id,
          product.brand
        );

        if (!isMounted) return;
        setRelatedProducts(related);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading related products:', error);
        setRelatedProducts([]);
      } finally {
        if (isMounted) setIsRelatedLoading(false);
      }
    }

    loadRelated();

    return () => {
      isMounted = false;
    };
  }, [product?.id, product?.categoryId, product?.brandId, product?.brand]);

  useEffect(() => {
    let isMounted = true;

    async function loadCompatibleGroups() {
      if (!product?.id) {
        if (isMounted) {
          setCompatibleGroups([]);
          setSelectedCompatibleGroupId('');
        }
        return;
      }

      setIsCompatibleLoading(true);

      try {
        const groups = await getCompatibleProductGroupsForProduct(product.id);

        if (!isMounted) return;

        setCompatibleGroups(groups);
        setSelectedCompatibleGroupId(groups[0]?.id || '');
      } catch (error) {
        if (!isMounted) return;

        console.error('Error loading compatible product groups:', error);
        setCompatibleGroups([]);
        setSelectedCompatibleGroupId('');
      } finally {
        if (isMounted) setIsCompatibleLoading(false);
      }
    }

    loadCompatibleGroups();

    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  useEffect(() => {
    async function loadCustomerAutofill() {
      try {
        const customer = await getCurrentCustomer();
        if (!customer?.id) return;

        const profile = await getCustomerProfile(customer.id);
        const name = profile?.contact_person || profile?.full_name || (customer as any)?.fullName || '';
        const phone = profile?.phone || (customer as any)?.phone || '';
        const email = profile?.email || (customer as any)?.email || '';
        const company = profile?.company_name || profile?.company || (customer as any)?.companyName || '';

        setFormData((prev) => ({
          ...prev,
          name: prev.name || name,
          phone: prev.phone || phone,
          email: prev.email || email,
          company: prev.company || company,
        }));
      } catch {
        // silent
      }
    }

    loadCustomerAutofill();
  }, []);

  useEffect(() => {
    if (!shareOpen) return;

    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareOpen]);

  const selectedCompatibleGroup = useMemo(() => {
    return compatibleGroups.find((group) => group.id === selectedCompatibleGroupId) || null;
  }, [compatibleGroups, selectedCompatibleGroupId]);

  const compatibleProducts = selectedCompatibleGroup?.products || [];

  const gallery = useMemo(() => {
    if (!product) return [];
    const merged = [product.image, ...(product.gallery || [])].filter(Boolean);
    return Array.from(new Set(merged));
  }, [product]);

  const parsedSpecs = useMemo(
    () => parseSpecificationsText(product?.specificationsText),
    [product?.specificationsText]
  );

  const manufacturer = useMemo(() => {
    const directBrand = String(product?.brand || '').trim();

    if (directBrand) {
      return directBrand;
    }

    const manufacturerSpec = parsedSpecs.find((spec) => {
      const name = spec.name.toLowerCase().replace('ё', 'е').trim();
      return name === 'производитель' || name === 'бренд';
    });

    return manufacturerSpec?.value || 'не указан';
  }, [product?.brand, parsedSpecs]);

  function formatDescriptionText(value?: string | null): string[] {
    const raw = String(value || '')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!raw) return [];

    let text = raw;

    const markers = [
      'Производитель:',
      'Диаметр режущей части D, мм:',
      'Длина рабочей части l1, мм:',
      'Длина обнижения l2: мм',
      'Длина обнижения l2, мм:',
      'Общая длина L, мм:',
      'Диаметр хвостовика d2(h6), мм:',
      'Размер радиуса R, мм:',
      'Количество зубьев, Z:',
      'Исполнение:',
      'Серия:',
      'Покрытие:',
      'Helix 39°/42°',
      'Helix 39°/42°:',
      'Обрабатываемый материал:',
      'DP (Differential Pitch)',
      'DH (Differential Helix)',
    ];

    markers.forEach((marker) => {
      const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`\\s*${escaped}`, 'gi'), `\n${marker}`);
    });

    text = text
      .replace(/^\n+/, '')
      .replace(/\n+/g, '\n')
      .replace(/\s*\.\s*/g, '.\n');

    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const descriptionParagraphs = useMemo(
    () => formatDescriptionText(product?.description),
    [product?.description]
  );

  const displayPrice = useMemo(() => {
    if (!product?.price || product.price <= 0) return 'Цена по запросу';

    return `${product.price.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₽/шт`;
  }, [product?.price]);

  const displayStatus =
    product?.availabilityText || (product?.isAvailable ? 'В наличии' : 'Под заказ');

  const statusColorClass = product?.isAvailable
    ? 'text-[#0f6a3b]'
    : displayStatus.toLowerCase().includes('под заказ')
      ? 'text-primary'
      : 'text-[#a33a3a]';

  const activeImage = selectedImage || product?.image || gallery[0] || '';
  const hasRealActiveImage = hasRealImage(activeImage);
  const favoriteActive = product ? favorites.includes(product.id) : false;
  const compareActive = product ? compare.includes(product.id) : false;
  const cartQuantity = product
    ? cart.find((item) => item.productId === product.id)?.quantity ?? 0
    : 0;

  useEffect(() => {
    if (cartQuantity > 0 && cartPhase === 'idle') setCartPhase('done');
  }, [cartQuantity, cartPhase]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(product?.name || 'Товар');

  const handleShare = () => {
    setShareOpen((prev) => !prev);
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setShareCopied(false);
    }
  };

  const handleSwitchToQuestion = (messagePrefix: string) => {
    setQuestionType('');
    setFormData((prev) => ({
      ...prev,
      message: `${messagePrefix}. Интересует товар: ${product?.name || ''}`,
    }));
    setActiveTab('question');
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (cartPhase === 'launch' || cartPhase === 'drop' || cartPhase === 'exit' || cartPhase === 'enter') return;

    addToCart(product.id, localQuantity);
    setCartPhase('launch');
    pushTimeout(() => setCartPhase('drop'), 360);
    pushTimeout(() => setCartPhase('exit'), 980);
    pushTimeout(() => setCartPhase('enter'), 1460);
    pushTimeout(() => setCartPhase('done'), 1980);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) {
      setSubmitErrorMessage('Товар не найден. Обновите страницу и попробуйте снова.');
      setSubmitSuccessMessage('');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccessMessage('');
    setSubmitErrorMessage('');

    try {
      const utm = getUtmParams();

      await createLead({
        customer_name: formData.name,
        phone: formData.phone,
        email: formData.email,
        company: formData.company,
        comment: formData.message,
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        source: 'product_page',
        items: [
          {
            product_id: product.id,
            product_name: product.name,
            product_slug: product.slug,
            quantity: localQuantity,
          },
        ],
      });

      setSubmitSuccessMessage('Спасибо! Ваш запрос отправлен. Мы свяжемся с вами в ближайшее время.');
      setSubmitErrorMessage('');
      setFormData(getInitialFormData(product.name));
    } catch (error: any) {
      console.error('Error creating lead:', error);

      const message =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось отправить запрос. Попробуйте еще раз.';

      setSubmitErrorMessage(message);
      setSubmitSuccessMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />

      <div style={{ minHeight: '600px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <LoadingSpinner />
          </div>
        ) : !product ? (
          <div className="max-w-[100rem] mx-auto px-4 sm:px-8 py-16 sm:py-32 text-center">
            <h1 className="font-heading text-2xl sm:text-4xl text-graphite mb-4">
              Товар не найден
            </h1>
            <Link to={fromCatalog}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base">
                Вернуться в каталог
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <section className="bg-white py-4 sm:py-5 border-b border-graphite/10">
              <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
                <div className="flex items-center gap-2 sm:gap-3 font-paragraph text-xs sm:text-sm text-steel-gray overflow-x-auto">
                  <Link to="/" className="hover:text-primary transition-colors whitespace-nowrap">
                    Главная
                  </Link>
                  <span className="text-graphite/40">/</span>
                  <Link to="/catalog" className="hover:text-primary transition-colors whitespace-nowrap">
                    Каталог
                  </Link>
                  {breadcrumbs.map((category, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const href = isLast && fromCatalog ? fromCatalog : buildCategoryHref(breadcrumbs, index);

                    return (
                      <div key={category.id} className="contents">
                        <span className="text-graphite/40">/</span>
                        <Link to={href} className="hover:text-primary transition-colors whitespace-nowrap">
                          {category.name}
                        </Link>
                      </div>
                    );
                  })}
                  <span className="text-graphite/40">/</span>
                  <span className="text-graphite whitespace-nowrap truncate">{product.name}</span>
                </div>
              </div>
            </section>

            <section className="bg-white border-b border-graphite/10 py-4 sm:py-5">
              <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
                <h1 className="mb-3 max-w-[1100px] font-heading text-[22px] leading-[1.15] text-graphite sm:text-[28px] lg:text-[32px]">
                  {product.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-7 gap-y-3 font-paragraph text-[16px] sm:text-[18px] text-steel-gray">
                  {product.sku && (
                    <span className="inline-flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <span>Артикул:</span>
                      <span className="font-medium text-graphite">{product.sku}</span>
                    </span>
                  )}

                  <span>
                    Производитель:{' '}
                    <span className="font-medium text-graphite">
                      {manufacturer}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <section className="py-6 sm:py-10">
              <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-start">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="bg-white rounded-xl p-4 sm:p-6 sticky top-24 border border-graphite/10">
                      <div className="flex gap-3">
                        {gallery.length > 1 && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {gallery.map((imageUrl, index) => {
                              const isActive = imageUrl === activeImage;

                              return (
                                <button
                                  key={`${imageUrl}-${index}`}
                                  type="button"
                                  onClick={() => setSelectedImage(imageUrl)}
                                  className={`w-[80px] h-[80px] overflow-hidden rounded-lg border transition flex-shrink-0 ${
                                    isActive
                                      ? 'border-primary ring-2 ring-primary/20'
                                      : 'border-graphite/10 hover:border-primary/40'
                                  }`}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`${product.name} ${index + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    sizes="80px"
                                    className="w-full h-full object-contain bg-white p-1.5"
                                    draggable={false}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="relative flex-1 min-h-[360px] sm:min-h-[460px] flex items-center justify-center">
                          {hasRealActiveImage ? (
                            <img
                              src={activeImage}
                              alt={product.name || 'Товар'}
                              loading="eager"
                              decoding="async"
                              sizes="(min-width: 1024px) 45vw, 100vw"
                              className="max-h-[360px] sm:max-h-[460px] max-w-full w-auto object-contain"
                              draggable={false}
                            />
                          ) : (
                            <div className="h-[360px] w-full sm:h-[460px]">
                              <ProductImageFallback />
                            </div>
                          )}

                          <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                const willAdd = !favoriteActive;
                                toggleFavorite(product.id);
                                if (willAdd) animateFlyToHeader(e, activeImage, '[data-favorites-icon]');
                              }}
                              className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-all ${
                                favoriteActive
                                  ? 'border-red-500 bg-red-500 text-white shadow-md'
                                  : 'border-black/10 bg-white/90 text-graphite hover:border-red-300 hover:text-red-500'
                              }`}
                              aria-label={favoriteActive ? 'Убрать из избранного' : 'В избранное'}
                              title={favoriteActive ? 'Убрать из избранного' : 'В избранное'}
                            >
                              <Heart className={`h-5 w-5 ${favoriteActive ? 'fill-white' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                const willAdd = !compareActive;
                                toggleCompare(product.id);
                                if (willAdd) animateFlyToHeader(e, activeImage, '[data-compare-icon]');
                              }}
                              className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-all ${
                                compareActive
                                  ? 'border-primary bg-primary text-primary-foreground shadow-md'
                                  : 'border-black/10 bg-white/90 text-graphite hover:border-primary/40 hover:text-primary'
                              }`}
                              aria-label={compareActive ? 'Убрать из сравнения' : 'Сравнить'}
                              title={compareActive ? 'Убрать из сравнения' : 'Сравнить'}
                            >
                              <BarChart3 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="min-h-[580px] bg-white rounded-xl border border-graphite/10 p-5 sm:p-6 sticky top-24">
                      <div className="mb-5 border-b border-graphite/10 pb-5">
                        <div className="flex flex-col gap-5">
                          <div className="text-center">
                            <div className="font-heading text-[34px] font-bold leading-none text-graphite sm:text-[40px]">
                              {displayPrice}
                            </div>
                          </div>

                          <div className={`grid items-stretch gap-4 ${product.price > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                            <div className="flex min-h-[120px] items-center gap-4 rounded-xl border border-graphite/10 bg-background p-4 sm:p-5">
                              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                                <CircleCheck className={`h-6 w-6 ${statusColorClass}`} />
                              </div>

                              <div>
                                <p className="font-paragraph text-sm text-steel-gray">Статус</p>
                                <p className={`mt-1 font-paragraph text-xl font-medium leading-snug ${statusColorClass}`}>
                                  {displayStatus}
                                </p>
                              </div>
                            </div>

                            {product.price > 0 && (
                              <div className="flex min-h-[120px] items-center rounded-xl border border-graphite/10 bg-background p-4 sm:p-5">
                                <p className="font-paragraph text-[16px] leading-7 text-graphite">
                                  Цена действительна только для интернет-магазина и может отличаться от цен в розничных магазинах
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {!product.isAvailable && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSwitchToQuestion('Сообщить при изменении цены')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-graphite/10 bg-white px-3 py-2 text-xs font-medium text-steel-gray transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            <Bell className="h-3.5 w-3.5" />
                            Сообщить при изменении цены
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSwitchToQuestion('Сообщить при поступлении')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-graphite/10 bg-white px-3 py-2 text-xs font-medium text-steel-gray transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            <Bell className="h-3.5 w-3.5" />
                            Сообщить при поступлении
                          </button>
                        </div>
                      )}

                      <div className="mb-4 flex items-stretch gap-3">
                        <div className="flex h-12 min-w-[112px] overflow-hidden rounded-lg border border-graphite/10 bg-[#f6f7f9]">
                          <button
                            type="button"
                            onClick={() => setLocalQuantity((prev) => Math.max(prev - 1, 1))}
                            aria-label="Уменьшить количество"
                            className="h-12 w-10 flex items-center justify-center text-graphite hover:bg-black/5 transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <div className="flex-1 h-12 flex items-center justify-center text-base font-medium text-graphite">
                            {localQuantity}
                          </div>

                          <button
                            type="button"
                            onClick={() => setLocalQuantity((prev) => Math.min(prev + 1, 999))}
                            aria-label="Увеличить количество"
                            className="h-12 w-10 flex items-center justify-center text-graphite hover:bg-black/5 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddToCart}
                          className="relative h-12 flex-1 min-w-[140px] rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <div className="absolute inset-0 overflow-visible pointer-events-none">
                            <div
                              className={`absolute left-1/2 top-1/2 -translate-y-1/2 transition-all ${
                                cartPhase === 'idle'
                                  ? '-translate-x-1/2 opacity-100 duration-300'
                                  : cartPhase === 'launch'
                                    ? '-translate-x-1/2 opacity-100 duration-300'
                                    : cartPhase === 'drop'
                                      ? '-translate-x-1/2 opacity-100 duration-300'
                                      : cartPhase === 'exit'
                                        ? 'translate-x-[150px] opacity-100 duration-700'
                                        : cartPhase === 'enter'
                                          ? 'translate-x-[150px] opacity-0 duration-200'
                                          : 'translate-x-[150px] opacity-0 duration-200'
                              }`}
                            >
                              <ShoppingCart className="h-5 w-5" />
                            </div>

                            <div
                              className={`absolute z-20 left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 rounded-md overflow-hidden border border-black/10 shadow-[0_12px_30px_rgba(0,0,0,0.22)] bg-[#f3f4f6] transition-all ease-out ${
                                cartPhase === 'launch'
                                  ? 'opacity-100 -translate-y-[92px] scale-100 rotate-[-10deg] duration-300'
                                  : cartPhase === 'drop'
                                    ? 'opacity-100 translate-y-[-4px] scale-[0.42] rotate-0 duration-500'
                                    : 'opacity-0 -translate-y-1/2 scale-[0.2] duration-200'
                              }`}
                            >
                              <img
                                src={hasRealImage(activeImage) ? activeImage : '/placeholder.png'}
                                alt=""
                                loading="eager"
                                decoding="async"
                                className="h-full w-full object-contain p-1.5"
                                draggable={false}
                              />
                            </div>

                            <div
                              className={`absolute left-1/2 top-1/2 flex items-center gap-2 -translate-y-1/2 transition-all ${
                                cartPhase === 'idle'
                                  ? '-translate-x-[220px] opacity-0 duration-100'
                                  : cartPhase === 'launch'
                                    ? '-translate-x-[220px] opacity-0 duration-100'
                                    : cartPhase === 'drop'
                                      ? '-translate-x-[220px] opacity-0 duration-100'
                                      : cartPhase === 'exit'
                                        ? '-translate-x-[220px] opacity-0 duration-100'
                                        : cartPhase === 'enter'
                                          ? '-translate-x-1/2 opacity-100 duration-520'
                                          : '-translate-x-1/2 opacity-100 duration-0'
                              }`}
                            >
                              <ShoppingCart className="h-5 w-5" />
                              <span className="font-paragraph text-sm font-semibold whitespace-nowrap">
                                В корзине{cartQuantity > 0 ? ` (${cartQuantity})` : ''}
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="mb-5 flex flex-wrap items-center gap-3">
                        <div ref={shareRef} className="relative">
                          <button
                            type="button"
                            onClick={handleShare}
                            className="inline-flex items-center gap-2 rounded-lg border border-graphite/10 bg-white px-4 py-2.5 text-sm font-medium text-graphite transition-all hover:border-primary/40 hover:text-primary"
                          >
                            <Share2 className="h-4 w-4" />
                            Поделиться
                          </button>

                          {shareOpen && (
                            <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border border-graphite/10 bg-white p-2 shadow-xl">
                              <a
                                href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-graphite transition-colors hover:bg-background"
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366] text-xs font-bold text-white">
                                  W
                                </span>
                                WhatsApp
                              </a>

                              <a
                                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-graphite transition-colors hover:bg-background"
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#229ED9] text-xs font-bold text-white">
                                  T
                                </span>
                                Telegram
                              </a>

                              <a
                                href={`https://vk.com/share.php?url=${encodedUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-graphite transition-colors hover:bg-background"
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#0077ff] text-[10px] font-bold text-white">
                                  VK
                                </span>
                                ВКонтакте
                              </a>

                              <hr className="my-1 border-graphite/10" />

                              <button
                                type="button"
                                onClick={handleCopyLink}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-graphite transition-colors hover:bg-background"
                              >
                                {shareCopied ? (
                                  <>
                                    <Check className="h-5 w-5 text-green-600" />
                                    Скопировано
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-5 w-5 text-steel-gray" />
                                    Скопировать ссылку
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        <a
                          href={`/api/product-pdf.pdf?id=${encodeURIComponent(product.slug || product.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <Download className="h-4 w-4" />
                          Скачать PDF
                        </a>

                        {product.pdfUrl && (
                          <a
                            href={product.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-graphite/10 bg-white px-4 py-2.5 text-sm font-medium text-graphite transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            <Download className="h-4 w-4" />
                            PDF спецификация
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            <section className="py-6 sm:py-8">
              <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
                <div className="rounded-xl border border-graphite/10 bg-white overflow-hidden">
                  <div className="flex border-b border-graphite/10 overflow-x-auto">
                    {[
                      { id: 'description' as ProductTab, label: 'Описание' },
                      { id: 'specs' as ProductTab, label: 'Характеристики' },
                      { id: 'question' as ProductTab, label: 'Задать вопрос' },
                      { id: 'compatible' as ProductTab, label: 'Подходящие товары' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveTab(id)}
                        className={`flex-shrink-0 px-5 sm:px-7 py-4 text-sm sm:text-base font-medium font-paragraph transition-all border-b-2 -mb-px ${
                          activeTab === id
                            ? 'border-b-primary text-primary bg-white'
                            : 'border-b-transparent text-steel-gray bg-[#fafafa] hover:text-graphite hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="p-5 sm:p-8">
                    {activeTab === 'description' && (
                      descriptionParagraphs.length > 0 ? (
                        <div className="space-y-1 font-paragraph text-[16px] leading-8 text-steel-gray">
                          {descriptionParagraphs.map((line, index) => (
                            <p key={index}>{line}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="font-paragraph text-steel-gray">Описание отсутствует.</p>
                      )
                    )}

                    {activeTab === 'specs' && (
                      parsedSpecs.length > 0 ? (
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-graphite/10">
                            {parsedSpecs.map((row, i) => {
                              const tip = getSpecTooltip(row.name, row.value);

                              return (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-background'}>
                                  <td className="py-3 pr-6 font-paragraph text-steel-gray w-1/2 align-top">
                                    {tip ? (
                                      <span className="relative group inline-flex items-center gap-1.5">
                                        <span>{row.name}</span>
                                        <span tabIndex={0} className="outline-none">
                                          <Info className="h-3.5 w-3.5 cursor-help text-steel-gray/40 flex-shrink-0" />
                                        </span>
                                        <span className="pointer-events-none absolute left-0 top-5 z-50 hidden w-72 rounded-lg border border-graphite/10 bg-white p-3 text-[12px] leading-5 text-graphite shadow-xl group-hover:block group-focus-within:block">
                                          {tip}
                                        </span>
                                      </span>
                                    ) : (
                                      row.name
                                    )}
                                  </td>
                                  <td className="py-3 font-paragraph text-graphite font-medium w-1/2 align-top">
                                    {row.value}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <p className="font-paragraph text-steel-gray">Характеристики не указаны.</p>
                      )
                    )}

                    {activeTab === 'question' && (
                      <div className="max-w-2xl">
                        <div className="mb-4">
                          <label className="mb-1.5 block font-paragraph text-sm text-steel-gray">
                            Тип вопроса
                          </label>
                          <select
                            value={questionType}
                            onChange={(e) => {
                              const newType = e.target.value;
                              setQuestionType(newType);
                              setFormData((prev) => ({
                                ...prev,
                                message: newType
                                  ? `${newType}. Интересует товар: ${product?.name || ''}`
                                  : getInitialMessage(product?.name),
                              }));
                            }}
                            className="w-full rounded-lg border border-graphite/10 bg-white px-3 py-2.5 font-paragraph text-sm text-graphite focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">— Выберите тип вопроса —</option>
                            {QUESTION_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                          <Input
                            type="text"
                            placeholder="Ваше имя *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            disabled={isSubmitting}
                            className="text-sm"
                          />
                          <Input
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={isSubmitting}
                            className="text-sm"
                          />
                          <Input
                            type="tel"
                            placeholder="Телефон *"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            disabled={isSubmitting}
                            className="text-sm"
                          />
                          <Input
                            type="text"
                            placeholder="Компания"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            disabled={isSubmitting}
                            className="text-sm"
                          />
                          <Textarea
                            placeholder="Комментарий"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={4}
                            disabled={isSubmitting}
                            className="text-sm"
                          />

                          {submitSuccessMessage && (
                            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                              {submitSuccessMessage}
                            </div>
                          )}

                          {submitErrorMessage && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {submitErrorMessage}
                            </div>
                          )}

                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-paragraph text-sm sm:text-base py-4 sm:py-6 disabled:opacity-70"
                          >
                            {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
                          </Button>
                        </form>
                      </div>
                    )}

                    {activeTab === 'compatible' && (
                      <div>
                        {compatibleGroups.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {compatibleGroups.map((group) => (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() => setSelectedCompatibleGroupId(group.id)}
                                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                                  selectedCompatibleGroupId === group.id
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-graphite/10 bg-white text-graphite hover:border-primary/40 hover:text-primary'
                                }`}
                              >
                                {group.title}
                              </button>
                            ))}
                          </div>
                        )}

                        {isCompatibleLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <LoadingSpinner />
                          </div>
                        ) : compatibleProducts.length > 0 ? (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {compatibleProducts.map((item) => (
                              <Link
                                key={item.id}
                                to={item.slug ? `/product/${item.slug}` : `/product/${item.id}`}
                                state={{ from: `${location.pathname}${location.search}` }}
                                className="group"
                              >
                                <div className="bg-background rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-graphite/10 h-full flex flex-col">
                                  <div className="relative h-40 sm:h-48 overflow-hidden bg-white">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.name || 'Товар'}
                                        loading="lazy"
                                        decoding="async"
                                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                                        className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105 sm:p-4"
                                        draggable={false}
                                      />
                                    ) : (
                                      <ProductImageFallback />
                                    )}
                                  </div>
                                  <div className="p-3 sm:p-4 flex-1 flex flex-col">
                                    <h3 className="font-heading text-sm sm:text-base text-graphite group-hover:text-primary transition-colors line-clamp-2">
                                      {item.name}
                                    </h3>
                                    {item.brand && (
                                      <p className="font-paragraph text-xs text-steel-gray mt-1">
                                        {item.brand}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="font-paragraph text-steel-gray">
                            {compatibleGroups.length === 0
                              ? 'Подходящие товары пока не найдены.'
                              : 'В этой группе нет товаров.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {(isRelatedLoading || relatedProducts.length > 0) && (
              <section className="py-8 sm:py-16 bg-white border-t border-graphite/10">
                <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
                  <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-graphite mb-8 sm:mb-12">
                    Похожие товары
                  </h2>

                  {isRelatedLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      {relatedProducts.map((relatedProduct) => (
                        <Link
                          key={relatedProduct.id}
                          to={
                            relatedProduct.slug
                              ? `/product/${relatedProduct.slug}`
                              : `/product/${relatedProduct.id}`
                          }
                          state={{ from: `${location.pathname}${location.search}` }}
                          className="group"
                        >
                          <div className="bg-background rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-graphite/10 h-full flex flex-col">
                            <div className="relative h-40 sm:h-48 overflow-hidden bg-white">
                              {relatedProduct.image ? (
                                <img
                                  src={relatedProduct.image}
                                  alt={relatedProduct.name || 'Товар'}
                                  loading="lazy"
                                  decoding="async"
                                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                                  className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105 sm:p-4"
                                  draggable={false}
                                />
                              ) : (
                                <ProductImageFallback />
                              )}
                            </div>
                            <div className="p-3 sm:p-4 flex-1 flex flex-col">
                              <h3 className="font-heading text-sm sm:text-base text-graphite group-hover:text-primary transition-colors line-clamp-2">
                                {relatedProduct.name}
                              </h3>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

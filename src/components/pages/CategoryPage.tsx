
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  ProductGrid,
  type CatalogViewMode,
  type CatalogSortMode,
} from '@/components/catalog/ProductGrid';
import {
  getCatalogPageData,
  resolveCategoryByPath,
  getChildCategories,
  type CategoryRow,
  type ProductCard,
  type CatalogFacet,
  type CatalogFilters,
  type CatalogPageData,
} from '@/lib/catalog-service';
import { usePageMeta } from '@/lib/use-page-meta';

const LS_VIEW_MODE = 'catalog_view_mode';
const LS_SORT_MODE = 'catalog_sort_mode';
const CATALOG_PAGE_SIZE = 24;

type ExpandedState = {
  price: boolean;
  availability: boolean;
  advanced: boolean;
  specs: Record<string, boolean>;
};

type UrlFilterState = {
  inStockOnly: boolean;
  priceMin: string;
  priceMax: string;
  specFilters: Record<string, string[]>;
};

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string;
const BUCKET = 'catalog-media';

function getCategoryHeroUrl(slugs: string[]): string | null {
  const cleanSlugs = slugs.map((item) => String(item || '').trim()).filter(Boolean);

  if (!cleanSlugs.length) return null;

  const preferredSlug = cleanSlugs[cleanSlugs.length - 1];
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/category-heroes/${preferredSlug}.png`;
}

function getParentCategoryHeroUrl(slugs: string[]): string | null {
  const cleanSlugs = slugs.map((item) => String(item || '').trim()).filter(Boolean);

  if (!cleanSlugs.length) return null;

  const rootSlug = cleanSlugs[0];
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/category-heroes/${rootSlug}.png`;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => String(value || '').trim()).filter(Boolean))
  );
}

function parseNumberInput(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/−/g, '-');

  if (!normalized) return null;

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function formatNumberInput(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

function createExpandedState(facets: CatalogFacet[]): ExpandedState {
  const specs: Record<string, boolean> = {};

  facets.forEach((facet) => {
    specs[facet.key] = false;
  });

  return {
    price: true,
    availability: true,
    advanced: true,
    specs,
  };
}

function readFiltersFromSearchParams(searchParams: URLSearchParams): UrlFilterState {
  const specFilters: Record<string, string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith('f_')) continue;

    const facetKey = key.slice(2).trim();
    const values = uniqueStrings(value.split('|').map((item) => item.trim()));

    if (facetKey && values.length) {
      specFilters[facetKey] = values;
    }
  }

  return {
    inStockOnly: searchParams.get('stock') === '1',
    priceMin: searchParams.get('price_from') || '',
    priceMax: searchParams.get('price_to') || '',
    specFilters,
  };
}

function writeFiltersToSearchParams(filters: UrlFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.inStockOnly) {
    params.set('stock', '1');
  }

  if (filters.priceMin.trim()) {
    params.set('price_from', filters.priceMin.trim());
  }

  if (filters.priceMax.trim()) {
    params.set('price_to', filters.priceMax.trim());
  }

  Object.entries(filters.specFilters)
    .sort(([a], [b]) => a.localeCompare(b, 'ru'))
    .forEach(([facetKey, values]) => {
      const normalizedValues = uniqueStrings(values);
      if (!normalizedValues.length) return;
      params.set(`f_${facetKey}`, normalizedValues.join('|'));
    });

  return params;
}

function buildCatalogFilters(filters: UrlFilterState): CatalogFilters {
  const priceFrom = parseNumberInput(filters.priceMin);
  const priceTo = parseNumberInput(filters.priceMax);

  return {
    onlyAvailable: filters.inStockOnly,
    priceFrom,
    priceTo,
    specFilters: filters.specFilters,
  };
}

function countActiveFilters(filters: UrlFilterState): number {
  const specCount = Object.values(filters.specFilters).reduce(
    (acc, values) => acc + values.length,
    0
  );

  return (
    (filters.inStockOnly ? 1 : 0) +
    (filters.priceMin.trim() ? 1 : 0) +
    (filters.priceMax.trim() ? 1 : 0) +
    specCount
  );
}

function mapSortModeToCatalogSort(sortMode: CatalogSortMode) {
  switch (sortMode) {
    case 'name_asc':
      return 'name_asc' as const;
    case 'name_desc':
      return 'name_desc' as const;
    case 'price_asc':
      return 'price_asc' as const;
    case 'price_desc':
      return 'price_desc' as const;
    case 'availability_desc':
      return 'availability' as const;
    case 'availability_asc':
      return 'availability' as const;
    case 'default':
    default:
      return 'default' as const;
  }
}

function getAppliedChips(facets: CatalogFacet[], filters: UrlFilterState) {
  const chips: Array<{
    key: string;
    label: string;
    value?: string;
    kind: 'stock' | 'price' | 'facet';
  }> = [];

  if (filters.inStockOnly) {
    chips.push({
      key: 'stock',
      label: 'В наличии',
      kind: 'stock',
    });
  }

  if (filters.priceMin.trim() || filters.priceMax.trim()) {
    const parts: string[] = [];
    if (filters.priceMin.trim()) parts.push(`от ${filters.priceMin.trim()}`);
    if (filters.priceMax.trim()) parts.push(`до ${filters.priceMax.trim()}`);

    chips.push({
      key: 'price',
      label: `Цена: ${parts.join(' ')}`,
      kind: 'price',
    });
  }

  for (const facet of facets) {
    const selected = filters.specFilters[facet.key] || [];
    for (const value of selected) {
      chips.push({
        key: facet.key,
        label: `${facet.label}: ${value}`,
        value,
        kind: 'facet',
      });
    }
  }

  return chips;
}

const SUBCATEGORY_DESCRIPTIONS: Record<string, string> = {
  'frezy': 'Концевые, торцевые и фасонные фрезы для чистовой и черновой обработки.',
  'reztsy': 'Токарные резцы и державки для наружного и внутреннего точения.',
  'svyorla': 'Спиральные, центровочные и ружейные свёрла по металлу.',
  'metochniki': 'Метчики машинные и ручные для нарезания внутренней резьбы.',
  'plashki': 'Плашки круглые и раздвижные для нарезания наружной резьбы.',
  'razvyortki': 'Развёртки машинные и ручные для чистовой обработки отверстий.',
  'zenkovki': 'Зенковки и зенкеры для обработки торцов и конических поверхностей.',
  'patrony': 'Токарные, фрезерные и сверлильные патроны для зажима инструмента.',
  'tisk': 'Станочные и слесарные тиски для надёжного крепления заготовок.',
  'shtangentsirkuli': 'Цифровые и нониусные штангенциркули с высокой точностью.',
  'mikrometry': 'Микрометры гладкие и резьбовые для прецизионных измерений.',
  'indikatory': 'Индикаторы часового типа и цифровые для контроля точности.',
  'shlifovalnye-krugi': 'Круги шлифовальные различных форм и зернистости.',
  'otreznye-krugi': 'Отрезные и обдирочные круги по металлу и нержавеющей стали.',
  'nadfili': 'Надфили и напильники для ручной доводки и зачистки деталей.',
  'klyuchi': 'Гаечные, торцевые и динамометрические ключи.',
  'otvertki': 'Отвёртки и биты для монтажных работ.',
};

const CASCADE_SELECT_LABELS: Record<string, [string, string, string]> = {
  'rezbovye-plastiny': ['Профиль резьбы', 'Тип резьбы', 'Группа'],
};

function getCascadeLabels(slug: string): [string, string, string] {
  return CASCADE_SELECT_LABELS[slug] || ['Тип', 'Серия', 'Группа'];
}

function buildCategoryPath(slugs: string[] = []) {
  const normalized = slugs.map((item) => String(item || '').trim()).filter(Boolean);
  return normalized.length
    ? `/catalog/${normalized.map((item) => encodeURIComponent(item)).join('/')}`
    : '/catalog';
}

function parseCatalogPathSlugs(pathname: string): string[] {
  const normalizedPath = String(pathname || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');

  const parts = normalizedPath.split('/').filter(Boolean);

  if (!parts.length) return [];
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

export default function CategoryPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const pathSlugs = useMemo(() => parseCatalogPathSlugs(location.pathname), [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentCategory, setCurrentCategory] = useState<CategoryRow | null>(null);

  usePageMeta({
    title: currentCategory?.name || 'Каталог продукции',
    description: currentCategory
      ? `Купить ${currentCategory.name} в АВТОграф. Широкий выбор, наличие на складе, доставка по России.`
      : 'Товары выбранной категории каталога АВТОграф с фильтрами, характеристиками и наличием.',
  });
  const [breadcrumbs, setBreadcrumbs] = useState<CategoryRow[]>([]);
  const [catalogData, setCatalogData] = useState<CatalogPageData | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cat1Options, setCat1Options] = useState<CategoryRow[]>([]);
  const [cat2Options, setCat2Options] = useState<CategoryRow[]>([]);
  const [cat3Options, setCat3Options] = useState<CategoryRow[]>([]);


  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = window.localStorage.getItem(LS_VIEW_MODE);
    if (saved === 'grid' || saved === 'compact' || saved === 'list') return saved;
    return 'grid';
  });

  const [sortMode, setSortMode] = useState<CatalogSortMode>(() => {
    if (typeof window === 'undefined') return 'default';
    const saved = window.localStorage.getItem(LS_SORT_MODE);
    if (
      saved === 'default' ||
      saved === 'name_asc' ||
      saved === 'name_desc' ||
      saved === 'price_asc' ||
      saved === 'price_desc' ||
      saved === 'availability_desc' ||
      saved === 'availability_asc'
    ) {
      return saved;
    }
    return 'default';
  });

  const [draftFilters, setDraftFilters] = useState<UrlFilterState>(() =>
    readFiltersFromSearchParams(searchParams)
  );

  const [expanded, setExpanded] = useState<ExpandedState>({
    price: true,
    availability: true,
    advanced: true,
    specs: {},
  });

  useEffect(() => {
    window.localStorage.setItem(LS_VIEW_MODE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    window.localStorage.setItem(LS_SORT_MODE, sortMode);
  }, [sortMode]);

  useEffect(() => {
    setDraftFilters(readFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const cat1Id = searchParams.get('cat1') || '';

    if (!cat1Id) {
      setCat2Options([]);
      setCat3Options([]);
      return;
    }

    let isMounted = true;

    getChildCategories(cat1Id).then((children) => {
      if (isMounted) setCat2Options(children);
    });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    const cat2Id = searchParams.get('cat2') || '';

    if (!cat2Id) {
      setCat3Options([]);
      return;
    }

    let isMounted = true;

    getChildCategories(cat2Id).then((children) => {
      if (isMounted) setCat3Options(children);
    });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setLoading(true);
      setError('');

      try {
        if (!pathSlugs.length) {
          if (isMounted) {
            setCurrentCategory(null);
            setBreadcrumbs([]);
            setCatalogData(null);
            setLoading(false);
          }
          return;
        }

        const chain: CategoryRow[] = [];

        for (let i = 0; i < pathSlugs.length; i++) {
          const partialPath = pathSlugs.slice(0, i + 1);
          const category = await resolveCategoryByPath(...partialPath);

          if (!category) {
            if (isMounted) {
              setCurrentCategory(null);
              setBreadcrumbs([]);
              setCatalogData(null);
              setLoading(false);
            }
            return;
          }

          chain.push(category);
        }

        if (!isMounted) return;

        const category = chain[chain.length - 1] || null;

        if (!category) {
          setCurrentCategory(null);
          setBreadcrumbs([]);
          setCatalogData(null);
          setLoading(false);
          return;
        }

        const filters = buildCatalogFilters(readFiltersFromSearchParams(searchParams));

        // Load cascade options for depth >= 2 pages
        const slugDepth = pathSlugs.length;
        if (slugDepth >= 2) {
          const children = await getChildCategories(category.id);
          if (isMounted) setCat1Options(children);
        } else {
          if (isMounted) setCat1Options([]);
        }

        // Effective category: if cascade filters selected, narrow the scope
        const urlCat3Id = searchParams.get('cat3') || '';
        const urlCat2Id = searchParams.get('cat2') || '';
        const urlCat1Id = searchParams.get('cat1') || '';
        const effectiveCategoryId = urlCat3Id || urlCat2Id || urlCat1Id || category.id;

        const data = await getCatalogPageData({
          categoryId: effectiveCategoryId,
          filters,
          sort: mapSortModeToCatalogSort(sortMode),
          page: 1,
          pageSize: CATALOG_PAGE_SIZE,
        });

        if (!isMounted) return;

        if (!data) {
          setCurrentCategory(null);
          setBreadcrumbs([]);
          setCatalogData(null);
          setLoading(false);
          return;
        }

        setCurrentCategory(category);
        setBreadcrumbs(chain);
        setCatalogData(data);

        setExpanded((prev) => {
          const next = createExpandedState(data.facets);

          return {
            price: prev.price,
            availability: prev.availability,
            advanced: prev.advanced,
            specs: {
              ...next.specs,
              ...prev.specs,
            },
          };
        });
      } catch (e: any) {
        if (!isMounted) return;
        console.error('CategoryPage load error:', e);
        setError(e?.message || 'Ошибка загрузки раздела.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [pathSlugs, searchParams, sortMode]);

  const childCategories = catalogData?.scope.childCategories || [];

  // Cascade selects are shown for category pages at depth >= 2 (subgroup level and deeper).
  // Depth 1 (top-level groups like "Токарная обработка") keeps the card grid navigation.
  const shouldShowCascade = pathSlugs.length >= 2;

  const showChildCategories = Boolean(
    currentCategory && !error && childCategories.length > 0 && !shouldShowCascade
  );

  const showProducts = Boolean(
    currentCategory && !error && (childCategories.length === 0 || shouldShowCascade)
  );

  const sortedChildCategories = useMemo(() => {
    return [...childCategories].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [childCategories]);

  const appliedFilters = useMemo(
    () => readFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const appliedFilterCount = useMemo(
    () => countActiveFilters(appliedFilters),
    [appliedFilters]
  );

  const draftFilterCount = useMemo(
    () => countActiveFilters(draftFilters),
    [draftFilters]
  );

  const products: ProductCard[] = catalogData?.items || [];
  const facets = catalogData?.facets || [];

  const cat1Id = searchParams.get('cat1') || '';
  const cat2Id = searchParams.get('cat2') || '';
  const cat3Id = searchParams.get('cat3') || '';
  const cascadeLabels = getCascadeLabels(currentCategory?.slug || '');

  const appliedChips = useMemo(
    () => getAppliedChips(facets, appliedFilters),
    [facets, appliedFilters]
  );

  const currentPathSlugs = useMemo(() => {
    if (breadcrumbs.length) {
      return breadcrumbs.map((item) => item.slug).filter(Boolean);
    }
    return pathSlugs;
  }, [breadcrumbs, pathSlugs]);

  const categoryPageFrom = useMemo(() => {
    return `${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);

  const handleApplyFilters = () => {
    const nextParams = writeFiltersToSearchParams(draftFilters);

    const currentCat1 = searchParams.get('cat1') || '';
    const currentCat2 = searchParams.get('cat2') || '';
    const currentCat3 = searchParams.get('cat3') || '';

    if (currentCat1) nextParams.set('cat1', currentCat1);
    if (currentCat2) nextParams.set('cat2', currentCat2);
    if (currentCat3) nextParams.set('cat3', currentCat3);

    setSearchParams(nextParams, { replace: true });
  };

  const handleResetFilters = () => {
    const nextState: UrlFilterState = {
      inStockOnly: false,
      priceMin: '',
      priceMax: '',
      specFilters: {},
    };

    const nextParams = writeFiltersToSearchParams(nextState);

    const currentCat1 = searchParams.get('cat1') || '';
    const currentCat2 = searchParams.get('cat2') || '';
    const currentCat3 = searchParams.get('cat3') || '';

    if (currentCat1) nextParams.set('cat1', currentCat1);
    if (currentCat2) nextParams.set('cat2', currentCat2);
    if (currentCat3) nextParams.set('cat3', currentCat3);

    setDraftFilters(nextState);
    setSearchParams(nextParams, { replace: true });
  };

  const handleCat1Change = (id: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (id) nextParams.set('cat1', id);
    else nextParams.delete('cat1');

    nextParams.delete('cat2');
    nextParams.delete('cat3');

    setSearchParams(nextParams, { replace: true });
  };

  const handleCat2Change = (id: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (id) nextParams.set('cat2', id);
    else nextParams.delete('cat2');

    nextParams.delete('cat3');

    setSearchParams(nextParams, { replace: true });
  };

  const handleCat3Change = (id: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (id) nextParams.set('cat3', id);
    else nextParams.delete('cat3');

    setSearchParams(nextParams, { replace: true });
  };

  const handleAvailabilityToggle = (checked: boolean) => {
    setDraftFilters((prev) => ({
      ...prev,
      inStockOnly: checked,
    }));
  };

  const handlePriceChange = (field: 'priceMin' | 'priceMax', value: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFacetToggle = (facetKey: string, value: string) => {
    setDraftFilters((prev) => {
      const current = prev.specFilters[facetKey] || [];
      const nextValues = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      const nextSpecFilters = { ...prev.specFilters };

      if (nextValues.length) {
        nextSpecFilters[facetKey] = nextValues;
      } else {
        delete nextSpecFilters[facetKey];
      }

      return {
        ...prev,
        specFilters: nextSpecFilters,
      };
    });
  };

  const preserveCategoryParams = (params: URLSearchParams) => {
    const currentCat1 = searchParams.get('cat1') || '';
    const currentCat2 = searchParams.get('cat2') || '';
    const currentCat3 = searchParams.get('cat3') || '';

    if (currentCat1) params.set('cat1', currentCat1);
    if (currentCat2) params.set('cat2', currentCat2);
    if (currentCat3) params.set('cat3', currentCat3);

    return params;
  };

  const removeAppliedChip = (chip: {
    key: string;
    value?: string;
    kind: 'stock' | 'price' | 'facet';
  }) => {
    if (chip.kind === 'stock') {
      const next = { ...appliedFilters, inStockOnly: false };
      setDraftFilters(next);
      setSearchParams(preserveCategoryParams(writeFiltersToSearchParams(next)), { replace: true });
      return;
    }

    if (chip.kind === 'price') {
      const next = { ...appliedFilters, priceMin: '', priceMax: '' };
      setDraftFilters(next);
      setSearchParams(preserveCategoryParams(writeFiltersToSearchParams(next)), { replace: true });
      return;
    }

    const currentValues = appliedFilters.specFilters[chip.key] || [];
    const nextValues = currentValues.filter((item) => item !== chip.value);
    const nextSpecFilters = { ...appliedFilters.specFilters };

    if (nextValues.length) {
      nextSpecFilters[chip.key] = nextValues;
    } else {
      delete nextSpecFilters[chip.key];
    }

    const next = {
      ...appliedFilters,
      specFilters: nextSpecFilters,
    };

    setDraftFilters(next);
    setSearchParams(preserveCategoryParams(writeFiltersToSearchParams(next)), { replace: true });
  };

  const toggleSpecExpanded = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      specs: {
        ...prev.specs,
        [key]: !prev.specs[key],
      },
    }));
  };


  const handleLoadMoreProducts = async () => {
  if (!currentCategory || !catalogData || isLoadingMore || !catalogData.hasMore) {
    return;
  }

  setIsLoadingMore(true);
  setError('');

  try {
    const filters = buildCatalogFilters(readFiltersFromSearchParams(searchParams));

    const moreCat3Id = searchParams.get('cat3') || '';
    const moreCat2Id = searchParams.get('cat2') || '';
    const moreCat1Id = searchParams.get('cat1') || '';
    const moreEffectiveCatId = moreCat3Id || moreCat2Id || moreCat1Id || currentCategory.id;

    const nextData = await getCatalogPageData({
      categoryId: moreEffectiveCatId,
      filters,
      sort: mapSortModeToCatalogSort(sortMode),
      page: catalogData.page + 1,
      pageSize: catalogData.pageSize || CATALOG_PAGE_SIZE,
    });

    if (!nextData) return;

    setCatalogData((prev) => {
      if (!prev) return nextData;

      return {
        ...nextData,
        items: [...prev.items, ...nextData.items],
      };
    });
  } catch (e: any) {
    console.error('CategoryPage load more error:', e);
    setError(e?.message || 'Ошибка загрузки товаров.');
  } finally {
    setIsLoadingMore(false);
  }
};

  if (!loading && !currentCategory) {
    return <Navigate to="/catalog" replace />;
  }

  const heroImage = getCategoryHeroUrl(currentPathSlugs);
  const fallbackHeroImage = getParentCategoryHeroUrl(currentPathSlugs);

  return (
    <div id="main" role="main" className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      <Header />

      <section className="relative overflow-hidden bg-[#0b1220] text-white h-[280px] md:h-[340px] flex items-center">
        {/* Картинка — фон всей секции, прижата вправо */}
        {(heroImage || fallbackHeroImage) && (
          <div className="absolute inset-0">
            <img
              src={heroImage || ''}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain object-right"
              onError={(e) => {
                if (fallbackHeroImage && e.currentTarget.src !== fallbackHeroImage) {
                  e.currentTarget.src = fallbackHeroImage;
                  return;
                }

                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Градиент: левая половина полностью тёмная, плавно открывает картинку справа */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1220] via-[#0b1220]/95 to-[#0b1220]/10" />

        {/* Сетка только поверх тёмной зоны */}
        <div className="absolute inset-0 opacity-30 industrial-grid" />

        {/* Контент */}
        <div className="relative z-10 w-full max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-paragraph text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Главная</Link>
            <span>/</span>
            <Link to="/catalog" className="hover:text-white transition-colors">Каталог</Link>
            {breadcrumbs.map((category, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={category.id}>
                  <span>/</span>
                  {isLast ? (
                    <span className="text-white">{category.name}</span>
                  ) : (
                    <Link
                      to={buildCategoryPath(breadcrumbs.slice(0, index + 1).map((item) => item.slug))}
                      className="hover:text-white transition-colors"
                    >
                      {category.name}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="mb-4 h-[2px] w-16 bg-secondary" />

          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl leading-tight">
            {currentCategory?.name || 'Каталог'}
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white border-b border-graphite/10">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          {error && (
            <div className="py-16 text-center text-red-600 font-paragraph">
              Ошибка загрузки раздела: {error}
            </div>
          )}

          {/* Skeleton — первая загрузка без данных */}
          {!error && !currentCategory && loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[24px] min-h-[500px] bg-slate-200 animate-pulse"
                />
              ))}
            </div>
          )}

          {!error && currentCategory && (
            <div className={`transition-opacity duration-200 ${loading ? 'opacity-80' : 'opacity-100'}`}>
              {showChildCategories && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {sortedChildCategories.map((child, index) => (
                      <motion.div
                        key={child.id}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ duration: 0.45, delay: index * 0.04 }}
                        className="h-full"
                      >
                        <Link
                          to={buildCategoryPath([...currentPathSlugs, child.slug])}
                          className="group flex h-full flex-col overflow-hidden border border-[#d9dde3] bg-white ring-1 ring-black/[0.03] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-primary hover:ring-primary/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.14)]"
                        >
                          <div className="flex h-[220px] shrink-0 items-center justify-center overflow-hidden bg-[#f4f6f8]">
                            {child.image ? (
                              <img
                                src={child.image}
                                alt={child.name}
                                loading="lazy"
                                decoding="async"
                                sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                                className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                                draggable={false}
                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <img src="/fallback-logo.png" alt="" className="h-16 w-16 object-contain opacity-20" draggable={false} />
                            )}
                          </div>

                          <div className="flex flex-1 flex-col border-t border-black/5 p-5 md:p-6">
                            <h3 className="mb-3 font-heading text-lg leading-snug text-graphite transition-colors duration-300 group-hover:text-primary md:text-xl">
                              {child.name}
                            </h3>

                            {SUBCATEGORY_DESCRIPTIONS[child.slug] && (
                              <p className="mb-5 line-clamp-2 font-paragraph text-sm leading-relaxed text-steel-gray">
                                {SUBCATEGORY_DESCRIPTIONS[child.slug]}
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

                    {sortedChildCategories.length === 0 && (
                      <div className="py-16 text-center text-steel-gray font-paragraph">
                        Подкатегории не найдены.
                      </div>
                    )}
                  </div>
                </>
              )}

              {showProducts && (
                <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-8 items-start">
                  <aside className="border border-[#d9dde3] bg-[#fbfbfc] ring-1 ring-black/[0.03]">
                    <div className="px-6 py-5 border-b border-black/5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-heading text-lg font-semibold text-graphite">
                          Фильтр по параметрам
                        </div>
                        {appliedFilterCount > 0 && (
                          <div className="text-xs font-medium text-primary">
                            Активно: {appliedFilterCount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-black/5">
                      <div className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, price: !prev.price }))
                          }
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="font-paragraph text-lg text-graphite">Цена</span>
                          <ChevronDown
                            className={`h-4 w-4 text-steel-gray transition-transform ${
                              expanded.price ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {expanded.price && (
                          <div className="mt-4">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={draftFilters.priceMin}
                                onChange={(e) => handlePriceChange('priceMin', e.target.value)}
                                className="h-11 rounded border border-[#d9dde3] bg-white px-3 text-sm text-graphite outline-none focus:border-primary"
                                placeholder="От"
                              />
                              <input
                                type="text"
                                value={draftFilters.priceMax}
                                onChange={(e) => handlePriceChange('priceMax', e.target.value)}
                                className="h-11 rounded border border-[#d9dde3] bg-white px-3 text-sm text-graphite outline-none focus:border-primary"
                                placeholder="До"
                              />
                            </div>

                            {catalogData?.priceRange && (
                              <div className="mt-3 text-sm text-steel-gray">
                                Диапазон: {formatNumberInput(catalogData.priceRange.min)} —{' '}
                                {formatNumberInput(catalogData.priceRange.max)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              availability: !prev.availability,
                            }))
                          }
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="font-paragraph text-lg text-graphite">
                            Наличие
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-steel-gray transition-transform ${
                              expanded.availability ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {expanded.availability && (
                          <label className="mt-4 flex items-center gap-3 text-[16px] text-graphite cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draftFilters.inStockOnly}
                              onChange={(e) => handleAvailabilityToggle(e.target.checked)}
                              className="h-4 w-4 rounded border-[#d9dde3]"
                            />
                            Только в наличии
                          </label>
                        )}
                      </div>

                      <div className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              advanced: !prev.advanced,
                            }))
                          }
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="font-paragraph text-lg font-semibold text-graphite">
                            {expanded.advanced
                              ? 'Скрыть расширенные фильтры'
                              : 'Расширенные фильтры'}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-steel-gray transition-transform ${
                              expanded.advanced ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {expanded.advanced &&
                        facets.map((facet) => (
                          <div key={facet.key} className="px-6 py-5">
                            <button
                              type="button"
                              onClick={() => toggleSpecExpanded(facet.key)}
                              className="w-full flex items-center justify-between text-left"
                            >
                              <span className="font-paragraph text-lg text-graphite">
                                {facet.label}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 text-steel-gray transition-transform ${
                                  expanded.specs[facet.key] ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {expanded.specs[facet.key] && (
                              <div className="mt-4 space-y-3 max-h-[300px] overflow-auto pr-1">
                                {facet.options.map((option) => (
                                  <label
                                    key={`${facet.key}-${option.value}`}
                                    className={`flex items-start justify-between gap-3 cursor-pointer ${
                                      option.count === 0 && !option.selected ? 'opacity-50' : ''
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={(
                                          draftFilters.specFilters[facet.key] || []
                                        ).includes(option.value)}
                                        onChange={() =>
                                          handleFacetToggle(facet.key, option.value)
                                        }
                                        className="mt-1 h-4 w-4 rounded border-[#d9dde3]"
                                      />
                                      <span className="text-[16px] text-graphite">
                                        {option.label}
                                      </span>
                                    </div>

                                    <span className="shrink-0 text-sm text-steel-gray">
                                      {option.count}
                                    </span>
                                  </label>
                                ))}

                                {facet.totalOptions > facet.options.length && (
                                  <div className="pt-1 text-sm text-steel-gray">
                                    Показано {facet.options.length} из {facet.totalOptions}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                      <div className="px-6 py-6">
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={handleApplyFilters}
                            className="w-full h-12 rounded bg-primary text-white font-medium hover:bg-primary/90 transition"
                          >
                            Показать (
                            {draftFilterCount !== appliedFilterCount
                              ? 'обновить'
                              : catalogData?.total || 0}
                            )
                          </button>

                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="w-full h-12 rounded border border-[#cfd5de] bg-white text-steel-gray font-medium hover:border-primary/40 hover:text-primary transition"
                          >
                            Сбросить
                          </button>
                        </div>
                      </div>
                    </div>
                  </aside>

                  <div className="min-w-0">
                    {appliedChips.length > 0 && (
                      <div className="mb-6 flex flex-wrap gap-2">
                        {appliedChips.map((chip, index) => (
                          <button
                            key={`${chip.kind}-${chip.key}-${chip.value || index}`}
                            type="button"
                            onClick={() => removeAppliedChip(chip)}
                            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-graphite hover:border-primary/40 hover:bg-primary/10 transition"
                          >
                            <span>{chip.label}</span>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    )}

                    <ProductGrid
                      products={products}
                      emptyText="Товары по выбранным параметрам не найдены."
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      sortMode={sortMode}
                      onSortModeChange={setSortMode}
                      itemLinkState={{ from: categoryPageFrom }}
                      total={catalogData?.total || products.length}
                      hasMore={Boolean(catalogData?.hasMore)}
                      isLoadingMore={isLoadingMore}
                      onLoadMore={handleLoadMoreProducts}
                      categoryFilters={
                        shouldShowCascade && cat1Options.length > 0 ? (
                          <>
                            <div className="relative">
                              <select
                                value={cat1Id}
                                onChange={(e) => handleCat1Change(e.target.value)}
                                className="h-12 min-w-[200px] appearance-none rounded-lg border border-[#d9dde3] bg-white pl-4 pr-10 text-base text-graphite outline-none transition focus:border-primary"
                              >
                                <option value="">{cascadeLabels[0]}</option>
                                {cat1Options.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite" />
                            </div>

                            {cat1Id && cat2Options.length > 0 && (
                              <div className="relative">
                                <select
                                  value={cat2Id}
                                  onChange={(e) => handleCat2Change(e.target.value)}
                                  className="h-12 min-w-[200px] appearance-none rounded-lg border border-[#d9dde3] bg-white pl-4 pr-10 text-base text-graphite outline-none transition focus:border-primary"
                                >
                                  <option value="">{cascadeLabels[1]}</option>
                                  {cat2Options.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite" />
                              </div>
                            )}

                            {cat2Id && cat3Options.length > 0 && (
                              <div className="relative">
                                <select
                                  value={cat3Id}
                                  onChange={(e) => handleCat3Change(e.target.value)}
                                  className="h-12 min-w-[200px] appearance-none rounded-lg border border-[#d9dde3] bg-white pl-4 pr-10 text-base text-graphite outline-none transition focus:border-primary"
                                >
                                  <option value="">{cascadeLabels[2]}</option>
                                  {cat3Options.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite" />
                              </div>
                            )}
                          </>
                        ) : undefined
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && !catalogData && !error && (
            <div className="py-16 text-center text-steel-gray font-paragraph">
              Загрузка данных раздела...
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
} 

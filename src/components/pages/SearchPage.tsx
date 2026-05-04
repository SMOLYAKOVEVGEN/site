import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  ProductGrid,
  type CatalogSortMode,
  type CatalogViewMode,
} from '@/components/catalog/ProductGrid';
import {
  searchProducts,
  type ProductCard,
  type SearchFacets,
} from '@/lib/catalog-service';
import { usePageMeta } from '@/lib/use-page-meta';

const LS_SEARCH_VIEW_MODE = 'search_view_mode';
const LS_SEARCH_SORT_MODE = 'search_sort_mode';

function isValidViewMode(value: string | null): value is CatalogViewMode {
  return value === 'grid' || value === 'compact' || value === 'list';
}

function isValidSortMode(value: string | null): value is CatalogSortMode {
  return (
    value === 'default' ||
    value === 'name_asc' ||
    value === 'name_desc' ||
    value === 'price_asc' ||
    value === 'price_desc' ||
    value === 'availability_desc' ||
    value === 'availability_asc'
  );
}

function normalizeQueryValue(value: string | null): string {
  return String(value || '').trim();
}

function parseCsvParam(value: string | null): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function buildCsvParam(values: string[]): string | null {
  const normalized = uniqueStrings(values);
  return normalized.length ? normalized.join(',') : null;
}

function mapCatalogSortToSearchSort(sortMode: CatalogSortMode) {
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
      return 'relevance' as const;
  }
}

function sortProductsClientSide(
  products: ProductCard[],
  sortMode: CatalogSortMode
): ProductCard[] {
  const items = [...products];

  switch (sortMode) {
    case 'name_asc':
      return items.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ru'));

    case 'name_desc':
      return items.sort((a, b) => b.itemName.localeCompare(a.itemName, 'ru'));

    case 'price_asc':
      return items.sort((a, b) => {
        const aPrice = a.itemPrice > 0 ? a.itemPrice : Number.MAX_SAFE_INTEGER;
        const bPrice = b.itemPrice > 0 ? b.itemPrice : Number.MAX_SAFE_INTEGER;
        return aPrice - bPrice || a.itemName.localeCompare(b.itemName, 'ru');
      });

    case 'price_desc':
      return items.sort((a, b) => {
        const aPrice = a.itemPrice || 0;
        const bPrice = b.itemPrice || 0;
        return bPrice - aPrice || a.itemName.localeCompare(b.itemName, 'ru');
      });

    case 'availability_desc':
      return items.sort((a, b) => {
        const aAvailable = a.isAvailable ? 1 : 0;
        const bAvailable = b.isAvailable ? 1 : 0;
        if (aAvailable !== bAvailable) return bAvailable - aAvailable;
        return a.itemName.localeCompare(b.itemName, 'ru');
      });

    case 'availability_asc':
      return items.sort((a, b) => {
        const aAvailable = a.isAvailable ? 1 : 0;
        const bAvailable = b.isAvailable ? 1 : 0;
        if (aAvailable !== bAvailable) return aAvailable - bAvailable;
        return a.itemName.localeCompare(b.itemName, 'ru');
      });

    case 'default':
    default:
      return items;
  }
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite/80">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

type FilterCheckboxProps = {
  checked: boolean;
  label: string;
  count?: number;
  onChange: () => void;
};

function FilterCheckbox({ checked, label, count, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 transition hover:bg-muted/60">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 rounded border-border"
      />
      <span className="flex-1 text-sm text-graphite">
        {label}
        {typeof count === 'number' ? (
          <span className="ml-2 text-steel-gray">({count})</span>
        ) : null}
      </span>
    </label>
  );
}

export default function SearchPage() {
  usePageMeta({
    title: 'Поиск по каталогу',
    description: 'Поиск товаров, категорий и инженерных решений в каталоге АВТОграф.',
  });
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastSearchKeyRef = useRef<string | null>(null);

  const [inputValue, setInputValue] = useState(() =>
    normalizeQueryValue(searchParams.get('q'))
  );
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [facets, setFacets] = useState<SearchFacets>({
    brands: [],
    categories: [],
    availability: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = window.localStorage.getItem(LS_SEARCH_VIEW_MODE);
    if (isValidViewMode(saved)) return saved;
    return 'grid';
  });

  const [sortMode, setSortMode] = useState<CatalogSortMode>(() => {
    const fromUrl = searchParams.get('sort');
    if (isValidSortMode(fromUrl)) return fromUrl;

    if (typeof window === 'undefined') return 'default';
    const saved = window.localStorage.getItem(LS_SEARCH_SORT_MODE);
    if (isValidSortMode(saved)) return saved;

    return 'default';
  });

  const normalizedQuery = useMemo(() => normalizeQueryValue(inputValue), [inputValue]);
  const brandsParam = searchParams.get('brands') || '';
  const categoriesParam = searchParams.get('categories') || '';
  const availableParam = searchParams.get('available') || '';

  const selectedBrandIds = useMemo(
    () => uniqueStrings(parseCsvParam(brandsParam)),
    [brandsParam]
  );

  const selectedCategoryIds = useMemo(
    () => uniqueStrings(parseCsvParam(categoriesParam)),
    [categoriesParam]
  );

  const onlyAvailable = useMemo(
    () => availableParam === '1',
    [availableParam]
  );
  const searchSort = useMemo(() => mapCatalogSortToSearchSort(sortMode), [sortMode]);
  const searchRequestKey = useMemo(
    () =>
      JSON.stringify({
        query: normalizedQuery,
        sort: searchSort,
        brandIds: selectedBrandIds,
        categoryIds: selectedCategoryIds,
        onlyAvailable,
      }),
    [normalizedQuery, searchSort, selectedBrandIds, selectedCategoryIds, onlyAvailable]
  );

  const searchPageFrom = useMemo(() => {
    return `${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);

  useEffect(() => {
    const urlQuery = normalizeQueryValue(searchParams.get('q'));
    setInputValue((prev) => (prev === urlQuery ? prev : urlQuery));
  }, [searchParams]);

  useEffect(() => {
    window.localStorage.setItem(LS_SEARCH_VIEW_MODE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    window.localStorage.setItem(LS_SEARCH_SORT_MODE, sortMode);
  }, [sortMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentUrlQuery = normalizeQueryValue(searchParams.get('q'));
      if (currentUrlQuery === normalizedQuery) return;

      const nextParams = new URLSearchParams(searchParams);
      if (normalizedQuery) {
        nextParams.set('q', normalizedQuery);
      } else {
        nextParams.delete('q');
      }

      setSearchParams(nextParams, { replace: true });
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [normalizedQuery, searchParams, setSearchParams]);

  useEffect(() => {
    const currentSort = searchParams.get('sort');
    const normalizedSort = sortMode === 'default' ? null : sortMode;

    if (currentSort === (normalizedSort || null)) return;

    const nextParams = new URLSearchParams(searchParams);
    if (normalizedSort) {
      nextParams.set('sort', normalizedSort);
    } else {
      nextParams.delete('sort');
    }

    setSearchParams(nextParams, { replace: true });
  }, [sortMode, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      if (normalizedQuery.length < 2) {
        lastSearchKeyRef.current = null;
        if (!cancelled) {
          setProducts([]);
          setFacets({
            brands: [],
            categories: [],
            availability: [],
          });
          setIsLoading(false);
        }
        return;
      }

      try {
        if (lastSearchKeyRef.current === searchRequestKey) return;
        lastSearchKeyRef.current = searchRequestKey;

        if (!cancelled) setIsLoading(true);

        const result = await searchProducts({
          query: normalizedQuery,
          limit: 48,
          sort: searchSort,
          brandIds: selectedBrandIds,
          categoryIds: selectedCategoryIds,
          onlyAvailable,
        });

        if (cancelled) return;

        let items = result.items;

        if (sortMode === 'availability_asc') {
          items = sortProductsClientSide(items, sortMode);
        }

        setProducts(items);
        setFacets(result.facets);
      } catch (error) {
        if (cancelled) return;
        lastSearchKeyRef.current = null;
        console.error('Search error:', error);
        setProducts([]);
        setFacets({
          brands: [],
          categories: [],
          availability: [],
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const timer = window.setTimeout(runSearch, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    searchRequestKey,
    normalizedQuery,
    sortMode,
    searchSort,
    selectedBrandIds,
    selectedCategoryIds,
    onlyAvailable,
  ]);

  const totalResults = products.length;
  const hasActiveFilters =
    selectedBrandIds.length > 0 || selectedCategoryIds.length > 0 || onlyAvailable;

  const brandFacetOptions = useMemo(
    () => facets.brands.filter((item) => item.value && item.label),
    [facets.brands]
  );

  const categoryFacetOptions = useMemo(
    () => facets.categories.filter((item) => item.value && item.label),
    [facets.categories]
  );

  const selectedBrandLabels = useMemo(() => {
    const map = new Map(brandFacetOptions.map((item) => [item.value, item.label]));
    return selectedBrandIds.map((id) => ({
      value: id,
      label: map.get(id) || id,
      type: 'brand' as const,
    }));
  }, [brandFacetOptions, selectedBrandIds]);

  const selectedCategoryLabels = useMemo(() => {
    const map = new Map(categoryFacetOptions.map((item) => [item.value, item.label]));
    return selectedCategoryIds.map((id) => ({
      value: id,
      label: map.get(id) || id,
      type: 'category' as const,
    }));
  }, [categoryFacetOptions, selectedCategoryIds]);

  const activeChips = useMemo(() => {
    const chips = [
      ...selectedBrandLabels,
      ...selectedCategoryLabels,
      ...(onlyAvailable
        ? [{ value: 'available', label: 'Только в наличии', type: 'availability' as const }]
        : []),
    ];

    return chips;
  }, [selectedBrandLabels, selectedCategoryLabels, onlyAvailable]);

  const updateMultiParam = (key: 'brands' | 'categories', values: string[]) => {
    const nextParams = new URLSearchParams(searchParams);
    const csv = buildCsvParam(values);

    if (csv) {
      nextParams.set(key, csv);
    } else {
      nextParams.delete(key);
    }

    setSearchParams(nextParams, { replace: true });
  };

  const toggleBrand = (brandId: string) => {
    const next = selectedBrandIds.includes(brandId)
      ? selectedBrandIds.filter((id) => id !== brandId)
      : [...selectedBrandIds, brandId];

    updateMultiParam('brands', next);
  };

  const toggleCategory = (categoryId: string) => {
    const next = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];

    updateMultiParam('categories', next);
  };

  const toggleOnlyAvailable = () => {
    const nextParams = new URLSearchParams(searchParams);

    if (onlyAvailable) {
      nextParams.delete('available');
    } else {
      nextParams.set('available', '1');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const clearAllFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('brands');
    nextParams.delete('categories');
    nextParams.delete('available');
    setSearchParams(nextParams, { replace: true });
  };

  const removeChip = (chip: { value: string; type: 'brand' | 'category' | 'availability' }) => {
    if (chip.type === 'brand') {
      updateMultiParam(
        'brands',
        selectedBrandIds.filter((id) => id !== chip.value)
      );
      return;
    }

    if (chip.type === 'category') {
      updateMultiParam(
        'categories',
        selectedCategoryIds.filter((id) => id !== chip.value)
      );
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('available');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />

      <section className="bg-graphite py-20 text-primary-foreground">
        <div className="mx-auto max-w-[100rem] px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="mb-8 font-heading text-5xl lg:text-6xl">
              Поиск по каталогу
            </h1>

            <div className="relative max-w-4xl">
              <Search className="absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-steel-gray" />
              <Input
                type="text"
                placeholder="Введите название, артикул, бренд, характеристику или запрос вроде «пластина 10 мм»"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="bg-white py-8 pl-16 pr-6 text-lg text-graphite"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-primary-foreground/80">
              <span>Поиск понимает артикул, бренд, категорию, характеристики и смешанные запросы</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16" style={{ minHeight: '600px' }}>
        <div className="mx-auto max-w-[100rem] px-8">
          {normalizedQuery.length < 2 ? (
            <div className="py-16 text-center">
              <p className="font-paragraph text-xl text-steel-gray">
                Введите минимум 2 символа для начала поиска
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[320px,minmax(0,1fr)]">
              <aside className="hidden xl:block">
                <div className="sticky top-24 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-graphite">Фильтры</h2>
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-sm text-steel-gray transition hover:text-graphite"
                      >
                        Сбросить
                      </button>
                    ) : null}
                  </div>

                  <FilterSection title="Наличие">
                    <FilterCheckbox
                      checked={onlyAvailable}
                      label="Только в наличии"
                      onChange={toggleOnlyAvailable}
                    />
                  </FilterSection>

                  <FilterSection title="Бренды">
                    {brandFacetOptions.length ? (
                      brandFacetOptions.map((item) => (
                        <FilterCheckbox
                          key={item.value}
                          checked={selectedBrandIds.includes(item.value)}
                          label={item.label}
                          count={item.count}
                          onChange={() => toggleBrand(item.value)}
                        />
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-steel-gray">Нет доступных значений</p>
                    )}
                  </FilterSection>

                  <FilterSection title="Категории">
                    {categoryFacetOptions.length ? (
                      categoryFacetOptions.map((item) => (
                        <FilterCheckbox
                          key={item.value}
                          checked={selectedCategoryIds.includes(item.value)}
                          label={item.label}
                          count={item.count}
                          onChange={() => toggleCategory(item.value)}
                        />
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-steel-gray">Нет доступных значений</p>
                    )}
                  </FilterSection>
                </div>
              </aside>

              <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    {isLoading ? (
                      <p className="font-paragraph text-lg text-steel-gray">Идет поиск...</p>
                    ) : totalResults > 0 ? (
                      <p className="font-paragraph text-lg text-steel-gray">
                        По запросу <span className="text-graphite">«{normalizedQuery}»</span> найдено товаров:{' '}
                        <span className="font-medium text-graphite">{totalResults}</span>
                      </p>
                    ) : (
                      <p className="font-paragraph text-lg text-steel-gray">
                        По запросу <span className="text-graphite">«{normalizedQuery}»</span> ничего не найдено
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-graphite transition hover:bg-muted xl:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Фильтры
                  </button>
                </div>

                {isFiltersOpen ? (
                  <div className="mb-6 space-y-5 xl:hidden">
                    <FilterSection title="Наличие">
                      <FilterCheckbox
                        checked={onlyAvailable}
                        label="Только в наличии"
                        onChange={toggleOnlyAvailable}
                      />
                    </FilterSection>

                    <FilterSection title="Бренды">
                      {brandFacetOptions.length ? (
                        brandFacetOptions.map((item) => (
                          <FilterCheckbox
                            key={item.value}
                            checked={selectedBrandIds.includes(item.value)}
                            label={item.label}
                            count={item.count}
                            onChange={() => toggleBrand(item.value)}
                          />
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-steel-gray">Нет доступных значений</p>
                      )}
                    </FilterSection>

                    <FilterSection title="Категории">
                      {categoryFacetOptions.length ? (
                        categoryFacetOptions.map((item) => (
                          <FilterCheckbox
                            key={item.value}
                            checked={selectedCategoryIds.includes(item.value)}
                            label={item.label}
                            count={item.count}
                            onChange={() => toggleCategory(item.value)}
                          />
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-steel-gray">Нет доступных значений</p>
                      )}
                    </FilterSection>
                  </div>
                ) : null}

                {activeChips.length ? (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {activeChips.map((chip) => (
                      <button
                        key={`${chip.type}_${chip.value}`}
                        type="button"
                        onClick={() => removeChip(chip)}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-graphite transition hover:bg-muted"
                      >
                        <span>{chip.label}</span>
                        <X className="h-4 w-4" />
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm text-steel-gray transition hover:bg-muted hover:text-graphite"
                    >
                      Сбросить все
                    </button>
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="py-16 text-center">
                    <p className="font-paragraph text-xl text-steel-gray">
                      Идет поиск...
                    </p>
                  </div>
                ) : totalResults === 0 ? (
                  <div className="rounded-3xl border border-border bg-card px-8 py-16 text-center">
                    <p className="mb-4 font-paragraph text-xl text-steel-gray">
                      По запросу «{normalizedQuery}» ничего не найдено
                    </p>
                    <p className="font-paragraph text-steel-gray">
                      Попробуйте артикул, часть названия, бренд, размер, стандарт, серию или уберите часть фильтров
                    </p>
                  </div>
                ) : (
                  <div data-search-from={searchPageFrom}>
                    <ProductGrid
                      products={products}
                      emptyText="Товары не найдены"
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      sortMode={sortMode}
                      onSortModeChange={setSortMode}
                      itemLinkState={{ from: searchPageFrom } as any}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

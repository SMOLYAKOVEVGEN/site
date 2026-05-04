import { supabase } from '@/lib/supabase';

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image: string | null;
  source_type: string | null;
  root_group_slug?: string | null;
  root_group_name?: string | null;
  level?: number | null;
};

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number | null;
  description?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  is_available?: boolean | null;
  availability_text?: string | null;
  source_url?: string | null;
  specifications?: unknown;
  brand_id: string | null;
  category_id: string | null;
  stock_qty?: number | null;
  currency?: string | null;
  measure?: string | null;
  source_site_id?: string | null;
};

export type BrandRow = {
  id: string;
  name: string;
};

export type ProductImageRow = {
  product_id: string;
  url: string;
  is_main: boolean | null;
  sort_order: number | null;
};

export type ProductDocumentRow = {
  product_id: string;
  url: string;
  name: string | null;
  sort_order: number | null;
};

export type ProductCard = {
  _id: string;
  itemName: string;
  productSlug: string;
  itemImage: string;
  productSku: string;
  brand: string;
  brandId: string;
  categoryId: string;
  itemPrice: number;
  isAvailable: boolean;
  availabilityText: string;
  specifications: Record<string, string>;
};

export type ProductView = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  brandId: string;
  categoryId: string;
  price: number;
  description: string;
  isAvailable: boolean;
  availabilityText: string;
  specificationsText: string;
  specifications: Record<string, string>;
  image: string;
  gallery: string[];
  pdfUrl: string;
};

export type RelatedProductCard = {
  id: string;
  name: string;
  slug: string;
  image: string;
  brand: string;
};

export type SearchSort =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'availability';

export type SearchFacetOption = {
  value: string;
  label: string;
  count: number;
};

export type SearchFacets = {
  brands: SearchFacetOption[];
  categories: SearchFacetOption[];
  availability: SearchFacetOption[];
};

export type SearchProductsParams = {
  query: string;
  limit?: number;
  sort?: SearchSort;
  brandIds?: string[];
  categoryIds?: string[];
  onlyAvailable?: boolean;
};

export type SearchMeta = {
  originalQuery: string;
  normalizedQuery: string;
  normalizedSkuLikeQuery: string;
  queryVariants: string[];
  tokens: string[];
  limit: number;
  total: number;
  appliedFilters: {
    brandIds: string[];
    categoryIds: string[];
    onlyAvailable: boolean;
  };
};

export type SearchProductsResult = {
  items: ProductCard[];
  facets: SearchFacets;
  meta: SearchMeta;
};

export type CatalogSort =
  | 'default'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'availability';

export type CatalogFacetOption = {
  value: string;
  label: string;
  count: number;
  selected: boolean;
};

export type CatalogFacet = {
  key: string;
  label: string;
  type: 'enum';
  options: CatalogFacetOption[];
  totalOptions: number;
};

export type CatalogPriceRange = {
  min: number;
  max: number;
};

export type CatalogFilters = {
  onlyAvailable?: boolean;
  priceFrom?: number | null;
  priceTo?: number | null;
  specFilters?: Record<string, string[]>;
};

export type CatalogCategoryScope = {
  rootCategory: CategoryRow;
  scopeCategoryIds: string[];
  scopeCategories: CategoryRow[];
  childCategories: CategoryRow[];
  isLeaf: boolean;
};

export type CatalogPageData = {
  scope: CatalogCategoryScope;
  items: ProductCard[];
  facets: CatalogFacet[];
  total: number;
  unfilteredTotal: number;
  priceRange: CatalogPriceRange | null;
  availableCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  appliedFilters: {
    onlyAvailable: boolean;
    priceFrom: number | null;
    priceTo: number | null;
    specFilters: Record<string, string[]>;
  };
};

type NormalizedSpecEntry = {
  key: string;
  label: string;
  value: string;
};

const DEFAULT_SEARCH_LIMIT = 48;
const CATALOG_PRODUCTS_PAGE_SIZE = 24;
const CATALOG_PRODUCTS_SCAN_LIMIT = 5000;
const MAX_VISIBLE_FACET_OPTIONS = 50;

type ResolvedAvailability = {
  isAvailable: boolean;
  availabilityText: string;
};

function containsAvailabilityToken(value: string, tokens: string[]): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return tokens.some((token) => normalized.includes(token));
}

function resolveAvailability(product: {
  is_available?: boolean | null;
  availability_text?: string | null;
  stock_qty?: number | null;
}): ResolvedAvailability {
  const rawText = String(product.availability_text || '').trim();
  const stockQty =
    typeof product.stock_qty === 'number' && Number.isFinite(product.stock_qty)
      ? product.stock_qty
      : null;

  if (stockQty !== null) {
    if (stockQty > 0) {
      return {
        isAvailable: true,
        availabilityText: `Есть в наличии (${stockQty})`,
      };
    }

    if (rawText) {
      if (containsAvailabilityToken(rawText, ['под заказ'])) {
        return {
          isAvailable: false,
          availabilityText: 'Под заказ',
        };
      }

      if (containsAvailabilityToken(rawText, ['нет в наличии', 'нет на складе', 'отсутствует'])) {
        return {
          isAvailable: false,
          availabilityText: 'Нет в наличии',
        };
      }

      return {
        isAvailable: false,
        availabilityText: rawText,
      };
    }

    return {
      isAvailable: false,
      availabilityText: 'Нет в наличии',
    };
  }

  if (rawText) {
    if (containsAvailabilityToken(rawText, ['под заказ'])) {
      return {
        isAvailable: false,
        availabilityText: 'Под заказ',
      };
    }

    if (containsAvailabilityToken(rawText, ['нет в наличии', 'нет на складе', 'отсутствует'])) {
      return {
        isAvailable: false,
        availabilityText: 'Нет в наличии',
      };
    }

    if (containsAvailabilityToken(rawText, ['в наличии', 'есть в наличии', 'на складе'])) {
      return {
        isAvailable: true,
        availabilityText: rawText,
      };
    }

    return {
      isAvailable: Boolean(product.is_available),
      availabilityText: rawText,
    };
  }

  if (Boolean(product.is_available)) {
    return {
      isAvailable: true,
      availabilityText: 'В наличии',
    };
  }

  return {
    isAvailable: false,
    availabilityText: 'Нет в наличии',
  };
}

function normalizeSpecKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*:\s*/g, ': ')
    .replace(/[–—−]/g, '-');
}

function normalizeSpecValue(value: string): string {
  return String(value || '')
    .trim()
    .replace(/[ё]/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/[×✕✖]/g, 'x')
    .replace(/[–—−]/g, '-');
}

function sanitizeSpecRecord(specs: Record<string, string>): Record<string, string> {
  const entries = Object.entries(specs)
    .map(([rawKey, rawValue]) => {
      const label = String(rawKey || '').trim();
      const normalizedKey = normalizeSpecKey(label);
      const value = normalizeSpecValue(rawValue);

      if (!label || !normalizedKey || !value) return null;
      return [normalizedKey, value] as const;
    })
    .filter(Boolean) as Array<readonly [string, string]>;

  const result: Record<string, string> = {};

  for (const [key, value] of entries) {
    result[key] = value;
  }

  return result;
}

function normalizeSpecifications(specs: unknown): Record<string, string> {
  if (!specs || typeof specs !== 'object') return {};

  if (!Array.isArray(specs)) {
    const result = Object.entries(specs as Record<string, unknown>).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        const normalizedKey = String(key || '').trim();
        const normalizedValue = String(value ?? '').trim();

        if (!normalizedKey || !normalizedValue || normalizedValue === '[object Object]') {
          return acc;
        }

        acc[normalizedKey] = normalizedValue;
        return acc;
      },
      {}
    );

    return sanitizeSpecRecord(result);
  }

  const result = (specs as Array<Record<string, unknown>>).reduce<Record<string, string>>(
    (acc, item) => {
      if (!item || typeof item !== 'object') return acc;

      const rawKey =
        item.key ??
        item.name ??
        item.title ??
        item.label ??
        item.parameter ??
        item.characteristic;

      const rawValue =
        item.value ??
        item.val ??
        item.text ??
        item.content;

      const normalizedKey = String(rawKey ?? '').trim();
      const normalizedValue = String(rawValue ?? '').trim();

      if (!normalizedKey || !normalizedValue) return acc;

      acc[normalizedKey] = normalizedValue;
      return acc;
    },
    {}
  );

  return sanitizeSpecRecord(result);
}

function specsToText(specs: unknown): string {
  const normalized = normalizeSpecifications(specs);

  return Object.entries(normalized)
    .filter(([key, value]) => key.trim() && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function isFakeProductImageUrl(url: string | null | undefined): boolean {
  const normalized = String(url || '').trim().toLowerCase();
  if (!normalized) return true;

  const checks = [
    '/0.png',
    '/0.jpg',
    '/0.jpeg',
    '/0.webp',
    '/placeholder.png',
    '/placeholder.jpg',
    '/placeholder.jpeg',
    '/placeholder.webp',
    '/no-photo',
    '/noimage',
    '/no-image',
  ];

  return checks.some((part) => normalized.includes(part));
}

function filterRealImages(images: ProductImageRow[]): ProductImageRow[] {
  return images.filter((img) => {
    const url = String(img.url || '').trim();
    return url && !isFakeProductImageUrl(url);
  });
}

function pickMainImage(images: ProductImageRow[]): string {
  const realImages = filterRealImages(images);
  if (!realImages.length) return '';

  const sorted = [...realImages].sort((a, b) => {
    const aMain = a.is_main ? 1 : 0;
    const bMain = b.is_main ? 1 : 0;
    if (aMain !== bMain) return bMain - aMain;

    const aOrder = a.sort_order ?? 9999;
    const bOrder = b.sort_order ?? 9999;
    return aOrder - bOrder;
  });

  return sorted[0]?.url || '';
}

function sortImages(images: ProductImageRow[]): ProductImageRow[] {
  return [...filterRealImages(images)].sort((a, b) => {
    const aMain = a.is_main ? 1 : 0;
    const bMain = b.is_main ? 1 : 0;
    if (aMain !== bMain) return bMain - aMain;

    const aOrder = a.sort_order ?? 9999;
    const bOrder = b.sort_order ?? 9999;
    return aOrder - bOrder;
  });
}

function buildBrandMap(brands: BrandRow[]): Map<string, string> {
  const brandMap = new Map<string, string>();

  brands.forEach((brand) => {
    brandMap.set(brand.id, brand.name);
  });

  return brandMap;
}

function buildImageGroups(images: ProductImageRow[]): Map<string, ProductImageRow[]> {
  const imageGroups = new Map<string, ProductImageRow[]>();

  images.forEach((img) => {
    const current = imageGroups.get(img.product_id) || [];
    current.push(img);
    imageGroups.set(img.product_id, current);
  });

  return imageGroups;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function clampSearchLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_SEARCH_LIMIT;
  return Math.max(1, Math.min(100, Number(limit)));
}

export function sortProductCards(items: ProductCard[], sort: SearchSort | CatalogSort): ProductCard[] {
  const result = [...items];

  switch (sort) {
    case 'price_asc':
      return result.sort((a, b) => {
        const aPrice = Number.isFinite(a.itemPrice) ? a.itemPrice : Number.MAX_SAFE_INTEGER;
        const bPrice = Number.isFinite(b.itemPrice) ? b.itemPrice : Number.MAX_SAFE_INTEGER;
        return aPrice - bPrice || a.itemName.localeCompare(b.itemName, 'ru');
      });

    case 'price_desc':
      return result.sort((a, b) => {
        const aPrice = Number.isFinite(a.itemPrice) ? a.itemPrice : -1;
        const bPrice = Number.isFinite(b.itemPrice) ? b.itemPrice : -1;
        return bPrice - aPrice || a.itemName.localeCompare(b.itemName, 'ru');
      });

    case 'name_asc':
      return result.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ru'));

    case 'name_desc':
      return result.sort((a, b) => b.itemName.localeCompare(a.itemName, 'ru'));

    case 'availability':
      return result.sort((a, b) => {
        const aValue = a.isAvailable ? 1 : 0;
        const bValue = b.isAvailable ? 1 : 0;
        return bValue - aValue || a.itemName.localeCompare(b.itemName, 'ru');
      });

    case 'default':
    case 'relevance':
    default:
      return result;
  }
}

export function buildFacets(items: ProductCard[]): SearchFacets {
  const brandMap = new Map<string, SearchFacetOption>();
  const categoryMap = new Map<string, SearchFacetOption>();
  const availabilityMap = new Map<string, SearchFacetOption>();

  items.forEach((item) => {
    if (item.brandId || item.brand) {
      const key = item.brandId || item.brand;
      const current = brandMap.get(key);

      if (current) {
        current.count += 1;
      } else {
        brandMap.set(key, {
          value: item.brandId || item.brand,
          label: item.brand || 'Без бренда',
          count: 1,
        });
      }
    }

    if (item.categoryId) {
      const current = categoryMap.get(item.categoryId);

      if (current) {
        current.count += 1;
      } else {
        categoryMap.set(item.categoryId, {
          value: item.categoryId,
          label: item.categoryId,
          count: 1,
        });
      }
    }

    const availabilityKey = item.isAvailable ? 'available' : 'not_available';
    const availabilityLabel = item.isAvailable ? 'В наличии' : 'Нет в наличии';
    const currentAvailability = availabilityMap.get(availabilityKey);

    if (currentAvailability) {
      currentAvailability.count += 1;
    } else {
      availabilityMap.set(availabilityKey, {
        value: availabilityKey,
        label: availabilityLabel,
        count: 1,
      });
    }
  });

  const sortFacetOptions = (options: SearchFacetOption[]) =>
    options.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));

  return {
    brands: sortFacetOptions(Array.from(brandMap.values())),
    categories: sortFacetOptions(Array.from(categoryMap.values())),
    availability: sortFacetOptions(Array.from(availabilityMap.values())),
  };
}

async function fetchBrandsByIds(brandIds: string[]): Promise<Map<string, string>> {
  if (!brandIds.length) return new Map<string, string>();

  const { data, error } = await supabase.from('brands').select('id, name').in('id', brandIds);

  if (error) throw error;

  return buildBrandMap((data as BrandRow[]) || []);
}

async function fetchImagesByProductIds(
  productIds: string[]
): Promise<Map<string, ProductImageRow[]>> {
  if (!productIds.length) return new Map<string, ProductImageRow[]>();

  const { data, error } = await supabase
    .from('product_images')
    .select('product_id, url, is_main, sort_order')
    .in('product_id', productIds);

  if (error) throw error;

  return buildImageGroups((data as ProductImageRow[]) || []);
}

function mapProductRowToCard(
  product: ProductRow,
  brandMap: Map<string, string>,
  imageGroups: Map<string, ProductImageRow[]>
): ProductCard {
  const imgs = imageGroups.get(product.id) || [];
  const availability = resolveAvailability(product);

  return {
    _id: product.id,
    itemName: product.name || '',
    productSlug: product.slug || '',
    itemImage: pickMainImage(imgs),
    productSku: product.sku || '',
    brand: product.brand_id ? brandMap.get(product.brand_id) || '' : '',
    brandId: product.brand_id || '',
    categoryId: product.category_id || '',
    itemPrice: product.price || 0,
    isAvailable: availability.isAvailable,
    availabilityText: availability.availabilityText,
    specifications: normalizeSpecifications(product.specifications),
  };
}

export async function hydrateProductCards(productRows: ProductRow[]): Promise<ProductCard[]> {
  if (!productRows.length) return [];

  const brandIds = uniqueStrings(productRows.map((p) => p.brand_id));
  const productIds = uniqueStrings(productRows.map((p) => p.id));

  const [brandMap, imageGroups] = await Promise.all([
    fetchBrandsByIds(brandIds),
    fetchImagesByProductIds(productIds),
  ]);

  return productRows.map((product) => mapProductRowToCard(product, brandMap, imageGroups));
}

async function loadCategoryLabelMap(categoryIds: string[]): Promise<Map<string, string>> {
  if (!categoryIds.length) return new Map<string, string>();

  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .in('id', categoryIds);

  if (error) throw error;

  const map = new Map<string, string>();
  ((data as Array<{ id: string; name: string }>) || []).forEach((item) => {
    map.set(item.id, item.name);
  });

  return map;
}

export async function enrichCategoryFacetLabels(facets: SearchFacets): Promise<SearchFacets> {
  const categoryIds = uniqueStrings(facets.categories.map((item) => item.value));
  const categoryLabelMap = await loadCategoryLabelMap(categoryIds);

  return {
    ...facets,
    categories: facets.categories.map((item) => ({
      ...item,
      label: categoryLabelMap.get(item.value) || item.label,
    })),
  };
}

let _allCategoriesCache: CategoryRow[] | null = null;

async function getAllCategories(): Promise<CategoryRow[]> {
  if (_allCategoriesCache) return _allCategoriesCache;

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, image, source_type, root_group_slug, root_group_name, level')
    .order('name', { ascending: true });

  if (error) throw error;
  _allCategoriesCache = (data as CategoryRow[]) || [];
  return _allCategoriesCache;
}

function buildCategoryChildrenMap(categories: CategoryRow[]): Map<string, CategoryRow[]> {
  const map = new Map<string, CategoryRow[]>();

  for (const category of categories) {
    const parentId = category.parent_id || '__root__';
    const current = map.get(parentId) || [];
    current.push(category);
    map.set(parentId, current);
  }

  for (const [key, values] of map.entries()) {
    map.set(
      key,
      [...values].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    );
  }

  return map;
}

function buildCategoryByIdMap(categories: CategoryRow[]): Map<string, CategoryRow> {
  return new Map(categories.map((item) => [item.id, item]));
}

function buildCategoryChildrenByParentIdMap(
  categories: CategoryRow[]
): Map<string | null, CategoryRow[]> {
  const map = new Map<string | null, CategoryRow[]>();

  for (const category of categories) {
    const parentId = category.parent_id ?? null;
    const current = map.get(parentId) || [];
    current.push(category);
    map.set(parentId, current);
  }

  for (const [key, values] of map.entries()) {
    map.set(
      key,
      [...values].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    );
  }

  return map;
}

function findDirectChildBySlug(
  childrenByParentId: Map<string | null, CategoryRow[]>,
  parentId: string | null,
  slug: string
): CategoryRow | null {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) return null;

  const candidates = childrenByParentId.get(parentId) || [];
  return candidates.find((item) => item.slug === normalizedSlug) || null;
}

function collectDescendantCategoryIds(
  rootCategoryId: string,
  childrenMap: Map<string, CategoryRow[]>
): string[] {
  const result: string[] = [];
  const stack = [rootCategoryId];

  while (stack.length) {
    const currentId = stack.pop()!;
    result.push(currentId);

    const children = childrenMap.get(currentId) || [];
    for (const child of children) {
      stack.push(child.id);
    }
  }

  return result;
}

async function fetchProductsByCategoryIds(categoryIds: string[]): Promise<ProductRow[]> {
  const uniqueCategoryIds = uniqueStrings(categoryIds);
  if (!uniqueCategoryIds.length) return [];

  const result: ProductRow[] = [];

  for (let from = 0; from < uniqueCategoryIds.length; from += 100) {
    const batch = uniqueCategoryIds.slice(from, from + 100);

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        sku,
        price,
        description,
        short_description,
        full_description,
        is_available,
        availability_text,
        source_url,
        specifications,
        brand_id,
        category_id,
        stock_qty,
        currency,
        measure,
        source_site_id
      `)
      .in('category_id', batch)
      .limit(CATALOG_PRODUCTS_SCAN_LIMIT);

    if (error) throw error;

    result.push(...((data as ProductRow[]) || []));
  }

  return result;
}

function cleanCatalogFilters(filters?: CatalogFilters): Required<CatalogPageData['appliedFilters']> {
  const rawSpecFilters = filters?.specFilters || {};
  const specFilters = Object.entries(rawSpecFilters).reduce<Record<string, string[]>>(
    (acc, [rawKey, rawValues]) => {
      const key = normalizeSpecKey(rawKey);
      const values = uniqueStrings((rawValues || []).map((value) => normalizeSpecValue(value)));

      if (key && values.length) {
        acc[key] = values;
      }

      return acc;
    },
    {}
  );

  const priceFrom =
    typeof filters?.priceFrom === 'number' && Number.isFinite(filters.priceFrom)
      ? filters.priceFrom
      : null;

  const priceTo =
    typeof filters?.priceTo === 'number' && Number.isFinite(filters.priceTo)
      ? filters.priceTo
      : null;

  return {
    onlyAvailable: Boolean(filters?.onlyAvailable),
    priceFrom,
    priceTo,
    specFilters,
  };
}

function getPriceRange(items: ProductCard[]): CatalogPriceRange | null {
  const prices = items
    .map((item) => Number(item.itemPrice))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!prices.length) return null;

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

function productMatchesCatalogFilters(
  product: ProductCard,
  filters: Required<CatalogPageData['appliedFilters']>,
  options?: {
    excludeFacetKey?: string;
  }
): boolean {
  if (filters.onlyAvailable && !product.isAvailable) {
    return false;
  }

  const price = Number(product.itemPrice) || 0;

  if (filters.priceFrom !== null && price < filters.priceFrom) {
    return false;
  }

  if (filters.priceTo !== null && price > filters.priceTo) {
    return false;
  }

  for (const [facetKey, selectedValues] of Object.entries(filters.specFilters)) {
    if (options?.excludeFacetKey && facetKey === options.excludeFacetKey) {
      continue;
    }

    if (!selectedValues.length) continue;

    const productValue = normalizeSpecValue(product.specifications[facetKey] || '');
    if (!productValue) return false;
    if (!selectedValues.includes(productValue)) return false;
  }

  return true;
}

function getProductSpecEntries(product: ProductCard): NormalizedSpecEntry[] {
  return Object.entries(product.specifications).reduce<NormalizedSpecEntry[]>((acc, [key, value]) => {
    const normalizedKey = normalizeSpecKey(key);
    const normalizedValue = normalizeSpecValue(value);
    if (!normalizedKey || !normalizedValue) return acc;

    acc.push({
      key: normalizedKey,
      label: key,
      value: normalizedValue,
    });

    return acc;
  }, []);
}

function buildCatalogFacets(
  allItems: ProductCard[],
  filters: Required<CatalogPageData['appliedFilters']>
): CatalogFacet[] {
  const facetMeta = new Map<string, { label: string; values: Map<string, string> }>();

  for (const product of allItems) {
    for (const entry of getProductSpecEntries(product)) {
      const current = facetMeta.get(entry.key) || {
        label: entry.label,
        values: new Map<string, string>(),
      };

      if (!current.values.has(entry.value)) {
        current.values.set(entry.value, entry.value);
      }

      if (!current.label && entry.label) {
        current.label = entry.label;
      }

      facetMeta.set(entry.key, current);
    }
  }

  const facets: CatalogFacet[] = [];

  for (const [facetKey, meta] of facetMeta.entries()) {
    const baseProducts = allItems.filter((item) =>
      productMatchesCatalogFilters(item, filters, { excludeFacetKey: facetKey })
    );

    const counts = new Map<string, number>();

    for (const product of baseProducts) {
      const productValue = normalizeSpecValue(product.specifications[facetKey] || '');
      if (!productValue) continue;
      counts.set(productValue, (counts.get(productValue) || 0) + 1);
    }

    const selectedValues = filters.specFilters[facetKey] || [];
    const allValues = new Set<string>([
      ...Array.from(meta.values.keys()),
      ...Array.from(counts.keys()),
      ...selectedValues,
    ]);

    const options = Array.from(allValues)
      .map((value) => ({
        value,
        label: value,
        count: counts.get(value) || 0,
        selected: selectedValues.includes(value),
      }))
      .filter((option) => option.count > 0 || option.selected)
      .sort((a, b) => {
        if (a.selected !== b.selected) return a.selected ? -1 : 1;
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label, 'ru');
      });

    if (!options.length) continue;

    facets.push({
      key: facetKey,
      label: meta.label || facetKey,
      type: 'enum',
      options: options.slice(0, MAX_VISIBLE_FACET_OPTIONS),
      totalOptions: options.length,
    });
  }

  return facets.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

export function applyProductFilters(
  items: ProductCard[],
  filters?: CatalogFilters
): ProductCard[] {
  const normalizedFilters = cleanCatalogFilters(filters);
  return items.filter((item) => productMatchesCatalogFilters(item, normalizedFilters));
}

export function buildFacetCounts(
  items: ProductCard[],
  filters?: CatalogFilters
): CatalogFacet[] {
  const normalizedFilters = cleanCatalogFilters(filters);
  return buildCatalogFacets(items, normalizedFilters);
}

export async function resolveCategoryScopeById(categoryId: string): Promise<CatalogCategoryScope | null> {
  const allCategories = await getAllCategories();
  const categoryMap = buildCategoryByIdMap(allCategories);
  const childrenMap = buildCategoryChildrenMap(allCategories);
  const rootCategory = categoryMap.get(categoryId) || null;

  if (!rootCategory) return null;

  const childCategories = childrenMap.get(rootCategory.id) || [];
  const scopeCategoryIds = collectDescendantCategoryIds(rootCategory.id, childrenMap);
  const scopeCategories = scopeCategoryIds
    .map((id) => categoryMap.get(id))
    .filter(Boolean) as CategoryRow[];

  return {
    rootCategory,
    scopeCategoryIds,
    scopeCategories,
    childCategories,
    isLeaf: childCategories.length === 0,
  };
}

export async function resolveCategoryByPath(...pathSlugs: Array<string | null | undefined>): Promise<CategoryRow | null> {
  const normalizedPath = pathSlugs
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  if (!normalizedPath.length) return null;

  const allCategories = await getAllCategories();
  const childrenByParentId = buildCategoryChildrenByParentIdMap(allCategories);

  let currentParentId: string | null = null;
  let currentCategory: CategoryRow | null = null;

  for (const slug of normalizedPath) {
    const nextCategory = findDirectChildBySlug(childrenByParentId, currentParentId, slug);

    if (!nextCategory) {
      return null;
    }

    currentCategory = nextCategory;
    currentParentId = nextCategory.id;
  }

  return currentCategory;
}

export async function getCatalogPageData(params: {
  categoryId: string;
  filters?: CatalogFilters;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}): Promise<CatalogPageData | null> {
  const scope = await resolveCategoryScopeById(params.categoryId);
  if (!scope) return null;

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(
    1,
    Math.min(96, Number(params.pageSize) || CATALOG_PRODUCTS_PAGE_SIZE)
  );

  const productRows = await fetchProductsByCategoryIds(scope.scopeCategoryIds);
  const appliedFilters = cleanCatalogFilters(params.filters);

  const brandIds = uniqueStrings(productRows.map((p) => p.brand_id));
  const brandMap = await fetchBrandsByIds(brandIds);

  const lightweightItems = productRows.map((product) => {
    const availability = resolveAvailability(product);

    return {
      _id: product.id,
      itemName: product.name || '',
      productSlug: product.slug || '',
      itemImage: '',
      productSku: product.sku || '',
      brand: product.brand_id ? brandMap.get(product.brand_id) || '' : '',
      brandId: product.brand_id || '',
      categoryId: product.category_id || '',
      itemPrice: product.price || 0,
      isAvailable: availability.isAvailable,
      availabilityText: availability.availabilityText,
      specifications: normalizeSpecifications(product.specifications),
    };
  });

  const filteredItems = applyProductFilters(lightweightItems, appliedFilters);
  const sortedItems = sortProductCards(filteredItems, params.sort || 'default');

  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const pageItemsMeta = sortedItems.slice(from, to);
  const pageProductIds = uniqueStrings(pageItemsMeta.map((item) => item._id));
  const pageRows = productRows.filter((row) => pageProductIds.includes(row.id));

  const hydratedPageItems = await hydrateProductCards(pageRows);
  const hydratedById = new Map(hydratedPageItems.map((item) => [item._id, item]));

  const pageItems = pageItemsMeta.map((item) => hydratedById.get(item._id) || item);

  const facets = buildFacetCounts(lightweightItems, appliedFilters);
  const priceRange = getPriceRange(lightweightItems);
  const availableCount = lightweightItems.filter((item) => item.isAvailable).length;

  return {
    scope,
    items: pageItems,
    facets,
    total: sortedItems.length,
    unfilteredTotal: lightweightItems.length,
    priceRange,
    availableCount,
    page,
    pageSize,
    hasMore: to < sortedItems.length,
    appliedFilters,
  };
}

export async function getCatalogGroups(): Promise<CategoryRow[]> {
  const t0 = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, image, parent_id, source_type, root_group_slug, root_group_name, level')
      .is('parent_id', null)
      .order('name', { ascending: true })
      .abortSignal(controller.signal);

    if (error) throw error;

    console.log(`[catalog] getCatalogGroups: ${Math.round(performance.now() - t0)}ms, rows=${((data as CategoryRow[]) || []).length}`);
    return (data as CategoryRow[]) || [];
  } finally {
    clearTimeout(timer);
  }
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) return null;

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, image, source_type, root_group_slug, root_group_name, level')
    .eq('slug', normalizedSlug)
    .limit(1);

  if (error) throw error;

  const rows = (data as CategoryRow[]) || [];
  return rows[0] || null;
}

export async function getChildCategories(parentId: string): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, image, source_type, root_group_slug, root_group_name, level')
    .eq('parent_id', parentId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as CategoryRow[]) || [];
}

export async function getProductCardsByCategoryId(categoryId: string): Promise<ProductCard[]> {
  const { data: productData, error: productError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      sku,
      price,
      is_available,
      availability_text,
      specifications,
      brand_id,
      category_id,
      stock_qty
    `)
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (productError) throw productError;

  return hydrateProductCards((productData as ProductRow[]) || []);
}

export async function getProductViewById(value: string): Promise<ProductView | null> {
  const productSelect = `
      id,
      name,
      slug,
      sku,
      price,
      description,
      short_description,
      full_description,
      is_available,
      availability_text,
      source_url,
      specifications,
      brand_id,
      category_id,
      stock_qty
    `;

  let productRow: ProductRow | null = null;

  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return null;

  const { data: slugData, error: slugError } = await supabase
    .from('products')
    .select(productSelect)
    .eq('slug', normalizedValue)
    .maybeSingle();

  if (slugError) throw slugError;

  if (slugData) {
    productRow = slugData as ProductRow;
  } else {
    const { data: idData, error: idError } = await supabase
      .from('products')
      .select(productSelect)
      .eq('id', normalizedValue)
      .maybeSingle();

    if (idError) throw idError;
    if (!idData) return null;

    productRow = idData as ProductRow;
  }

  const [brandRes, imagesRes, documentsRes] = await Promise.all([
    productRow.brand_id
      ? supabase.from('brands').select('id, name').eq('id', productRow.brand_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('product_images')
      .select('product_id, url, is_main, sort_order')
      .eq('product_id', productRow.id),
    supabase
      .from('product_documents')
      .select('product_id, url, name, sort_order')
      .eq('product_id', productRow.id),
  ]);

  if (brandRes.error) throw brandRes.error;
  if (imagesRes.error) throw imagesRes.error;
  if (documentsRes.error) throw documentsRes.error;

  const brandName = (brandRes.data as BrandRow | null)?.name || '';
  const images = sortImages((imagesRes.data as ProductImageRow[]) || []);
  const documents = (documentsRes.data as ProductDocumentRow[]) || [];
  const normalizedSpecifications = normalizeSpecifications(productRow.specifications);

  const sortedDocuments = [...documents].sort((a, b) => {
    const aOrder = a.sort_order ?? 9999;
    const bOrder = b.sort_order ?? 9999;
    return aOrder - bOrder;
  });

  const availability = resolveAvailability(productRow);

  return {
    id: productRow.id,
    name: productRow.name || '',
    slug: productRow.slug || '',
    sku: productRow.sku || '',
    brand: brandName,
    brandId: productRow.brand_id || '',
    categoryId: productRow.category_id || '',
    price: productRow.price || 0,
    description:
      productRow.full_description ||
      productRow.short_description ||
      productRow.description ||
      '',
    isAvailable: availability.isAvailable,
    availabilityText: availability.availabilityText,
    specificationsText: specsToText(normalizedSpecifications),
    specifications: normalizedSpecifications,
    image: pickMainImage(images),
    gallery: images.map((img) => img.url).filter(Boolean),
    pdfUrl: sortedDocuments[0]?.url || '',
  };
}

export async function getRelatedProducts(
  categoryId: string,
  brandId: string,
  excludeId: string,
  brandName: string
): Promise<RelatedProductCard[]> {
  let rows: Array<{ id: string; name: string; slug: string; brand_id: string | null }> = [];

  if (categoryId) {
    const byCategoryRes = await supabase
      .from('products')
      .select('id, name, slug, brand_id')
      .eq('category_id', categoryId)
      .neq('id', excludeId)
      .limit(4);

    if (byCategoryRes.error) throw byCategoryRes.error;

    rows =
      (byCategoryRes.data as Array<{
        id: string;
        name: string;
        slug: string;
        brand_id: string | null;
      }>) || [];
  }

  if (rows.length < 4 && brandId) {
    const byBrandRes = await supabase
      .from('products')
      .select('id, name, slug, brand_id')
      .eq('brand_id', brandId)
      .neq('id', excludeId)
      .limit(8);

    if (byBrandRes.error) throw byBrandRes.error;

    const extraRows =
      (byBrandRes.data as Array<{
        id: string;
        name: string;
        slug: string;
        brand_id: string | null;
      }>) || [];

    const existingIds = new Set(rows.map((item) => item.id));

    for (const item of extraRows) {
      if (!existingIds.has(item.id)) {
        rows.push(item);
        existingIds.add(item.id);
      }
      if (rows.length >= 4) break;
    }
  }

  if (!rows.length) return [];

  const ids = rows.map((item) => item.id);
  const imageGroups = await fetchImagesByProductIds(ids);

  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug || '',
    image: pickMainImage(imageGroups.get(item.id) || []),
    brand: brandName,
  }));
}

const ER_COLLETS_CATEGORY_ID = '46eb223e-53a4-43a7-844b-4269d33719ba';

export type CompatibleProductGroup = {
  id: string;
  title: string;
  products: RelatedProductCard[];
};

type CompatibilityCategory =
  | { name?: string | null }
  | Array<{ name?: string | null }>
  | null;

type SourceCompatibilityProduct = {
  id: string;
  name: string | null;
  sku: string | null;
  specifications: unknown;
  search_category_text: string | null;
  search_specs_text: string | null;
  category: CompatibilityCategory;
};

type CompatibilityCandidateProduct = {
  id: string;
  name: string | null;
  slug: string | null;
  sku: string | null;
  brand_id: string | null;
  specifications?: unknown;
  search_category_text?: string | null;
  search_specs_text?: string | null;
  category?: CompatibilityCategory;
};

type ClampRange = {
  min: number;
  max: number;
};

type ErColletRow = {
  id: string;
  name: string | null;
  slug: string | null;
  sku: string | null;
  brand_id: string | null;
  specifications: unknown;
  score: number;
  erType: string;
  clampRange: ClampRange;
};

function normalizeCompatibilityNumber(value: string | null | undefined): number | null {
  const normalized = String(value || '')
    .trim()
    .replace(/,/g, '.')
    .replace(/\s+/g, '');

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function getCompatibilitySpecValue(specifications: unknown, names: string[]): string | null {
  if (!specifications || typeof specifications !== 'object') return null;

  const targetNames = new Set(names.map((name) => normalizeSpecKey(name)));

  if (Array.isArray(specifications)) {
    for (const item of specifications as Array<Record<string, unknown>>) {
      if (!item || typeof item !== 'object') continue;

      const rawName =
        item.name ??
        item.key ??
        item.title ??
        item.label ??
        item.parameter ??
        item.characteristic;

      const itemName = normalizeSpecKey(String(rawName || ''));

      if (targetNames.has(itemName)) {
        const value = String(item.value ?? item.val ?? item.text ?? item.content ?? '').trim();
        return value || null;
      }
    }

    return null;
  }

  const specRecord = specifications as Record<string, unknown>;

  for (const [rawKey, rawValue] of Object.entries(specRecord)) {
    const key = normalizeSpecKey(rawKey);

    if (targetNames.has(key)) {
      const value = String(rawValue ?? '').trim();
      return value && value !== '[object Object]' ? value : null;
    }
  }

  return null;
}

function parseCompatibilityClampRange(value: string | null | undefined): ClampRange | null {
  const text = String(value || '')
    .trim()
    .replace(/,/g, '.')
    .replace(/[–—−]/g, '-');

  const match = text.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const min = Number(match[1]);
  const max = Number(match[2]);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min > max) return null;

  return { min, max };
}

function getJoinedCategoryName(category: CompatibilityCategory): string {
  if (Array.isArray(category)) {
    return category[0]?.name || '';
  }

  return category?.name || '';
}

function getCompatibilitySearchText(product: {
  name?: string | null;
  sku?: string | null;
  search_category_text?: string | null;
  search_specs_text?: string | null;
  category?: CompatibilityCategory;
}): string {
  return [
    product.name,
    product.sku,
    getJoinedCategoryName(product.category || null),
    product.search_category_text,
    product.search_specs_text,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function extractErTypeFromText(value: string | null | undefined): string {
  const match = String(value || '').toUpperCase().match(/\bER\s?(11|16|20|25|32|40)\b/);
  return match ? `ER${match[1]}` : '';
}

function getProductErType(product: {
  name?: string | null;
  sku?: string | null;
  search_specs_text?: string | null;
  search_category_text?: string | null;
}): string {
  return extractErTypeFromText(
    [
      product.name,
      product.sku,
      product.search_specs_text,
      product.search_category_text,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function isEndMillLikeProduct(product: {
  name?: string | null;
  sku?: string | null;
  search_category_text?: string | null;
  search_specs_text?: string | null;
  category?: CompatibilityCategory;
}): boolean {
  return getCompatibilitySearchText(product).includes('фрез');
}

function isErColletProduct(product: {
  name?: string | null;
  sku?: string | null;
  search_category_text?: string | null;
  search_specs_text?: string | null;
  category?: CompatibilityCategory;
}): boolean {
  const text = getCompatibilitySearchText(product);
  const erType = getProductErType(product);

  const hasColletWord = text.includes('цанг');
  const hasErType = Boolean(erType);
  const isChuck =
    text.includes('патрон') ||
    text.includes('оправк') ||
    text.includes('блок приводной');

  return hasColletWord && hasErType && !isChuck;
}

function isErColletChuckProduct(product: {
  name?: string | null;
  sku?: string | null;
  search_category_text?: string | null;
  search_specs_text?: string | null;
  category?: CompatibilityCategory;
}): boolean {
  const text = getCompatibilitySearchText(product);
  const erType = getProductErType(product);

  if (!erType) return false;

  return (
    text.includes('патрон цангов') ||
    text.includes('цанговый патрон') ||
    (text.includes('патрон') && text.includes('цанг')) ||
    (text.includes('оправк') && text.includes('цанг')) ||
    (text.includes('блок приводной') && text.includes('цанг'))
  );
}

function getClampRangeScore(shankDiameter: number, clampRange: ClampRange): number {
  if (clampRange.max === shankDiameter) return 1000;
  if (shankDiameter > clampRange.min && shankDiameter < clampRange.max) return 500;
  if (clampRange.min === shankDiameter) return 100;

  return 0;
}

function getEndMillForClampRangeScore(shankDiameter: number, clampRange: ClampRange): number {
  if (shankDiameter === clampRange.max) return 2000;
  if (shankDiameter > clampRange.min && shankDiameter < clampRange.max) {
    return 1000 - Math.abs(clampRange.max - shankDiameter);
  }
  if (shankDiameter === clampRange.min) return 500;

  return 0;
}

async function getSourceCompatibilityProduct(productId: string): Promise<SourceCompatibilityProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      specifications,
      search_category_text,
      search_specs_text,
      category:category_id (
        name
      )
    `)
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return data as unknown as SourceCompatibilityProduct;
}

async function hydrateRelatedProductCards(
  rows: Array<{
    id: string;
    name: string | null;
    slug: string | null;
    brand_id: string | null;
  }>
): Promise<RelatedProductCard[]> {
  if (!rows.length) return [];

  const productIds = rows.map((item) => item.id);
  const brandIds = uniqueStrings(rows.map((item) => item.brand_id));

  const [brandMap, imageGroups] = await Promise.all([
    fetchBrandsByIds(brandIds),
    fetchImagesByProductIds(productIds),
  ]);

  return rows.map((item) => ({
    id: item.id,
    name: item.name || '',
    slug: item.slug || '',
    image: pickMainImage(imageGroups.get(item.id) || []),
    brand: item.brand_id ? brandMap.get(item.brand_id) || '' : '',
  }));
}

function getShankDiameterFromProduct(product: {
  specifications?: unknown;
}): number | null {
  return normalizeCompatibilityNumber(
    getCompatibilitySpecValue(product.specifications, [
      'Диаметр хвостовика d2, мм',
      'Диаметр хвостовика d2(h6), мм',
      'Диаметр хвостовика, мм',
    ])
  );
}

function getClampRangeFromColletProduct(product: {
  specifications?: unknown;
}): ClampRange | null {
  return parseCompatibilityClampRange(
    getCompatibilitySpecValue(product.specifications, ['Диапазон зажима, мм'])
  );
}

async function getEndMillShankDiameter(productId: string): Promise<number | null> {
  const sourceProduct = await getSourceCompatibilityProduct(productId);
  if (!sourceProduct) return null;

  if (!isEndMillLikeProduct(sourceProduct)) return null;

  return getShankDiameterFromProduct(sourceProduct);
}

async function getAllErColletRows(): Promise<ErColletRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, sku, brand_id, specifications')
    .eq('category_id', ER_COLLETS_CATEGORY_ID)
    .limit(500);

  if (error) throw error;

  return ((data || []) as Array<{
    id: string;
    name: string | null;
    slug: string | null;
    sku: string | null;
    brand_id: string | null;
    specifications: unknown;
  }>)
    .map((candidate) => {
      const clampRange = getClampRangeFromColletProduct(candidate);
      if (!clampRange) return null;

      const erType = extractErTypeFromText(`${candidate.name || ''} ${candidate.sku || ''}`);
      if (!erType) return null;

      return {
        ...candidate,
        erType,
        clampRange,
        score: 0,
      };
    })
    .filter((item): item is ErColletRow => Boolean(item));
}

async function getCompatibleErColletRowsForProduct(productId: string): Promise<ErColletRow[]> {
  const shankDiameter = await getEndMillShankDiameter(productId);
  if (shankDiameter === null) return [];

  const collets = await getAllErColletRows();

  return collets
    .filter((item) => {
      if (item.id === productId) return false;

      return (
        shankDiameter >= item.clampRange.min &&
        shankDiameter <= item.clampRange.max
      );
    })
    .map((item) => ({
      ...item,
      score: getClampRangeScore(shankDiameter, item.clampRange),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      if (a.clampRange.max !== b.clampRange.max) {
        return a.clampRange.max - b.clampRange.max;
      }

      if (a.clampRange.min !== b.clampRange.min) {
        return a.clampRange.min - b.clampRange.min;
      }

      return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
    });
}

async function getCompatibleErColletRowsForErType(
  erType: string,
  excludeProductId: string
): Promise<ErColletRow[]> {
  if (!erType) return [];

  const collets = await getAllErColletRows();

  return collets
    .filter((item) => item.id !== excludeProductId && item.erType === erType)
    .map((item) => ({
      ...item,
      score: item.clampRange.max * 10 + item.clampRange.min,
    }))
    .sort((a, b) => {
      if (a.clampRange.max !== b.clampRange.max) {
        return a.clampRange.max - b.clampRange.max;
      }

      if (a.clampRange.min !== b.clampRange.min) {
        return a.clampRange.min - b.clampRange.min;
      }

      return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
    });
}

export async function getCompatibleErColletsForProduct(
  productId: string
): Promise<RelatedProductCard[]> {
  try {
    const rows = await getCompatibleErColletRowsForProduct(productId);
    return hydrateRelatedProductCards(rows.slice(0, 8));
  } catch (error) {
    console.error('getCompatibleErColletsForProduct error:', error);
    return [];
  }
}

export async function getCompatibleErColletsForChuckProduct(
  productId: string
): Promise<RelatedProductCard[]> {
  try {
    const sourceProduct = await getSourceCompatibilityProduct(productId);
    if (!sourceProduct) return [];

    if (!isErColletChuckProduct(sourceProduct)) return [];

    const erType = getProductErType(sourceProduct);
    if (!erType) return [];

    const rows = await getCompatibleErColletRowsForErType(erType, productId);
    return hydrateRelatedProductCards(rows.slice(0, 8));
  } catch (error) {
    console.error('getCompatibleErColletsForChuckProduct error:', error);
    return [];
  }
}

async function findCompatibleErChucksByErTypes(
  erTypes: string[],
  excludeProductId: string
): Promise<RelatedProductCard[]> {
  const uniqueErTypes = uniqueStrings(erTypes);
  if (!uniqueErTypes.length) return [];

  const orFilter = uniqueErTypes
    .flatMap((erType) => [
      `name.ilike.%${erType}%`,
      `sku.ilike.%${erType}%`,
      `search_specs_text.ilike.%${erType}%`,
      `search_category_text.ilike.%${erType}%`,
    ])
    .join(',');

  const { data: candidates, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      sku,
      brand_id,
      search_category_text,
      search_specs_text,
      category:category_id (
        name
      )
    `)
    .or(orFilter)
    .neq('id', excludeProductId)
    .limit(700);

  if (error) throw error;

  const rows = ((candidates || []) as CompatibilityCandidateProduct[])
    .map((candidate) => {
      const text = getCompatibilitySearchText(candidate);
      const erType = getProductErType(candidate);

      if (!erType || !uniqueErTypes.includes(erType)) return null;
      if (!isErColletChuckProduct(candidate)) return null;

      return {
        id: candidate.id,
        name: candidate.name,
        slug: candidate.slug,
        brand_id: candidate.brand_id,
        score:
          (text.includes('патрон цангов') || text.includes('цанговый патрон') ? 1000 : 0) +
          (text.includes(erType.toLowerCase()) ? 100 : 0),
      };
    })
    .filter((item): item is {
      id: string;
      name: string | null;
      slug: string | null;
      brand_id: string | null;
      score: number;
    } => Boolean(item))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
    })
    .slice(0, 8);

  return hydrateRelatedProductCards(rows);
}

export async function getCompatibleErColletChucksForProduct(
  productId: string
): Promise<RelatedProductCard[]> {
  try {
    const colletRows = await getCompatibleErColletRowsForProduct(productId);
    const erTypes = uniqueStrings(colletRows.map((item) => item.erType));

    return findCompatibleErChucksByErTypes(erTypes, productId);
  } catch (error) {
    console.error('getCompatibleErColletChucksForProduct error:', error);
    return [];
  }
}

export async function getCompatibleErColletChucksForColletProduct(
  productId: string
): Promise<RelatedProductCard[]> {
  try {
    const sourceProduct = await getSourceCompatibilityProduct(productId);
    if (!sourceProduct) return [];

    if (!isErColletProduct(sourceProduct)) return [];

    const erType = getProductErType(sourceProduct);
    if (!erType) return [];

    return findCompatibleErChucksByErTypes([erType], productId);
  } catch (error) {
    console.error('getCompatibleErColletChucksForColletProduct error:', error);
    return [];
  }
}

async function findEndMillsByClampRanges(
  clampRanges: ClampRange[],
  excludeProductId: string
): Promise<RelatedProductCard[]> {
  if (!clampRanges.length) return [];

  const { data: candidates, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      sku,
      brand_id,
      specifications,
      search_category_text,
      search_specs_text,
      category:category_id (
        name
      )
    `)
    .or('name.ilike.%фрез%,search_category_text.ilike.%фрез%,search_specs_text.ilike.%фрез%')
    .neq('id', excludeProductId)
    .limit(2500);

  if (error) throw error;

  const rows = ((candidates || []) as CompatibilityCandidateProduct[])
    .map((candidate) => {
      if (!isEndMillLikeProduct(candidate)) return null;

      const shankDiameter = getShankDiameterFromProduct(candidate);
      if (shankDiameter === null) return null;

      const compatibleRanges = clampRanges.filter(
        (range) => shankDiameter >= range.min && shankDiameter <= range.max
      );

      if (!compatibleRanges.length) return null;

      const score = Math.max(
        ...compatibleRanges.map((range) => getEndMillForClampRangeScore(shankDiameter, range))
      );

      return {
        id: candidate.id,
        name: candidate.name,
        slug: candidate.slug,
        brand_id: candidate.brand_id,
        score,
      };
    })
    .filter((item): item is {
      id: string;
      name: string | null;
      slug: string | null;
      brand_id: string | null;
      score: number;
    } => Boolean(item))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
    })
    .slice(0, 8);

  return hydrateRelatedProductCards(rows);
}

export async function getCompatibleEndMillsForColletProduct(
  productId: string
): Promise<RelatedProductCard[]> {
  try {
    const sourceProduct = await getSourceCompatibilityProduct(productId);
    if (!sourceProduct) return [];

    if (!isErColletProduct(sourceProduct)) return [];

    const sourceClampRange = getClampRangeFromColletProduct(sourceProduct);
    if (!sourceClampRange) return [];

    return findEndMillsByClampRanges([sourceClampRange], productId);
  } catch (error) {
    console.error('getCompatibleEndMillsForColletProduct error:', error);
    return [];
  }
}

export async function getCompatibleEndMillsForChuckProduct(
  productId: string
): Promise<RelatedProductCard[]> {
  try {
    const sourceProduct = await getSourceCompatibilityProduct(productId);
    if (!sourceProduct) return [];

    if (!isErColletChuckProduct(sourceProduct)) return [];

    const erType = getProductErType(sourceProduct);
    if (!erType) return [];

    const colletRows = await getCompatibleErColletRowsForErType(erType, productId);
    const clampRanges = colletRows.map((item) => item.clampRange);

    if (!clampRanges.length) return [];

    return findEndMillsByClampRanges(clampRanges, productId);
  } catch (error) {
    console.error('getCompatibleEndMillsForChuckProduct error:', error);
    return [];
  }
}

function mergeRelatedProductCards(groups: RelatedProductCard[][]): RelatedProductCard[] {
  const map = new Map<string, RelatedProductCard>();

  for (const group of groups) {
    for (const item of group) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values());
}

type InsertCode = {
  family: string;
  size: string;
  full: string;
};

type HolderInsertPattern = {
  raw: string;
  lettersPattern: string;
  sizePattern: string;
  compact: string;
};

function normalizeIsoPatternText(value: string | null | undefined): string {
  return String(value || '')
    .toUpperCase()
    .replace(/[.\s_-]+/g, '*')
    .replace(/[^A-Z0-9*]/g, '')
    .replace(/\*+/g, '*');
}

function wildcardMatches(pattern: string, actual: string): boolean {
  const p = String(pattern || '').toUpperCase();
  const a = String(actual || '').toUpperCase();

  if (!p || !a) return false;

  for (let i = 0; i < p.length; i += 1) {
    const patternChar = p[i];
    const actualChar = a[i];

    if (!actualChar) return false;
    if (patternChar === '*') continue;
    if (patternChar !== actualChar) return false;
  }

  return true;
}

function parseHolderInsertPattern(value: string | null | undefined): HolderInsertPattern | null {
  const compact = normalizeIsoPatternText(value);
  if (!compact) return null;

  const firstDigitIndex = compact.search(/\d/);
  if (firstDigitIndex <= 0) return null;

  const lettersPattern = compact.slice(0, firstDigitIndex).padEnd(4, '*').slice(0, 4);
  const digitsPart = compact.slice(firstDigitIndex).replace(/[^0-9*]/g, '');
  const sizePattern = digitsPart.slice(0, 4);

  if (!lettersPattern || sizePattern.length < 4) return null;

  return {
    raw: String(value || '').trim(),
    lettersPattern,
    sizePattern,
    compact,
  };
}

function getInsertCodeFromText(value: string | null | undefined): InsertCode | null {
  const text = String(value || '').toUpperCase();

  const normalized = text
    .replace(/[.\s_-]+/g, '')
    .replace(/[^A-Z0-9]/g, '');

  const isoMatch = normalized.match(/([A-Z]{4})(\d{4})([A-Z0-9]{0,8})/);
  if (isoMatch) {
    return {
      family: isoMatch[1],
      size: isoMatch[2],
      full: `${isoMatch[1]}${isoMatch[2]}${isoMatch[3] || ''}`,
    };
  }

  const shortTurningMatch = normalized.match(/([A-Z]{2,4})(\d{4})([A-Z0-9]{0,8})/);
  if (shortTurningMatch) {
    return {
      family: shortTurningMatch[1].padEnd(4, '*').slice(0, 4),
      size: shortTurningMatch[2],
      full: `${shortTurningMatch[1]}${shortTurningMatch[2]}${shortTurningMatch[3] || ''}`,
    };
  }

  return null;
}

function getInsertCodeFromProduct(product: {
  name?: string | null;
  sku?: string | null;
}): InsertCode | null {
  return (
    getInsertCodeFromText(product.sku) ||
    getInsertCodeFromText(product.name)
  );
}

function getHolderInsertPatternsFromProduct(product: {
  specifications?: unknown;
}): HolderInsertPattern[] {
  const rawValue = getCompatibilitySpecValue(product.specifications, [
    'Под пластины типа',
    'Под пластины',
    'Тип пластины',
  ]);

  if (!rawValue) return [];

  const parts = String(rawValue)
    .split(/[;,/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const patterns = parts
    .map((item) => parseHolderInsertPattern(item))
    .filter((item): item is HolderInsertPattern => Boolean(item));

  if (patterns.length) return patterns;

  const singlePattern = parseHolderInsertPattern(rawValue);
  return singlePattern ? [singlePattern] : [];
}

function holderPatternMatchesInsertCode(
  pattern: HolderInsertPattern,
  insertCode: InsertCode
): boolean {
  return (
    wildcardMatches(pattern.lettersPattern, insertCode.family) &&
    wildcardMatches(pattern.sizePattern, insertCode.size)
  );
}

function getHolderPatternSpecificity(pattern: HolderInsertPattern): number {
  const lettersScore = pattern.lettersPattern.replace(/\*/g, '').length * 10;
  const sizeScore = pattern.sizePattern.replace(/\*/g, '').length * 20;
  return lettersScore + sizeScore;
}

function isTurningHolderProduct(product: {
  name?: string | null;
  sku?: string | null;
  search_category_text?: string | null;
  search_specs_text?: string | null;
  category?: CompatibilityCategory;
  specifications?: unknown;
}): boolean {
  const text = getCompatibilitySearchText(product);

  if (!getHolderInsertPatternsFromProduct(product).length) return false;

  return (
    text.includes('державк') ||
    text.includes('резец') ||
    text.includes('расточ') ||
    text.includes('токар')
  );
}

function isInsertPlateProduct(product: {
  name?: string | null;
  sku?: string | null;
  search_category_text?: string | null;
  search_specs_text?: string | null;
  category?: CompatibilityCategory;
}): boolean {
  const text = getCompatibilitySearchText(product);
  const insertCode = getInsertCodeFromProduct(product);

  return Boolean(insertCode) && (
    text.includes('пластин') ||
    text.includes('твердосплав') ||
    text.includes('резьбов') ||
    text.includes('wnmg') ||
    text.includes('tnmg') ||
    text.includes('vcmt') ||
    text.includes('vnmg') ||
    text.includes('snmg') ||
    text.includes('cnmg') ||
    text.includes('ccmt') ||
    text.includes('dcmt') ||
    text.includes('rcmx') ||
    text.includes('lnux')
  );
}

async function fetchCompatibilityCandidates(params: {
  excludeProductId: string;
  kind: 'holders' | 'inserts';
  maxRows?: number;
}): Promise<CompatibilityCandidateProduct[]> {
  const pageSize = 1000;
  const maxRows = params.maxRows || 12000;
  const result: CompatibilityCandidateProduct[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    const to = from + pageSize - 1;

    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        sku,
        brand_id,
        specifications,
        search_category_text,
        search_specs_text,
        category:category_id (
          name
        )
      `)
      .neq('id', params.excludeProductId)
      .range(from, to);

    if (params.kind === 'holders') {
      query = query.or(
        [
          'name.ilike.%держав%',
          'name.ilike.%резец%',
          'name.ilike.%расточ%',
          'name.ilike.%токар%',
          'search_category_text.ilike.%держав%',
          'search_category_text.ilike.%резец%',
          'search_category_text.ilike.%расточ%',
          'search_category_text.ilike.%токар%',
          'search_specs_text.ilike.%Под пластины%',
          'search_specs_text.ilike.%под пластины%',
        ].join(',')
      );
    }

    if (params.kind === 'inserts') {
      query = query.or(
        [
          'name.ilike.%пластин%',
          'name.ilike.%твердосплав%',
          'search_category_text.ilike.%пластин%',
          'search_category_text.ilike.%твердосплав%',
          'search_specs_text.ilike.%пластин%',
          'search_specs_text.ilike.%твердосплав%',
        ].join(',')
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = ((data || []) as CompatibilityCandidateProduct[]);
    result.push(...rows);

    if (rows.length < pageSize) break;
  }

  return result;
}

async function findCompatibleHoldersForInsertProduct(
  productId: string
): Promise<RelatedProductCard[]> {
  try {
    const sourceProduct = await getSourceCompatibilityProduct(productId);
    if (!sourceProduct) return [];

    const sourceInsertCode = getInsertCodeFromProduct(sourceProduct);
    if (!sourceInsertCode) return [];

    if (!isInsertPlateProduct(sourceProduct)) return [];

    const candidates = await fetchCompatibilityCandidates({
      excludeProductId: productId,
      kind: 'holders',
      maxRows: 15000,
    });

    const rows = candidates
      .map((candidate) => {
        if (!isTurningHolderProduct(candidate)) return null;

        const patterns = getHolderInsertPatternsFromProduct(candidate);
        const matchedPatterns = patterns.filter((pattern) =>
          holderPatternMatchesInsertCode(pattern, sourceInsertCode)
        );

        if (!matchedPatterns.length) return null;

        const bestSpecificity = Math.max(
          ...matchedPatterns.map((pattern) => getHolderPatternSpecificity(pattern))
        );

        const text = getCompatibilitySearchText(candidate);

        return {
          id: candidate.id,
          name: candidate.name,
          slug: candidate.slug,
          brand_id: candidate.brand_id,
          score:
            bestSpecificity * 100 +
            (text.includes('державка токарная') ? 50 : 0) +
            (text.includes('державка расточная') ? 40 : 0) +
            (text.includes('premium') ? 10 : 0),
        };
      })
      .filter((item): item is {
        id: string;
        name: string | null;
        slug: string | null;
        brand_id: string | null;
        score: number;
      } => Boolean(item))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
      })
      .slice(0, 8);

    return hydrateRelatedProductCards(rows);
  } catch (error) {
    console.error('findCompatibleHoldersForInsertProduct error:', error);
    return [];
  }
}

async function findCompatibleInsertsForHolderProduct(
  productId: string
): Promise<RelatedProductCard[]> {
  try {
    const sourceProduct = await getSourceCompatibilityProduct(productId);
    if (!sourceProduct) return [];

    if (!isTurningHolderProduct(sourceProduct)) return [];

    const sourcePatterns = getHolderInsertPatternsFromProduct(sourceProduct);
    if (!sourcePatterns.length) return [];

    const candidates = await fetchCompatibilityCandidates({
      excludeProductId: productId,
      kind: 'inserts',
      maxRows: 15000,
    });

    const rows = candidates
      .map((candidate) => {
        if (!isInsertPlateProduct(candidate)) return null;

        const insertCode = getInsertCodeFromProduct(candidate);
        if (!insertCode) return null;

        const matchedPatterns = sourcePatterns.filter((pattern) =>
          holderPatternMatchesInsertCode(pattern, insertCode)
        );

        if (!matchedPatterns.length) return null;

        const bestSpecificity = Math.max(
          ...matchedPatterns.map((pattern) => getHolderPatternSpecificity(pattern))
        );

        return {
          id: candidate.id,
          name: candidate.name,
          slug: candidate.slug,
          brand_id: candidate.brand_id,
          score: bestSpecificity * 100,
        };
      })
      .filter((item): item is {
        id: string;
        name: string | null;
        slug: string | null;
        brand_id: string | null;
        score: number;
      } => Boolean(item))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
      })
      .slice(0, 8);

    return hydrateRelatedProductCards(rows);
  } catch (error) {
    console.error('findCompatibleInsertsForHolderProduct error:', error);
    return [];
  }
}

export async function getCompatibleProductGroupsForProduct(
  productId: string
): Promise<CompatibleProductGroup[]> {
  const [
    erColletsForEndMill,
    erColletsForChuck,
    erChucksForEndMill,
    erChucksForCollet,
    endMillsForCollet,
    endMillsForChuck,
    holdersForInsert,
    insertsForHolder,
  ] = await Promise.all([
    getCompatibleErColletsForProduct(productId),
    getCompatibleErColletsForChuckProduct(productId),
    getCompatibleErColletChucksForProduct(productId),
    getCompatibleErColletChucksForColletProduct(productId),
    getCompatibleEndMillsForColletProduct(productId),
    getCompatibleEndMillsForChuckProduct(productId),
    findCompatibleHoldersForInsertProduct(productId),
    findCompatibleInsertsForHolderProduct(productId),
  ]);

  const erCollets = mergeRelatedProductCards([erColletsForEndMill, erColletsForChuck]);
  const erChucks = mergeRelatedProductCards([erChucksForEndMill, erChucksForCollet]);
  const endMills = mergeRelatedProductCards([endMillsForCollet, endMillsForChuck]);

  const groups: CompatibleProductGroup[] = [];

  if (erCollets.length) {
    groups.push({
      id: 'er-collets',
      title: 'Подходящие ER цанги',
      products: erCollets,
    });
  }

  if (erChucks.length) {
    groups.push({
      id: 'er-chucks',
      title: 'Подходящие цанговые патроны',
      products: erChucks,
    });
  }

  if (endMills.length) {
    groups.push({
      id: 'end-mills',
      title: 'Подходящие фрезы',
      products: endMills,
    });
  }

  if (holdersForInsert.length) {
    groups.push({
      id: 'turning-holders',
      title: 'Подходящие державки',
      products: holdersForInsert,
    });
  }

  if (insertsForHolder.length) {
    groups.push({
      id: 'turning-inserts',
      title: 'Подходящие пластины',
      products: insertsForHolder,
    });
  }

  return groups;
}

export async function getProductsByIds(ids: string[]): Promise<ProductView[]> {
  if (!ids || ids.length === 0) return [];

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      sku,
      price,
      description,
      short_description,
      full_description,
      is_available,
      availability_text,
      specifications,
      brand_id,
      category_id
    `)
    .in('id', ids);

  if (error) throw error;

  const productRows = (data as ProductRow[]) || [];
  if (!productRows.length) return [];

  const brandIds = uniqueStrings(productRows.map((p) => p.brand_id));
  const productIds = uniqueStrings(productRows.map((p) => p.id));

  const [brandMap, imageGroups] = await Promise.all([
    fetchBrandsByIds(brandIds),
    fetchImagesByProductIds(productIds),
  ]);

  return productRows.map((p) => {
    const imgs = sortImages(imageGroups.get(p.id) || []);
    const normalizedSpecifications = normalizeSpecifications(p.specifications);
    const availability = resolveAvailability(p);

    return {
      id: p.id,
      name: p.name || '',
      slug: p.slug || '',
      sku: p.sku || '',
      brand: p.brand_id ? brandMap.get(p.brand_id) || '' : '',
      brandId: p.brand_id || '',
      categoryId: p.category_id || '',
      price: p.price || 0,
      description: p.full_description || p.short_description || p.description || '',
      isAvailable: availability.isAvailable,
      availabilityText: availability.availabilityText,
      specificationsText: specsToText(normalizedSpecifications),
      specifications: normalizedSpecifications,
      image: pickMainImage(imgs),
      gallery: imgs.map((i) => i.url).filter(Boolean),
      pdfUrl: '',
    };
  });
}

export async function searchProducts(
  params: SearchProductsParams
): Promise<SearchProductsResult> {
  const originalQuery = String(params.query || '').trim();
  const limit = clampSearchLimit(params.limit);
  const brandIds = uniqueStrings(params.brandIds || []);
  const categoryIds = uniqueStrings(params.categoryIds || []);
  const onlyAvailable = Boolean(params.onlyAvailable);
  const sort = params.sort || 'relevance';

  if (!originalQuery) {
    return {
      items: [],
      facets: {
        brands: [],
        categories: [],
        availability: [],
      },
      meta: {
        originalQuery,
        normalizedQuery: '',
        normalizedSkuLikeQuery: '',
        queryVariants: [],
        tokens: [],
        limit,
        total: 0,
        appliedFilters: {
          brandIds,
          categoryIds,
          onlyAvailable,
        },
      },
    };
  }

  if (!import.meta.env.SSR) {
    const url = new URL('/api/search.json', window.location.origin);
    url.searchParams.set('query', originalQuery);
    url.searchParams.set('limit', String(limit));

    for (const id of brandIds) {
      url.searchParams.append('brandId', id);
    }

    for (const id of categoryIds) {
      url.searchParams.append('categoryId', id);
    }

    if (onlyAvailable) {
      url.searchParams.set('onlyAvailable', '1');
    }

    url.searchParams.set('sort', sort);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    return (await response.json()) as SearchProductsResult;
  }

  throw new Error('searchProducts is a browser helper. Use /api/search.json on the server.');
}

export async function searchProductCards(
  query: string,
  limit = DEFAULT_SEARCH_LIMIT
): Promise<ProductCard[]> {
  const result = await searchProducts({
    query,
    limit,
    sort: 'relevance',
  });

  return result.items;
}

export async function getCategoryById(id: string): Promise<CategoryRow | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, image, source_type, root_group_slug, root_group_name, level')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as CategoryRow | null) || null;
}

import { elasticsearch, ELASTICSEARCH_PRODUCTS_INDEX } from '@/lib/elasticsearch';
import { supabase } from '@/lib/supabase';

type ProductRow = {
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

type BrandRow = {
  id: string;
  name: string;
};

type CategoryRow = {
  id: string;
  name: string;
};

type ElasticsearchProductDocument = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  sku_normalized: string;
  price: number | null;
  description: string | null;
  short_description: string | null;
  full_description: string | null;
  is_available: boolean | null;
  availability_text: string | null;
  source_url: string | null;
  specifications: unknown;
  specifications_text: string;
  brand_id: string | null;
  brand_name: string;
  category_id: string | null;
  category_name: string;
  stock_qty: number | null;
  currency: string | null;
  measure: string | null;
  source_site_id: string | null;
  search_text: string;
};

const PAGE_SIZE = 1000;

function normalizeSpecifications(specs: unknown): Record<string, string> {
  if (!specs || typeof specs !== 'object') return {};

  if (!Array.isArray(specs)) {
    return Object.entries(specs as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = String(key || '').trim();
      const normalizedValue = String(value ?? '').trim();

      if (!normalizedKey || !normalizedValue || normalizedValue === '[object Object]') {
        return acc;
      }

      acc[normalizedKey] = normalizedValue;
      return acc;
    }, {});
  }

  return (specs as Array<Record<string, unknown>>).reduce<Record<string, string>>((acc, item) => {
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
  }, {});
}

function specsToText(specs: unknown): string {
  return Object.entries(normalizeSpecifications(specs))
    .filter(([key, value]) => key.trim() && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function normalizeSkuLikeText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '')
    .trim();
}

function normalizeSearchText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[–—−]/g, '-')
    .replace(/[×✕✖]/g, ' x ')
    .replace(/\bмм\b/g, ' mm ')
    .replace(/\bсм\b/g, ' cm ')
    .replace(/\bшт\b/g, ' pcs ')
    .replace(/[.,;:!?()[\]{}"'`«»№#+=*<>\\/|_]+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function recreateProductsIndex(): Promise<void> {
  const exists = await elasticsearch.indices.exists({
    index: ELASTICSEARCH_PRODUCTS_INDEX,
  });

  if (exists) {
    await elasticsearch.indices.delete({
      index: ELASTICSEARCH_PRODUCTS_INDEX,
    });
  }

  await elasticsearch.indices.create({
    index: ELASTICSEARCH_PRODUCTS_INDEX,
    mappings: {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 1024 },
          },
        },
        slug: { type: 'keyword' },
        sku: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 1024 },
          },
        },
        sku_normalized: { type: 'keyword' },
        price: { type: 'double' },
        description: { type: 'text' },
        short_description: { type: 'text' },
        full_description: { type: 'text' },
        is_available: { type: 'boolean' },
        availability_text: { type: 'text' },
        source_url: { type: 'keyword', index: false },
        specifications: { type: 'object', enabled: false },
        specifications_text: { type: 'text' },
        brand_id: { type: 'keyword' },
        brand_name: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 1024 },
          },
        },
        category_id: { type: 'keyword' },
        category_name: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 1024 },
          },
        },
        stock_qty: { type: 'integer' },
        currency: { type: 'keyword' },
        measure: { type: 'keyword' },
        source_site_id: { type: 'keyword' },
        search_text: { type: 'text' },
      },
    },
  });
}

async function fetchAllBrands(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name');

  if (error) {
    throw error;
  }

  const map = new Map<string, string>();
  ((data as BrandRow[]) || []).forEach((item) => {
    map.set(item.id, item.name || '');
  });

  return map;
}

async function fetchAllCategories(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name');

  if (error) {
    throw error;
  }

  const map = new Map<string, string>();
  ((data as CategoryRow[]) || []).forEach((item) => {
    map.set(item.id, item.name || '');
  });

  return map;
}

async function fetchProductsPage(from: number, to: number): Promise<ProductRow[]> {
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
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    throw error;
  }

  return (data as ProductRow[]) || [];
}

function mapProductToDocument(
  product: ProductRow,
  brandMap: Map<string, string>,
  categoryMap: Map<string, string>
): ElasticsearchProductDocument {
  const brandName = product.brand_id ? brandMap.get(product.brand_id) || '' : '';
  const categoryName = product.category_id ? categoryMap.get(product.category_id) || '' : '';
  const specificationsText = specsToText(product.specifications);

  const searchText = normalizeSearchText(
    [
      product.name || '',
      product.sku || '',
      brandName,
      categoryName,
      product.description || '',
      product.short_description || '',
      product.full_description || '',
      product.availability_text || '',
      specificationsText,
    ].join(' ')
  );

  return {
    id: product.id,
    name: product.name || '',
    slug: product.slug || '',
    sku: product.sku ?? null,
    sku_normalized: normalizeSkuLikeText(product.sku || ''),
    price: product.price ?? null,
    description: product.description ?? null,
    short_description: product.short_description ?? null,
    full_description: product.full_description ?? null,
    is_available: product.is_available ?? null,
    availability_text: product.availability_text ?? null,
    source_url: product.source_url ?? null,
    specifications: product.specifications ?? {},
    specifications_text: specificationsText,
    brand_id: product.brand_id ?? null,
    brand_name: brandName,
    category_id: product.category_id ?? null,
    category_name: categoryName,
    stock_qty: product.stock_qty ?? null,
    currency: product.currency ?? null,
    measure: product.measure ?? null,
    source_site_id: product.source_site_id ?? null,
    search_text: searchText,
  };
}

export async function reindexAllProductsToElasticsearch(): Promise<{ indexed: number }> {
  await recreateProductsIndex();

  const [brandMap, categoryMap] = await Promise.all([
    fetchAllBrands(),
    fetchAllCategories(),
  ]);

  let indexed = 0;
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const products = await fetchProductsPage(from, to);

    if (!products.length) {
      break;
    }

    const operations = products.flatMap((product) => {
      const document = mapProductToDocument(product, brandMap, categoryMap);

      return [
        { index: { _index: ELASTICSEARCH_PRODUCTS_INDEX, _id: product.id } },
        document,
      ];
    });

    await elasticsearch.bulk({
      refresh: false,
      operations,
    });

    indexed += products.length;
    from += PAGE_SIZE;
  }

  await elasticsearch.indices.refresh({
    index: ELASTICSEARCH_PRODUCTS_INDEX,
  });

  return { indexed };
}
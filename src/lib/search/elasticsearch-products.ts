import { elasticsearch, ELASTICSEARCH_PRODUCTS_INDEX } from '@/lib/elasticsearch';
import type { ProductRow } from '@/lib/catalog-service';

export type ElasticsearchProductDocument = {
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

export type ElasticsearchSearchParams = {
  query: string;
  limit?: number;
  brandIds?: string[];
  categoryIds?: string[];
  onlyAvailable?: boolean;
};

const DEFAULT_LIMIT = 48;

const EN_TO_RU_KEYBOARD_MAP: Record<string, string> = {
  '`': 'ё',
  q: 'й',
  w: 'ц',
  e: 'у',
  r: 'к',
  t: 'е',
  y: 'н',
  u: 'г',
  i: 'ш',
  o: 'щ',
  p: 'з',
  '[': 'х',
  ']': 'ъ',
  a: 'ф',
  s: 'ы',
  d: 'в',
  f: 'а',
  g: 'п',
  h: 'р',
  j: 'о',
  k: 'л',
  l: 'д',
  ';': 'ж',
  "'": 'э',
  z: 'я',
  x: 'ч',
  c: 'с',
  v: 'м',
  b: 'и',
  n: 'т',
  m: 'ь',
  ',': 'б',
  '.': 'ю',
  '/': '.',
};

const TOKEN_SYNONYMS: Record<string, string[]> = {
  hex: ['шестигранный', 'шестигранник'],
  allen: ['шестигранный', 'шестигранник'],
  key: ['ключ'],
  lamp: ['светильник'],
  led: ['светодиодный'],
  drill: ['сверло'],
  tap: ['метчик'],
  insert: ['пластина'],
  threading: ['резьбовая'],
  internal: ['внутренняя'],
};

function clampLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(100, Number(limit)));
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
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

function normalizeSkuLikeText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '')
    .trim();
}

function swapEnToRuKeyboardLayout(value: string): string {
  return String(value || '')
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const mapped = EN_TO_RU_KEYBOARD_MAP[lower];
      if (!mapped) return char;
      return char === lower ? mapped : mapped.toUpperCase();
    })
    .join('');
}

function buildFilters(params: ElasticsearchSearchParams): Array<Record<string, unknown>> {
  const filters: Array<Record<string, unknown>> = [];

  const brandIds = uniqueStrings(params.brandIds || []);
  const categoryIds = uniqueStrings(params.categoryIds || []);

  if (brandIds.length) {
    filters.push({
      terms: {
        brand_id: brandIds,
      },
    });
  }

  if (categoryIds.length) {
    filters.push({
      terms: {
        category_id: categoryIds,
      },
    });
  }

  if (params.onlyAvailable) {
    filters.push({
      bool: {
        should: [
          { term: { is_available: true } },
          { range: { stock_qty: { gt: 0 } } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  return filters;
}

function isLikelyExactSkuQuery(value: string): boolean {
  const query = String(value || '').trim();
  if (!query) return false;
  if (/\s/.test(query)) return false;
  if (query.length < 3) return false;
  return /\d/.test(query);
}

function buildQueryVariants(query: string): string[] {
  const original = String(query || '').trim();
  if (!original) return [];

  const variants = new Set<string>();
  variants.add(original);

  const normalized = normalizeSearchText(original);
  if (normalized) {
    variants.add(normalized);
  }

  const layoutFixed = normalizeSearchText(swapEnToRuKeyboardLayout(original));
  if (layoutFixed && layoutFixed !== normalized) {
    variants.add(layoutFixed);
  }

  const tokens = normalizeSearchText(original).split(' ').filter(Boolean);
  if (tokens.length) {
    const synonymExpanded = tokens.flatMap((token) => {
      const synonyms = TOKEN_SYNONYMS[token];
      return synonyms?.length ? synonyms : [token];
    }).join(' ');

    if (synonymExpanded) {
      variants.add(synonymExpanded);
    }

    const layoutFixedTokens = normalizeSearchText(swapEnToRuKeyboardLayout(tokens.join(' ')))
      .split(' ')
      .filter(Boolean);

    if (layoutFixedTokens.length) {
      const layoutSynonymExpanded = layoutFixedTokens.flatMap((token) => {
        const synonyms = TOKEN_SYNONYMS[token];
        return synonyms?.length ? synonyms : [token];
      }).join(' ');

      if (layoutSynonymExpanded) {
        variants.add(layoutSynonymExpanded);
      }
    }
  }

  return Array.from(variants).filter(Boolean);
}

async function runExactSkuSearch(
  query: string,
  filters: Array<Record<string, unknown>>,
  limit: number
): Promise<ProductRow[]> {
  const normalizedSku = normalizeSkuLikeText(query);
  if (!isLikelyExactSkuQuery(query) || !normalizedSku) {
    return [];
  }

  const response = await elasticsearch.search<ElasticsearchProductDocument>({
    index: ELASTICSEARCH_PRODUCTS_INDEX,
    size: limit,
    query: {
      bool: {
        must: [
          {
            term: {
              sku_normalized: normalizedSku,
            },
          },
        ],
        filter: filters,
      },
    },
  });

  const hits = response.hits.hits || [];

  return hits
    .map((hit) => hit._source)
    .filter(Boolean)
    .map((source) => mapHitToProductRow(source as ElasticsearchProductDocument));
}

function buildShouldQueries(query: string): Array<Record<string, unknown>> {
  const original = String(query || '').trim();
  if (!original) return [];

  const variants = buildQueryVariants(original);
  const normalizedSku = normalizeSkuLikeText(original);
  const hasDigits = /\d/.test(original);

  const shouldQueries: Array<Record<string, unknown>> = [];

  if (normalizedSku) {
    shouldQueries.push({
      term: {
        sku_normalized: {
          value: normalizedSku,
          boost: 200,
        },
      },
    });

    if (normalizedSku.length >= 4) {
      shouldQueries.push({
        prefix: {
          sku_normalized: {
            value: normalizedSku,
            boost: 80,
          },
        },
      });

      shouldQueries.push({
        wildcard: {
          sku_normalized: {
            value: `*${normalizedSku}*`,
            boost: 40,
          },
        },
      });
    }
  }

  for (const variant of variants) {
    shouldQueries.push({
      multi_match: {
        query: variant,
        type: 'cross_fields',
        fields: [
          'name^12',
          'sku^20',
          'brand_name^6',
          'category_name^4',
          'specifications_text^4',
          'search_text^3',
          'availability_text',
        ],
        operator: 'and',
        boost: 20,
      },
    });

    shouldQueries.push({
      match_phrase: {
        name: {
          query: variant,
          boost: 50,
        },
      },
    });

    shouldQueries.push({
      match_phrase: {
        search_text: {
          query: variant,
          boost: 20,
        },
      },
    });

    if (!hasDigits) {
      shouldQueries.push({
        multi_match: {
          query: variant,
          type: 'best_fields',
          fields: [
            'name^10',
            'brand_name^5',
            'category_name^3',
            'specifications_text^3',
            'search_text^2',
          ],
          operator: 'and',
          fuzziness: 'AUTO',
          boost: 6,
        },
      });
    }
  }

  return shouldQueries;
}

function mapHitToProductRow(hitSource: ElasticsearchProductDocument): ProductRow {
  return {
    id: hitSource.id,
    name: hitSource.name,
    slug: hitSource.slug,
    sku: hitSource.sku ?? null,
    price: hitSource.price ?? null,
    description: hitSource.description ?? null,
    short_description: hitSource.short_description ?? null,
    full_description: hitSource.full_description ?? null,
    is_available: hitSource.is_available ?? null,
    availability_text: hitSource.availability_text ?? null,
    source_url: hitSource.source_url ?? null,
    specifications: hitSource.specifications,
    brand_id: hitSource.brand_id ?? null,
    category_id: hitSource.category_id ?? null,
    stock_qty: hitSource.stock_qty ?? null,
    currency: hitSource.currency ?? null,
    measure: hitSource.measure ?? null,
    source_site_id: hitSource.source_site_id ?? null,
  };
}

export async function searchProductsInElasticsearch(
  params: ElasticsearchSearchParams
): Promise<ProductRow[]> {
  const query = String(params.query || '').trim();
  if (!query) return [];

  const limit = clampLimit(params.limit);
  const filters = buildFilters(params);

  const exactSkuItems = await runExactSkuSearch(query, filters, limit);
  if (exactSkuItems.length > 0) {
    return exactSkuItems;
  }

  const should = buildShouldQueries(query);

  const response = await elasticsearch.search<ElasticsearchProductDocument>({
    index: ELASTICSEARCH_PRODUCTS_INDEX,
    size: limit,
    query: {
      bool: {
        should,
        minimum_should_match: 1,
        filter: filters,
      },
    },
  });

  const hits = response.hits.hits || [];

  return hits
    .map((hit) => hit._source)
    .filter(Boolean)
    .map((source) => mapHitToProductRow(source as ElasticsearchProductDocument));
}
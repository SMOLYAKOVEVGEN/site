import type { APIRoute } from 'astro';
import {
  buildFacets,
  enrichCategoryFacetLabels,
  hydrateProductCards,
  sortProductCards,
  type SearchProductsResult,
} from '@/lib/catalog-service';
import { searchProductsInElasticsearch } from '@/lib/search/elasticsearch-products';

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function clampSearchLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return 48;
  return Math.max(1, Math.min(100, Number(limit)));
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const originalQuery = String(url.searchParams.get('query') || '').trim();
    const limit = clampSearchLimit(Number(url.searchParams.get('limit') || 48));
    const sort = String(url.searchParams.get('sort') || 'relevance') as
      | 'relevance'
      | 'price_asc'
      | 'price_desc'
      | 'name_asc'
      | 'name_desc'
      | 'availability';

    const brandIds = uniqueStrings(url.searchParams.getAll('brandId'));
    const categoryIds = uniqueStrings(url.searchParams.getAll('categoryId'));
    const onlyAvailable = ['1', 'true', 'yes'].includes(
      String(url.searchParams.get('onlyAvailable') || '').toLowerCase()
    );

    if (!originalQuery) {
      const empty: SearchProductsResult = {
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

      return new Response(JSON.stringify(empty), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    const productRows = await searchProductsInElasticsearch({
      query: originalQuery,
      limit,
      brandIds,
      categoryIds,
      onlyAvailable,
    });

    const hydratedItems = await hydrateProductCards(productRows);
    const facets = await enrichCategoryFacetLabels(buildFacets(hydratedItems));
    const sortedItems = sortProductCards(hydratedItems, sort);

    const result: SearchProductsResult = {
      items: sortedItems,
      facets,
      meta: {
        originalQuery,
        normalizedQuery: originalQuery.toLowerCase(),
        normalizedSkuLikeQuery: originalQuery.toLowerCase().replace(/\s+/g, ''),
        queryVariants: [originalQuery],
        tokens: uniqueStrings(originalQuery.split(/\s+/)),
        limit,
        total: sortedItems.length,
        appliedFilters: {
          brandIds,
          categoryIds,
          onlyAvailable,
        },
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Search API failed', error);

    return new Response(
      JSON.stringify({
        message: 'Search API failed',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
};
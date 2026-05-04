import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  ProductGrid,
  type CatalogSortMode,
  type CatalogViewMode,
} from '@/components/catalog/ProductGrid';
import { useCatalogUI } from '@/store/catalog-ui-store';
import { getProductsByIds, type ProductView } from '@/lib/catalog-service';
import { usePageMeta } from '@/lib/use-page-meta';

const LS_FAVORITES_VIEW_MODE = 'favorites_view_mode';
const LS_FAVORITES_SORT_MODE = 'favorites_sort_mode';

export default function FavoritesPage() {
  usePageMeta({
    title: 'Избранное',
    description: 'Сохраненные товары для дальнейшего выбора и оформления заказа.',
  });
  const ids = useCatalogUI((s) => s.favorites);

  const [products, setProducts] = useState<ProductView[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = window.localStorage.getItem(LS_FAVORITES_VIEW_MODE);
    if (saved === 'grid' || saved === 'compact' || saved === 'list') return saved;
    return 'grid';
  });

  const [sortMode, setSortMode] = useState<CatalogSortMode>(() => {
    if (typeof window === 'undefined') return 'default';
    const saved = window.localStorage.getItem(LS_FAVORITES_SORT_MODE);
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

  useEffect(() => {
    window.localStorage.setItem(LS_FAVORITES_VIEW_MODE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    window.localStorage.setItem(LS_FAVORITES_SORT_MODE, sortMode);
  }, [sortMode]);

  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      if (!ids.length) {
        if (isMounted) {
          setProducts([]);
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);

        const data = await getProductsByIds(ids);

        if (!isMounted) return;

        const sortedBySelectionOrder = [...data].sort((a, b) => {
          return ids.indexOf(a.id) - ids.indexOf(b.id);
        });

        setProducts(sortedBySelectionOrder);
      } catch (error) {
        if (!isMounted) return;
        console.error('FavoritesPage load error:', error);
        setProducts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [ids]);

  const sortedProducts = useMemo(() => {
    const items = [...products];

    switch (sortMode) {
      case 'name_asc':
        return items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

      case 'name_desc':
        return items.sort((a, b) => b.name.localeCompare(a.name, 'ru'));

      case 'price_asc':
        return items.sort((a, b) => {
          const aPrice = a.price > 0 ? a.price : Number.MAX_SAFE_INTEGER;
          const bPrice = b.price > 0 ? b.price : Number.MAX_SAFE_INTEGER;
          return aPrice - bPrice;
        });

      case 'price_desc':
        return items.sort((a, b) => (b.price || 0) - (a.price || 0));

      case 'availability_desc':
        return items.sort((a, b) => {
          const aAvailable = a.isAvailable ? 1 : 0;
          const bAvailable = b.isAvailable ? 1 : 0;
          if (aAvailable !== bAvailable) return bAvailable - aAvailable;
          return a.name.localeCompare(b.name, 'ru');
        });

      case 'availability_asc':
        return items.sort((a, b) => {
          const aAvailable = a.isAvailable ? 1 : 0;
          const bAvailable = b.isAvailable ? 1 : 0;
          if (aAvailable !== bAvailable) return aAvailable - bAvailable;
          return a.name.localeCompare(b.name, 'ru');
        });

      case 'default':
      default:
        return items;
    }
  }, [products, sortMode]);

  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />

      <section className="bg-graphite text-primary-foreground py-16 sm:py-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-4">
            Избранное
          </h1>
          <p className="font-paragraph text-base sm:text-lg text-white/75 max-w-3xl">
            Сохраненные товары для быстрого доступа, сравнения и последующего оформления запроса.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16" style={{ minHeight: '520px' }}>
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner />
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-4">
                В избранном пока ничего нет
              </h2>
              <p className="font-paragraph text-steel-gray mb-8">
                Добавляйте товары в избранное из каталога или со страницы товара.
              </p>
              <Link to="/catalog">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Перейти в каталог
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="font-paragraph text-lg text-steel-gray">
                  Товаров в избранном:{' '}
                  <span className="font-medium text-graphite">{sortedProducts.length}</span>
                </p>
              </div>

              <ProductGrid
                products={sortedProducts}
                emptyText="В избранном пока ничего нет"
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
              />
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
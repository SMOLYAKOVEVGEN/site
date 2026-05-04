import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCatalogUI } from '@/store/catalog-ui-store';
import { getProductsByIds, type ProductView } from '@/lib/catalog-service';
import { usePageMeta } from '@/lib/use-page-meta';

type CompareRow = {
  key: string;
  label: string;
  values: Record<string, string>;
};

function parseSpecifications(specificationsText: string): Record<string, string> {
  if (!specificationsText) return {};

  return specificationsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) return acc;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key) {
        acc[key] = value || '—';
      }

      return acc;
    }, {});
}

function normalizeCompareValue(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function rowHasDifferences(row: CompareRow, products: ProductView[]): boolean {
  if (products.length <= 1) return true;

  const normalizedValues = products.map((product) =>
    normalizeCompareValue(row.values[product.id] || '—')
  );

  return new Set(normalizedValues).size > 1;
}

export default function ComparePage() {
  usePageMeta({
    title: 'Сравнение товаров',
    description: 'Сравнение характеристик выбранных товаров.',
  });
  const ids = useCatalogUI((s) => s.compare);
  const clearCompare = useCatalogUI((s) => s.clearCompare);
  const toggleCompare = useCatalogUI((s) => s.toggleCompare);

  const [products, setProducts] = useState<ProductView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCompare() {
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

        const sorted = [...data].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

        setProducts(sorted);
      } catch (error) {
        if (!isMounted) return;
        console.error('ComparePage load error:', error);
        setProducts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCompare();

    return () => {
      isMounted = false;
    };
  }, [ids]);

  const compareRows = useMemo<CompareRow[]>(() => {
    if (!products.length) return [];

    const baseRows: CompareRow[] = [
      {
        key: 'brand',
        label: 'Бренд',
        values: Object.fromEntries(products.map((p) => [p.id, p.brand || '—'])),
      },
      {
        key: 'sku',
        label: 'Артикул',
        values: Object.fromEntries(products.map((p) => [p.id, p.sku || '—'])),
      },
      {
        key: 'price',
        label: 'Цена',
        values: Object.fromEntries(
          products.map((p) => [
            p.id,
            p.price > 0 ? `${p.price.toLocaleString('ru-RU')} ₽` : 'По запросу',
          ])
        ),
      },
      {
        key: 'availability',
        label: 'Наличие',
        values: Object.fromEntries(
          products.map((p) => [
            p.id,
            p.isAvailable ? 'В наличии' : p.availabilityText || 'Под заказ',
          ])
        ),
      },
      {
        key: 'description',
        label: 'Описание',
        values: Object.fromEntries(products.map((p) => [p.id, p.description?.trim() || '—'])),
      },
    ];

    const specMaps = products.map((product) => ({
      productId: product.id,
      specs: parseSpecifications(product.specificationsText),
    }));

    const specKeys = Array.from(new Set(specMaps.flatMap((item) => Object.keys(item.specs)))).sort(
      (a, b) => a.localeCompare(b, 'ru')
    );

    const specRows: CompareRow[] = specKeys.map((specKey) => ({
      key: `spec:${specKey}`,
      label: specKey,
      values: Object.fromEntries(
        products.map((product) => {
          const specMap = specMaps.find((item) => item.productId === product.id)?.specs || {};
          return [product.id, specMap[specKey] || '—'];
        })
      ),
    }));

    return [...baseRows, ...specRows];
  }, [products]);

  const visibleRows = useMemo(() => {
    if (!showOnlyDifferences) return compareRows;
    return compareRows.filter((row) => rowHasDifferences(row, products));
  }, [compareRows, products, showOnlyDifferences]);

  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />

      <section className="bg-graphite text-primary-foreground py-16 sm:py-20">
        <div className="max-w-[120rem] mx-auto px-4 sm:px-8">
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-4">
              Сравнение товаров
            </h1>
            <p className="font-paragraph text-base sm:text-lg text-white/75 max-w-3xl">
              Сравните выбранные товары по ключевым параметрам и характеристикам.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16" style={{ minHeight: '520px' }}>
        <div className="max-w-[120rem] mx-auto px-4 sm:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-4">
                В сравнении пока нет товаров
              </h2>
              <p className="font-paragraph text-steel-gray mb-8">
                Добавляйте товары в сравнение из каталога или со страницы товара.
              </p>
              <Link to="/catalog">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Перейти в каталог
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="font-paragraph text-lg text-steel-gray">
                    Товаров в сравнении:{' '}
                    <span className="font-medium text-graphite">{products.length}</span>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="compare-mode"
                        checked={!showOnlyDifferences}
                        onChange={() => setShowOnlyDifferences(false)}
                        className="h-5 w-5 accent-primary"
                      />
                      <span className="font-paragraph text-base text-graphite">
                        Все характеристики
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="compare-mode"
                        checked={showOnlyDifferences}
                        onChange={() => setShowOnlyDifferences(true)}
                        className="h-5 w-5 accent-primary"
                      />
                      <span className="font-paragraph text-base text-graphite">
                        Только различия
                      </span>
                    </label>
                  </div>

                  <Link
                    to="/catalog"
                    className="inline-block font-paragraph text-base font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Добавить товары
                  </Link>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={clearCompare}>
                    Очистить сравнение
                  </Button>
                </div>
              </div>

              <div className="mb-6 font-paragraph text-sm text-steel-gray">
                Параметров показано:{' '}
                <span className="font-medium text-graphite">{visibleRows.length}</span>
              </div>

              {showOnlyDifferences && visibleRows.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-graphite/10">
                  <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-4">
                    Различий не найдено
                  </h2>
                  <p className="font-paragraph text-steel-gray mb-8">
                    У выбранных товаров все сравниваемые параметры совпадают.
                  </p>
                  <Button type="button" variant="outline" onClick={() => setShowOnlyDifferences(false)}>
                    Показать все параметры
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-graphite/10 bg-white">
                  <div
                    className="grid min-w-[980px]"
                    style={{
                      gridTemplateColumns: `260px repeat(${products.length}, minmax(260px, 1fr))`,
                    }}
                  >
                    <div className="sticky left-0 z-10 bg-white border-b border-r border-graphite/10 p-4 sm:p-5">
                      <div className="font-heading text-lg text-graphite">Параметры</div>
                    </div>

                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="border-b border-r border-graphite/10 p-4 sm:p-5 bg-white"
                      >
                        <div className="flex flex-col h-full">
                          <Link to={`/product/${product.id}`} className="group">
                            <div className="h-40 bg-background rounded-lg overflow-hidden mb-4 border border-graphite/10">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm text-steel-gray">
                                  Нет изображения
                                </div>
                              )}
                            </div>

                            <div className="font-heading text-base text-graphite group-hover:text-primary transition-colors line-clamp-3 mb-2">
                              {product.name}
                            </div>
                          </Link>

                          {product.brand && (
                            <div className="text-sm text-steel-gray mb-3">{product.brand}</div>
                          )}

                          <div className="mt-auto flex flex-col gap-2 pt-2">
                            <Link to={`/product/${product.id}`}>
                              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                                Открыть товар
                              </Button>
                            </Link>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => toggleCompare(product.id)}
                            >
                              Убрать из сравнения
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {visibleRows.map((row) => (
                      <FragmentRow key={row.key} row={row} products={products} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FragmentRow({
  row,
  products,
}: {
  row: CompareRow;
  products: ProductView[];
}) {
  return (
    <>
      <div className="sticky left-0 z-[5] bg-[#fafbfc] border-b border-r border-graphite/10 p-4 sm:p-5 font-medium text-graphite">
        {row.label}
      </div>

      {products.map((product) => (
        <div
          key={`${row.key}-${product.id}`}
          className="border-b border-r border-graphite/10 p-4 sm:p-5 text-sm text-steel-gray whitespace-pre-line leading-relaxed bg-white"
        >
          {row.values[product.id] || '—'}
        </div>
      ))}
    </>
  );
}
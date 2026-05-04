import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  FileText,
  Share2,
  Printer,
  Check,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCatalogUI } from '@/store/catalog-ui-store';
import { getProductsByIds, type ProductView } from '@/lib/catalog-service';
import { getCurrentCustomer } from '@/lib/customer-auth';
import { usePageMeta } from '@/lib/use-page-meta';

type CartProductRow = ProductView & {
  cartQuantity: number;
};

function getCartItemsLabel(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return 'товар';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return 'товара';
  }
  return 'товаров';
}

export default function CartPage() {
  usePageMeta({
    title: 'Корзина',
    description: 'Корзина выбранных товаров и подготовка к оформлению заказа.',
  });
  const cart = useCatalogUI((s) => s.cart);
  const removeFromCart = useCatalogUI((s) => s.removeFromCart);
  const setCartQuantity = useCatalogUI((s) => s.setCartQuantity);
  const clearCart = useCatalogUI((s) => s.clearCart);
  const syncCartWithExistingIds = useCatalogUI((s) => s.syncCartWithExistingIds);

  const [baseProducts, setBaseProducts] = useState<ProductView[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDone, setShareDone] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const cartIds = useMemo(() => cart.map((item) => item.productId), [cart]);
  const cartIdsKey = useMemo(() => cartIds.join('|'), [cartIds]);

  useEffect(() => {
    let active = true;

    async function loadCustomer() {
      try {
        const customer = await getCurrentCustomer();
        if (!active) return;
        setIsAuthorized(Boolean(customer?.id));
      } catch (error) {
        console.error('CartPage auth load error:', error);
        if (!active) return;
        setIsAuthorized(false);
      } finally {
        if (active) {
          setIsAuthResolved(true);
        }
      }
    }

    loadCustomer();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCartProducts() {
      if (!cartIds.length) {
        if (isMounted) {
          setBaseProducts([]);
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);

        const data = await getProductsByIds(cartIds);

        if (!isMounted) return;

        const existingIds = data.map((item) => item.id);
        syncCartWithExistingIds(existingIds);

        const sorted = [...data].sort(
          (a, b) => cartIds.indexOf(a.id) - cartIds.indexOf(b.id)
        );
        setBaseProducts(sorted);
      } catch (error) {
        if (!isMounted) return;
        console.error('CartPage load error:', error);
        setBaseProducts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCartProducts();

    return () => {
      isMounted = false;
    };
  }, [cartIdsKey, cartIds, syncCartWithExistingIds]);

  const products = useMemo<CartProductRow[]>(() => {
    if (!baseProducts.length || !cart.length) return [];

    const quantityMap = new Map(cart.map((item) => [item.productId, item.quantity]));

    return baseProducts
      .filter((product) => quantityMap.has(product.id))
      .map((product) => ({
        ...product,
        cartQuantity: quantityMap.get(product.id) || 1,
      }))
      .sort((a, b) => cartIds.indexOf(a.id) - cartIds.indexOf(b.id));
  }, [baseProducts, cart, cartIds]);

  const totals = useMemo(() => {
    const itemsCount = products.length;
    const unitsCount = products.reduce((sum, item) => sum + item.cartQuantity, 0);
    const totalPrice = products.reduce((sum, item) => {
      return sum + (item.price > 0 ? item.price * item.cartQuantity : 0);
    }, 0);

    return {
      itemsCount,
      unitsCount,
      totalPrice,
    };
  }, [products]);

  const vatAmount = useMemo(() => {
    if (totals.totalPrice <= 0) return 0;
    return totals.totalPrice * 22 / 122;
  }, [totals.totalPrice]);

  const printDate = useMemo(() => {
    return new Date().toLocaleString('ru-RU');
  }, []);

  const checkoutHref =
    isAuthResolved && isAuthorized
      ? '/checkout'
      : '/account-login?next=%2Fcheckout';

  const handleDecrease = (productId: string, currentQuantity: number) => {
    if (currentQuantity <= 1) return;
    setCartQuantity(productId, currentQuantity - 1);
  };

  const handleIncrease = (productId: string, currentQuantity: number) => {
    setCartQuantity(productId, currentQuantity + 1);
  };

  const handleShare = async () => {
    try {
      const shareText = [
        'Корзина АВТОграф Инструментальные Решения',
        '',
        ...products.map(
          (item, index) =>
            `${index + 1}. ${item.name} — ${item.cartQuantity} шт.${
              item.price > 0
                ? ` — ${(item.price * item.cartQuantity).toLocaleString('ru-RU')} ₽`
                : ''
            }`
        ),
        '',
        totals.totalPrice > 0
          ? `Итого: ${totals.totalPrice.toLocaleString('ru-RU')} ₽`
          : 'Итого: цена по запросу',
        '',
        typeof window !== 'undefined' ? window.location.href : '',
      ]
        .filter(Boolean)
        .join('\n');

      if (navigator.share) {
        await navigator.share({
          title: 'Корзина',
          text: shareText,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareDone(true);
        window.setTimeout(() => setShareDone(false), 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-hide {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }
        }

        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      <div className="print-hide">
        <Header />
      </div>

      <section className="bg-graphite text-primary-foreground py-16 sm:py-20 print-hide">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-4">
            Корзина
          </h1>
          <p className="font-paragraph text-base sm:text-lg text-white/75 max-w-3xl">
            Проверьте выбранные товары, измените количество и отправьте запрос на коммерческое предложение.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16" style={{ minHeight: '560px' }}>
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-24 print-hide">
              <LoadingSpinner />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 print-hide">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-background border border-graphite/10">
                <ShoppingCart className="h-9 w-9 text-steel-gray" />
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl text-graphite mb-4">
                В корзине пока ничего нет
              </h2>
              <p className="font-paragraph text-steel-gray mb-8">
                Добавляйте товары из каталога, чтобы сформировать запрос.
              </p>

              <Link to="/catalog">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Перейти в каталог
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid xl:grid-cols-[1fr_360px] gap-8 print-hide">
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-paragraph text-lg text-steel-gray">
                      Позиций: <span className="font-medium text-graphite">{totals.itemsCount}</span>
                      {' · '}
                      Товаров: <span className="font-medium text-graphite">{totals.unitsCount}</span>
                    </div>

                    <Button type="button" variant="outline" onClick={clearCart}>
                      Очистить корзину
                    </Button>
                  </div>

                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="border border-[#d9dde3] bg-white ring-1 ring-black/[0.03] p-5 md:p-6"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr_180px_170px] gap-6 items-start">
                        <Link
                          to={`/product/${product.id}`}
                          className="flex items-center justify-center bg-white"
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="max-h-[160px] max-w-full object-contain"
                            />
                          ) : (
                            <div className="h-[160px] w-full flex items-center justify-center text-sm text-steel-gray bg-background rounded-lg">
                              Нет изображения
                            </div>
                          )}
                        </Link>

                        <div>
                          <Link
                            to={`/product/${product.id}`}
                            className="font-heading text-xl text-graphite hover:text-primary transition-colors leading-snug"
                          >
                            {product.name}
                          </Link>

                          {product.brand && (
                            <div className="mt-3 text-sm text-steel-gray">{product.brand}</div>
                          )}

                          {product.sku && (
                            <div className="mt-2 text-sm text-steel-gray">
                              Артикул: {product.sku}
                            </div>
                          )}

                          <div className="mt-4 text-sm text-steel-gray">
                            {product.isAvailable ? 'В наличии' : product.availabilityText || 'Под заказ'}
                          </div>

                          <div className="mt-5">
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                              Убрать из корзины
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-steel-gray mb-3">Количество</div>

                          <div className="flex h-12 max-w-[160px] overflow-hidden rounded-lg border border-[#e6e9ee] bg-[#f6f7f9]">
                            <button
                              type="button"
                              onClick={() => handleDecrease(product.id, product.cartQuantity)}
                              disabled={product.cartQuantity <= 1}
                              aria-label="Уменьшить количество"
                              className="h-12 w-10 flex items-center justify-center text-graphite hover:bg-black/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <div className="flex-1 h-12 flex items-center justify-center text-base font-medium text-graphite">
                              {product.cartQuantity}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleIncrease(product.id, product.cartQuantity)}
                              aria-label="Увеличить количество"
                              className="h-12 w-10 flex items-center justify-center text-graphite hover:bg-black/5 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="lg:text-right">
                          <div className="text-sm text-steel-gray mb-3">Сумма</div>
                          <div className="font-heading text-2xl text-graphite">
                            {product.price > 0
                              ? `${(product.price * product.cartQuantity).toLocaleString('ru-RU')} ₽`
                              : 'По запросу'}
                          </div>
                          {product.price > 0 && (
                            <div className="mt-2 text-sm text-steel-gray">
                              {product.price.toLocaleString('ru-RU')} ₽/шт
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <aside className="h-fit border border-[#d9dde3] bg-white ring-1 ring-black/[0.03] p-6 sticky top-28">
                  <h2 className="font-heading text-2xl text-graphite mb-6">Итого</h2>

                  <div className="space-y-4 border-b border-graphite/10 pb-6">
                    <div className="flex items-center justify-between text-sm text-steel-gray">
                      <span>Позиций</span>
                      <span className="text-graphite font-medium">{totals.itemsCount}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-steel-gray">
                      <span>Общее количество</span>
                      <span className="text-graphite font-medium">{totals.unitsCount}</span>
                    </div>

                    <div className="flex items-start justify-between text-base">
                      <span className="text-graphite font-medium">Сумма</span>

                      <div className="text-right">
                        <div className="font-heading text-2xl text-graphite">
                          {totals.totalPrice > 0
                            ? `${totals.totalPrice.toLocaleString('ru-RU', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} ₽`
                            : 'По запросу'}
                        </div>

                        {totals.totalPrice > 0 && (
                          <div className="mt-1 text-sm text-steel-gray">
                            в т.ч. НДС {vatAmount.toLocaleString('ru-RU', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ₽
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 space-y-3">
                    <Link to={checkoutHref} className="block">
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12">
                        <FileText className="mr-2 h-4 w-4" />
                        Перейти к оформлению
                      </Button>
                    </Link>

                    <Button type="button" variant="outline" className="w-full h-12" onClick={handleShare}>
                      {shareDone ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
                      {shareDone ? 'Скопировано' : 'Поделиться'}
                    </Button>

                    <Button type="button" variant="outline" className="w-full h-12" onClick={handlePrint}>
                      <Printer className="mr-2 h-4 w-4" />
                      Распечатать
                    </Button>
                  </div>
                </aside>
              </div>

              <div className="print-only">
                <div className="border border-black/20 px-4 py-4">
                  <div className="grid grid-cols-3 items-start text-[11px] mb-6">
                    <div>{printDate}</div>
                    <div className="text-center font-medium">Корзина</div>
                    <div />
                  </div>

                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <img
                        src="/images/logo-print.png"
                        alt="АВТОграф"
                        className="h-12 w-auto object-contain"
                      />

                      <div className="text-[12px] leading-relaxed">
                        <div className="font-semibold">АВТОграф Инструментальные Решения</div>
                        <div>+7 (812) 640-39-96</div>
                        <div>info@cnc.su</div>
                        <div>г. Санкт-Петербург, ул. Заусадебная, д. 15, строение 5</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h1 className="text-[24px] font-semibold leading-none">Корзина</h1>
                  </div>

                  <div className="border border-black/10 mb-5">
                    <div className="flex items-center justify-between px-5 py-4 text-[15px]">
                      <div>
                        <div className="font-semibold">Итого:</div>
                        <div className="text-[11px] mt-1 text-black/70">
                          Сумма НДС: {vatAmount.toLocaleString('ru-RU', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} ₽
                        </div>
                      </div>

                      <div className="text-[20px] font-bold">
                        {totals.totalPrice.toLocaleString('ru-RU', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ₽
                      </div>
                    </div>
                  </div>

                  <div className="border border-black/10 mb-6">
                    <table className="w-full border-collapse text-[12px]">
                      <thead>
                        <tr className="border-b border-black/10">
                          <th className="py-3 px-3 w-[36px] text-left">№</th>
                          <th className="py-3 px-3 text-left">Наименование</th>
                          <th className="py-3 px-3 w-[70px] text-center">Кол-во</th>
                          <th className="py-3 px-3 w-[120px] text-right">Цена</th>
                          <th className="py-3 px-3 w-[120px] text-right">Сумма</th>
                        </tr>
                      </thead>

                      <tbody>
                        {products.map((product, index) => (
                          <tr key={product.id} className="border-b border-black/10 last:border-b-0">
                            <td className="py-3 px-3 align-top">{index + 1}</td>

                            <td className="py-3 px-3 align-top">
                              <div className="flex gap-3">
                                <div className="w-[42px] h-[42px] shrink-0 flex items-start justify-center">
                                  {product.image ? (
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="max-w-full max-h-[42px] object-contain"
                                    />
                                  ) : null}
                                </div>

                                <div>
                                  <div className="font-medium leading-snug">
                                    {product.name}
                                  </div>

                                  {product.sku && (
                                    <div className="text-[10px] text-black/60 mt-1">
                                      Артикул: {product.sku}
                                    </div>
                                  )}

                                  {product.brand && (
                                    <div className="text-[10px] text-black/60 mt-1">
                                      Бренд: {product.brand}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center align-top">
                              {product.cartQuantity}
                            </td>

                            <td className="py-3 px-3 text-right align-top">
                              {product.price > 0
                                ? `${product.price.toLocaleString('ru-RU', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })} ₽`
                                : 'По запросу'}
                            </td>

                            <td className="py-3 px-3 text-right align-top font-medium">
                              {product.price > 0
                                ? `${(product.price * product.cartQuantity).toLocaleString('ru-RU', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })} ₽`
                                : 'По запросу'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-black/30 pt-5">
                    <div className="text-[11px] mb-3">
                      2026 © ООО «АВТОграф Инструментальные Решения»
                    </div>

                    <div className="text-[10px] leading-relaxed text-black/75">
                      Информация на данном интернет-сайте носит исключительно ознакомительный характер и ни при каких
                      условиях не является публичной офертой, определяемой положениями Статьи 437 Гражданского кодекса РФ.
                      Поставщик оставляет за собой право без предварительного уведомления вносить изменения в стоимость,
                      конструкцию и комплектацию изделий.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="print-hide">
        <Footer />
      </div>
    </div>
  );
}

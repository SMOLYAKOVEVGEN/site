import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Heart,
  BarChart3,
  ShoppingCart,
  Minus,
  Plus,
  CircleCheck,
} from 'lucide-react';
import { useCatalogUI } from '@/store/catalog-ui-store';
import ProductImageFallback from '@/components/catalog/ProductImageFallback';

type CatalogCardProduct = {
  _id: string;
  itemName: string;
  productSlug: string;
  itemImage: string;
  productSku: string;
  brand: string;
  itemPrice: number;
  isAvailable?: boolean;
  availabilityText?: string;
};

type ProductViewLike = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  price: number;
  image: string;
  isAvailable?: boolean;
  availabilityText?: string;
};

type Props = {
  product: CatalogCardProduct | ProductViewLike;
  itemLinkState?: unknown;
};

type CartPhase = 'idle' | 'launch' | 'drop' | 'exit' | 'enter' | 'done';

function isCatalogCardProduct(
  product: CatalogCardProduct | ProductViewLike
): product is CatalogCardProduct {
  return '_id' in product;
}

function getProductId(product: CatalogCardProduct | ProductViewLike): string {
  return isCatalogCardProduct(product) ? product._id : product.id;
}

function getProductSlug(product: CatalogCardProduct | ProductViewLike): string {
  return isCatalogCardProduct(product) ? product.productSlug : product.slug;
}

function getProductUrl(product: CatalogCardProduct | ProductViewLike): string {
  const slug = getProductSlug(product);
  return slug ? `/product/${slug}` : `/product/${getProductId(product)}`;
}

function getProductName(product: CatalogCardProduct | ProductViewLike): string {
  return isCatalogCardProduct(product) ? product.itemName : product.name;
}

function getProductImage(product: CatalogCardProduct | ProductViewLike): string {
  return isCatalogCardProduct(product) ? product.itemImage : product.image;
}

function getProductSku(product: CatalogCardProduct | ProductViewLike): string {
  return isCatalogCardProduct(product) ? product.productSku : product.sku;
}

function getProductPrice(product: CatalogCardProduct | ProductViewLike): number {
  return isCatalogCardProduct(product) ? product.itemPrice : product.price;
}

function getProductBrand(product: CatalogCardProduct | ProductViewLike): string {
  return isCatalogCardProduct(product) ? product.brand : product.brand;
}

function getProductAvailability(product: CatalogCardProduct | ProductViewLike) {
  const isAvailable =
    typeof product.isAvailable === 'boolean' ? product.isAvailable : true;

  const availabilityText =
    typeof product.availabilityText === 'string' && product.availabilityText.trim()
      ? product.availabilityText.trim()
      : isAvailable
        ? 'В наличии'
        : 'Нет в наличии';

  return {
    isAvailable,
    availabilityText,
  };
}

function getAvailabilityClass(isAvailable: boolean, availabilityText: string): string {
  if (isAvailable) {
    return 'text-[#0f6a3b]';
  }

  if (availabilityText.toLowerCase().includes('под заказ')) {
    return 'text-primary';
  }

  return 'text-[#a33a3a]';
}

function hasRealProductImage(image: string) {
  const normalized = String(image || '').trim().toLowerCase();

  return Boolean(
    normalized &&
      !normalized.includes('/0.png') &&
      !normalized.includes('/0.jpg') &&
      !normalized.includes('/0.jpeg') &&
      !normalized.includes('/0.webp') &&
      !normalized.includes('placeholder') &&
      !normalized.includes('no-photo') &&
      !normalized.includes('нет фото') &&
      !normalized.includes('wixstatic.com')
  );
}

function formatCardPrice(price: number) {
  return price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу';
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
  img.src = hasRealProductImage(imageUrl) ? imageUrl : '/placeholder.png';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = '';
  img.draggable = false;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'contain';
  img.style.padding = '6px';

  flyEl.appendChild(img);
  document.body.appendChild(flyEl);

  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;

  const deltaX = endX - startX;
  const deltaY = endY - startY;

  requestAnimationFrame(() => {
    flyEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.32)`;
    flyEl.style.opacity = '0.45';
    flyEl.style.width = '28px';
    flyEl.style.height = '28px';
  });

  window.setTimeout(() => {
    flyEl.remove();
  }, 1260);
}

export function ProductCard({ product, itemLinkState }: Props) {
  const favorites = useCatalogUI((s) => s.favorites);
  const compare = useCatalogUI((s) => s.compare);
  const cart = useCatalogUI((s) => s.cart);

  const toggleFavorite = useCatalogUI((s) => s.toggleFavorite);
  const toggleCompare = useCatalogUI((s) => s.toggleCompare);
  const addToCart = useCatalogUI((s) => s.addToCart);

  const id = getProductId(product);
  const url = getProductUrl(product);
  const linkProps = {
    to: url,
    state: itemLinkState,
  };
  const name = getProductName(product);
  const image = getProductImage(product);
  const brand = getProductBrand(product);
  const hasRealImage = hasRealProductImage(image);
  const sku = getProductSku(product);
  const price = getProductPrice(product);
  const { isAvailable, availabilityText } = getProductAvailability(product);

  const statusClass = getAvailabilityClass(isAvailable, availabilityText);

  const favoriteActive = favorites.includes(id);
  const compareActive = compare.includes(id);
  const cartQuantity = cart.find((item) => item.productId === id)?.quantity ?? 0;

  const [localQuantity, setLocalQuantity] = useState(1);
  const [cartPhase, setCartPhase] = useState<CartPhase>(
    cartQuantity > 0 ? 'done' : 'idle'
  );

  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    if (cartQuantity > 0 && cartPhase === 'idle') {
      setCartPhase('done');
    }
  }, [cartQuantity, cartPhase]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const pushTimeout = (cb: () => void, ms: number) => {
    const t = window.setTimeout(cb, ms);
    timeoutsRef.current.push(t);
  };

  const increaseQty = () => {
    setLocalQuantity((prev) => Math.min(prev + 1, 999));
  };

  const decreaseQty = () => {
    setLocalQuantity((prev) => Math.max(prev - 1, 1));
  };

  const handleAddToCart = () => {
    if (
      cartPhase === 'launch' ||
      cartPhase === 'drop' ||
      cartPhase === 'exit' ||
      cartPhase === 'enter'
    ) {
      return;
    }

    addToCart(id, localQuantity);

    setCartPhase('launch');
    pushTimeout(() => setCartPhase('drop'), 360);
    pushTimeout(() => setCartPhase('exit'), 980);
    pushTimeout(() => setCartPhase('enter'), 1460);
    pushTimeout(() => setCartPhase('done'), 1980);
  };

  return (
    <div className="group h-full">
      <div className="block h-full overflow-hidden border border-[#d9dde3] bg-white ring-1 ring-black/[0.03] transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:border-primary hover:ring-primary/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.14)]">
        <Link {...linkProps} className="block">
          <div className="relative h-[220px] overflow-hidden bg-[#f4f6f8]">
            {hasRealImage ? (
              <img
                src={image}
                alt={name}
                loading="eager"
                decoding="async"
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                draggable={false}
              />
            ) : (
              <ProductImageFallback />
            )}

            <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const willAdd = !favoriteActive;
                  toggleFavorite(id);
                  if (willAdd) animateFlyToHeader(e, image, '[data-favorites-icon]');
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-all ${
                  favoriteActive
                    ? 'border-red-500 bg-red-500 text-white shadow-md'
                    : 'border-black/10 bg-white/90 text-graphite hover:border-red-300 hover:text-red-500'
                }`}
                title={favoriteActive ? 'Убрать из избранного' : 'Добавить в избранное'}
                aria-label={favoriteActive ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                <Heart className={`h-5 w-5 ${favoriteActive ? 'fill-white' : ''}`} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const willAdd = !compareActive;
                  toggleCompare(id);
                  if (willAdd) animateFlyToHeader(e, image, '[data-compare-icon]');
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-all ${
                  compareActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-md'
                    : 'border-black/10 bg-white/90 text-graphite hover:border-primary/40 hover:text-primary'
                }`}
                title={compareActive ? 'Убрать из сравнения' : 'Добавить в сравнение'}
                aria-label={compareActive ? 'Убрать из сравнения' : 'Добавить в сравнение'}
              >
                <BarChart3 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </Link>

        <div className="border-t border-black/5 p-5 md:p-6">
          <Link {...linkProps} className="block">
            <h3 className="mb-3 min-h-[96px] font-heading text-[16px] leading-[1.25] text-graphite transition-colors duration-300 group-hover:text-primary md:text-[17px]">
              {name}
            </h3>
          </Link>

          <div className="mb-2 min-h-[20px] text-sm text-steel-gray">
            {sku ? `Артикул: ${sku}` : ''}
          </div>

          <div className="mb-3 min-h-[20px] text-sm text-steel-gray">
            {brand || ''}
          </div>

          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="text-lg font-semibold text-primary">
              {formatCardPrice(price)}
            </div>

            <div
              className={`inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium ${statusClass}`}
            >
              <CircleCheck className="h-4 w-4 shrink-0" />
              <span>{availabilityText}</span>
            </div>
          </div>

          <div className="mb-4 flex items-stretch gap-3">
            <div className="flex h-12 min-w-[100px] overflow-hidden rounded-lg border border-graphite/10 bg-[#f6f7f9]">
              <button
                type="button"
                onClick={decreaseQty}
                className="flex h-12 w-9 items-center justify-center text-graphite transition-colors hover:bg-black/5"
                aria-label="Уменьшить количество"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="flex h-12 flex-1 items-center justify-center text-base font-medium text-graphite">
                {localQuantity}
              </div>

              <button
                type="button"
                onClick={increaseQty}
                className="flex h-12 w-9 items-center justify-center text-graphite transition-colors hover:bg-black/5"
                aria-label="Увеличить количество"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="relative h-12 flex-1 rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              aria-label="Добавить в корзину"
            >
              <div className="pointer-events-none absolute inset-0 overflow-visible">
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
                  className={`absolute left-1/2 top-1/2 z-20 h-10 w-10 -translate-x-1/2 overflow-hidden rounded-md border border-black/10 bg-[#f3f4f6] shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-all ease-out ${
                    cartPhase === 'launch'
                      ? 'translate-y-[-92px] scale-100 rotate-[-10deg] opacity-100 duration-300'
                      : cartPhase === 'drop'
                        ? 'translate-y-[-4px] scale-[0.42] rotate-0 opacity-100 duration-500'
                        : 'opacity-0 -translate-y-1/2 scale-[0.2] duration-200'
                  }`}
                >
                  <img
                    src={hasRealImage ? image : '/placeholder.png'}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-1.5"
                    draggable={false}
                  />
                </div>

                <div
                  className={`absolute left-1/2 top-1/2 flex -translate-y-1/2 items-center gap-2 transition-all ${
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
                  <span className="whitespace-nowrap font-paragraph text-sm font-semibold">
                    В корзине{cartQuantity > 0 ? ` (${cartQuantity})` : ''}
                  </span>
                </div>
              </div>
            </button>
          </div>

          <Link
            {...linkProps}
            className="inline-flex items-center gap-2 font-paragraph font-semibold text-primary"
          >
            Открыть товар
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
          </Link>
        </div>
      </div>
    </div>
  );
}
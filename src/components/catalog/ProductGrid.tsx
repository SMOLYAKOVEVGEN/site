import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Grid2x2,
  Rows3,
  Rows2,
  ChevronDown,
  Heart,
  BarChart3,
  ShoppingCart,
  Minus,
  Plus,
} from 'lucide-react';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useCatalogUI } from '@/store/catalog-ui-store';
import ProductImageFallback from '@/components/catalog/ProductImageFallback';

export type CatalogViewMode = 'grid' | 'compact' | 'list';
export type CatalogSortMode =
  | 'default'
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc'
  | 'availability_desc'
  | 'availability_asc';

export type CatalogCardProduct = {
  _id: string;
  itemName: string;
  productSlug: string;
  itemImage: string;
  productSku: string;
  brand: string;
  brandId?: string;
  categoryId?: string;
  itemPrice: number;
  isAvailable?: boolean;
  availabilityText?: string;
  specifications?: Record<string, string>;
};

type ProductViewLike = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  brandId?: string;
  categoryId?: string;
  price: number;
  image: string;
  isAvailable?: boolean;
  availabilityText?: string;
};

type GridProduct = CatalogCardProduct | ProductViewLike;

type Props = {
  products: GridProduct[];
  emptyText?: string;
  viewMode: CatalogViewMode;
  onViewModeChange: (mode: CatalogViewMode) => void;
  sortMode: CatalogSortMode;
  onSortModeChange: (mode: CatalogSortMode) => void;
  itemLinkState?: unknown;
  total?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  categoryFilters?: React.ReactNode;
  heroImageUrl?: string;
};

type CartPhase = 'idle' | 'launch' | 'drop' | 'exit' | 'enter' | 'done';

function getProductId(product: GridProduct) {
  return '_id' in product ? product._id : product.id;
}

function getProductName(product: GridProduct) {
  return '_id' in product ? product.itemName : product.name;
}

function getProductImage(product: GridProduct) {
  return '_id' in product ? product.itemImage : product.image;
}

function getProductSku(product: GridProduct) {
  return '_id' in product ? product.productSku : product.sku;
}

function getProductPrice(product: GridProduct) {
  return '_id' in product ? product.itemPrice : product.price;
}

function getProductSlug(product: GridProduct) {
  return '_id' in product ? product.productSlug : product.slug;
}

function getProductUrl(product: GridProduct) {
  const slug = getProductSlug(product);
  return slug ? `/product/${slug}` : `/product/${getProductId(product)}`;
}

function getProductLinkProps(product: GridProduct, itemLinkState?: unknown) {
  return {
    to: getProductUrl(product),
    state: itemLinkState,
  };
}

function getProductAvailability(product: GridProduct) {
  const isAvailable =
    typeof product.isAvailable === 'boolean' ? product.isAvailable : true;

  const availabilityText =
    typeof product.availabilityText === 'string' && product.availabilityText.trim()
      ? product.availabilityText.trim()
      : isAvailable
        ? 'Есть в наличии'
        : 'Нет в наличии';

  return {
    isAvailable,
    availabilityText,
  };
}

function getAvailabilityClasses(isAvailable: boolean) {
  return isAvailable ? 'text-[#46a122]' : 'text-[#c43d2f]';
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

function formatProductPrice(price: number) {
  return price > 0 ? `${price.toLocaleString('ru-RU')} ₽/шт` : 'По запросу';
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
  img.loading = 'eager';
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

export function ProductGrid({
  products,
  emptyText = 'Нет товаров',
  viewMode,
  onViewModeChange,
  sortMode,
  onSortModeChange,
  itemLinkState,
  total,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  categoryFilters,
  heroImageUrl,
}: Props) {
  if (!products.length) {
    return (
      <div className="py-16 text-center font-paragraph text-steel-gray">
        {emptyText}
      </div>
    );
  }

  return (
    <div>
      {heroImageUrl && (
        <div className="relative overflow-hidden bg-[#0b1220] text-white h-[200px] md:h-[260px] flex items-center mb-8">
          <div className="absolute inset-0">
            <img
              src={heroImageUrl}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain object-right"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1220] via-[#0b1220] to-transparent" />
          <div className="absolute inset-0 opacity-30 industrial-grid" />
        </div>
      )}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {categoryFilters}
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => onSortModeChange(e.target.value as CatalogSortMode)}
              className="h-12 min-w-[240px] appearance-none rounded-lg border border-primary/40 bg-white pl-4 pr-10 text-base text-graphite outline-none transition focus:border-primary"
            >
              <option value="default">По умолчанию</option>
              <option value="name_asc">По алфавиту (А-Я)</option>
              <option value="name_desc">По алфавиту (Я-А)</option>
              <option value="price_desc">По цене (сначала дороже)</option>
              <option value="price_asc">По цене (сначала дешевле)</option>
              <option value="availability_desc">Сначала в наличии</option>
              <option value="availability_asc">Сначала не в наличии</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite" />
          </div>
        </div>

        <div className="self-end lg:self-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`flex h-12 w-12 items-center justify-center rounded-lg border bg-[#f3f3f3] transition ${
                viewMode === 'grid'
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-[#d9dde3] text-graphite hover:border-primary/40 hover:bg-[#e9ecef]'
              }`}
              title="Плитка"
              aria-label="Плитка"
            >
              <Grid2x2 className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`flex h-12 w-12 items-center justify-center rounded-lg border bg-[#f3f3f3] transition ${
                viewMode === 'list'
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-[#d9dde3] text-graphite hover:border-primary/40 hover:bg-[#e9ecef]'
              }`}
              title="Расширенный список"
              aria-label="Расширенный список"
            >
              <Rows2 className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              className={`flex h-12 w-12 items-center justify-center rounded-lg border bg-[#f3f3f3] transition ${
                viewMode === 'compact'
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-[#d9dde3] text-graphite hover:border-primary/40 hover:bg-[#e9ecef]'
              }`}
              title="Компактный список"
              aria-label="Компактный список"
            >
              <Rows3 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {products.map((product) => {
            const key = getProductId(product);

            return (
              <ProductCard
                key={key}
                product={product}
                itemLinkState={itemLinkState as any}
              />
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-6">
          {products.map((product) => {
            const key = getProductId(product);

            return (
              <ProductWideRow
                key={key}
                product={product}
                itemLinkState={itemLinkState}
              />
            );
          })}
        </div>
      )}

      {viewMode === 'compact' && (
        <div className="space-y-4">
          {products.map((product) => {
            const key = getProductId(product);

            return (
              <ProductCompactRow
                key={key}
                product={product}
                itemLinkState={itemLinkState}
              />
            );
          })}
        </div>
      )}

      {hasMore && onLoadMore && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex h-12 items-center justify-center rounded-lg border border-primary bg-white px-8 font-paragraph font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? 'Загрузка...' : 'Показать еще'}
          </button>

          <div className="text-sm text-steel-gray">
            Показано {products.length} из {total || products.length}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductWideRow({
  product,
  itemLinkState,
}: {
  product: GridProduct;
  itemLinkState?: unknown;
}) {
  const favorites = useCatalogUI((s) => s.favorites);
  const compare = useCatalogUI((s) => s.compare);
  const toggleFavorite = useCatalogUI((s) => s.toggleFavorite);
  const toggleCompare = useCatalogUI((s) => s.toggleCompare);

  const id = getProductId(product);
  const linkProps = getProductLinkProps(product, itemLinkState);
  const name = getProductName(product);
  const image = getProductImage(product);
  const hasRealImage = hasRealProductImage(image);
  const sku = getProductSku(product);
  const price = getProductPrice(product);
  const { isAvailable, availabilityText } = getProductAvailability(product);

  const favoriteActive = favorites.includes(id);
  const compareActive = compare.includes(id);

  return (
    <div className="group border border-[#d9dde3] bg-white ring-1 ring-black/[0.03] transition-all duration-300 ease-out hover:border-primary hover:ring-primary/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)]">
      <div className="grid grid-cols-1 items-start gap-6 px-6 py-8 xl:grid-cols-[220px_1fr_220px_320px]">
        <Link {...linkProps} className="flex min-h-[220px] items-center justify-center overflow-hidden bg-white">
          {hasRealImage ? (
            <img
              src={image}
              alt={name}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1280px) 220px, 100vw"
              className="max-h-[220px] max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
              draggable={false}
            />
          ) : (
            <div className="h-[220px] w-full">
              <ProductImageFallback />
            </div>
          )}
        </Link>

        <div>
          <Link
            {...linkProps}
            className="font-heading text-[20px] leading-tight text-graphite transition-colors hover:text-primary md:text-[24px]"
          >
            {name}
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-[15px] text-steel-gray">
            <div className={getAvailabilityClasses(isAvailable)}>
              {isAvailable ? '✓ ' : ''}
              {availabilityText}
            </div>
            {sku && <div>Артикул: {sku}</div>}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#eceef2] pt-5 text-[16px]">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const willAdd = !favoriteActive;
                toggleFavorite(id);
                if (willAdd) animateFlyToHeader(e, image, '[data-favorites-icon]');
              }}
              className={`inline-flex items-center gap-3 rounded-lg border px-4 py-2 transition ${
                favoriteActive
                  ? 'border-red-500 bg-red-500 text-white'
                  : 'border-[#e6e9ee] text-steel-gray hover:border-red-300 hover:text-red-500'
              }`}
            >
              <Heart className={`h-5 w-5 ${favoriteActive ? 'fill-current' : ''}`} />
              <span>{favoriteActive ? 'В избранном' : 'Отложить'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const willAdd = !compareActive;
                toggleCompare(id);
                if (willAdd) animateFlyToHeader(e, image, '[data-compare-icon]');
              }}
              className={`inline-flex items-center gap-3 rounded-lg border px-4 py-2 transition ${
                compareActive
                  ? 'border-primary bg-primary text-white'
                  : 'border-[#e6e9ee] text-steel-gray hover:border-primary/40 hover:text-primary'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span>{compareActive ? 'В сравнении' : 'Сравнить'}</span>
            </button>
          </div>
        </div>

        <div className="text-left xl:text-center">
          <div className="font-heading text-[24px] text-graphite md:text-[32px]">
            {formatProductPrice(price)}
          </div>
        </div>

        <div className="flex justify-start xl:justify-end">
          <ProductListCart product={product} wide />
        </div>
      </div>
    </div>
  );
}

function ProductCompactRow({
  product,
  itemLinkState,
}: {
  product: GridProduct;
  itemLinkState?: unknown;
}) {
  const favorites = useCatalogUI((s) => s.favorites);
  const compare = useCatalogUI((s) => s.compare);
  const toggleFavorite = useCatalogUI((s) => s.toggleFavorite);
  const toggleCompare = useCatalogUI((s) => s.toggleCompare);

  const id = getProductId(product);
  const linkProps = getProductLinkProps(product, itemLinkState);
  const name = getProductName(product);
  const image = getProductImage(product);
  const hasRealImage = hasRealProductImage(image);
  const sku = getProductSku(product);
  const price = getProductPrice(product);
  const { isAvailable, availabilityText } = getProductAvailability(product);

  const favoriteActive = favorites.includes(id);
  const compareActive = compare.includes(id);

  return (
    <div className="group border border-[#d9dde3] bg-white ring-1 ring-black/[0.03] transition-all duration-300 ease-out hover:border-primary hover:ring-primary/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)]">
      <div className="grid grid-cols-1 items-center gap-6 px-6 py-8 xl:grid-cols-[90px_1fr_220px_320px_120px]">
        <Link {...linkProps} className="flex h-[90px] w-[90px] items-center justify-center overflow-hidden">
          {hasRealImage ? (
            <img
              src={image}
              alt={name}
              loading="lazy"
              decoding="async"
              sizes="90px"
              className="max-h-[90px] max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
              draggable={false}
            />
          ) : (
            <ProductImageFallback />
          )}
        </Link>

        <div>
          <Link
            {...linkProps}
            className="font-heading text-[18px] leading-tight text-graphite transition-colors hover:text-primary md:text-[20px]"
          >
            {name}
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-steel-gray">
            <div className={getAvailabilityClasses(isAvailable)}>
              {isAvailable ? '✓ ' : ''}
              {availabilityText}
            </div>
            {sku && <div>Артикул: {sku}</div>}
          </div>
        </div>

        <div className="font-heading text-[24px] text-graphite">
          {formatProductPrice(price)}
        </div>

        <ProductListCart product={product} />

        <div className="flex items-center justify-start gap-3 xl:justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const willAdd = !favoriteActive;
              toggleFavorite(id);
              if (willAdd) animateFlyToHeader(e, image, '[data-favorites-icon]');
            }}
            className={`flex h-11 w-11 items-center justify-center rounded-lg border transition ${
              favoriteActive
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-[#e6e9ee] text-steel-gray hover:border-red-300 hover:text-red-500'
            }`}
            title="Избранное"
          >
            <Heart className={`h-5 w-5 ${favoriteActive ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const willAdd = !compareActive;
              toggleCompare(id);
              if (willAdd) animateFlyToHeader(e, image, '[data-compare-icon]');
            }}
            className={`flex h-11 w-11 items-center justify-center rounded-lg border transition ${
              compareActive
                ? 'border-primary bg-primary text-white'
                : 'border-[#e6e9ee] text-steel-gray hover:border-primary/40 hover:text-primary'
            }`}
            title="Сравнение"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductListCart({
  product,
  wide = false,
}: {
  product: GridProduct;
  wide?: boolean;
}) {
  const cart = useCatalogUI((s) => s.cart);
  const addToCart = useCatalogUI((s) => s.addToCart);

  const id = getProductId(product);
  const image = getProductImage(product);

  const [qty, setQty] = useState(1);
  const [cartPhase, setCartPhase] = useState<CartPhase>('idle');
  const cartQuantity = cart.find((item) => item.productId === id)?.quantity ?? 0;

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

  const handleAddToCart = () => {
    if (
      cartPhase === 'launch' ||
      cartPhase === 'drop' ||
      cartPhase === 'exit' ||
      cartPhase === 'enter'
    ) {
      return;
    }

    addToCart(id, qty);

    setCartPhase('launch');
    pushTimeout(() => setCartPhase('drop'), 360);
    pushTimeout(() => setCartPhase('exit'), 980);
    pushTimeout(() => setCartPhase('enter'), 1460);
    pushTimeout(() => setCartPhase('done'), 1980);
  };

  return (
    <div className={`flex items-center gap-3 ${wide ? 'flex-wrap xl:flex-nowrap' : ''}`}>
      <div className="flex h-12 min-w-[110px] overflow-hidden rounded-lg border border-[#e6e9ee] bg-[#f6f7f9]">
        <button
          type="button"
          onClick={() => setQty((prev) => Math.max(prev - 1, 1))}
          className="flex h-12 w-10 items-center justify-center text-graphite transition-colors hover:bg-black/5"
          aria-label="Уменьшить количество"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex h-12 flex-1 items-center justify-center text-base font-medium text-graphite">
          {qty}
        </div>

        <button
          type="button"
          onClick={() => setQty((prev) => Math.min(prev + 1, 999))}
          className="flex h-12 w-10 items-center justify-center text-graphite transition-colors hover:bg-black/5"
          aria-label="Увеличить количество"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        className={`relative h-12 rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 ${
          wide ? 'min-w-[220px] px-6' : 'min-w-[140px] px-5'
        }`}
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
                  : 'opacity-0 scale-[0.2] -translate-y-1/2 duration-200'
            }`}
          >
            <img
              src={hasRealProductImage(image) ? image : '/placeholder.png'}
              alt=""
              loading="eager"
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
  );
}
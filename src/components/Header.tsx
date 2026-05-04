import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  Phone,
  Mail,
  User,
  ShoppingCart,
  Heart,
  BarChart3,
  LogOut,
  LayoutGrid,
  Wrench,
  Lightbulb,
  BadgeCheck,
  Handshake,
  Newspaper,
  Building2,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCatalogUI } from '@/store/catalog-ui-store';
import {
  customerLogout,
  getCurrentCustomer,
  subscribeCustomerAuthChange,
  type CustomerProfile,
} from '@/lib/customer-auth';
import { searchProducts, type ProductCard } from '@/lib/catalog-service';

function HeaderActionLink({
  to,
  icon,
  label,
  count,
  dataAttr,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  dataAttr?: 'compare' | 'favorites' | 'cart';
}) {
  const dataProps =
    dataAttr === 'compare'
      ? { 'data-compare-icon': true }
      : dataAttr === 'favorites'
        ? { 'data-favorites-icon': true }
        : dataAttr === 'cart'
          ? { 'data-cart-icon': true }
          : {};

  return (
    <Link
      to={to}
      {...dataProps}
      className="group relative hidden h-[82px] min-w-[90px] flex-col items-center justify-center rounded-xl border border-transparent bg-transparent text-graphite transition-all duration-200 hover:border-[#d8e0ec] hover:bg-[#f6f8fb] hover:shadow-[0_6px_18px_rgba(18,57,112,0.08)] lg:flex"
    >
      <div className="relative flex items-center justify-center">
        <div className="text-graphite/90 transition-colors duration-200 group-hover:text-primary">
          {icon}
        </div>

        {typeof count === 'number' && count > 0 && (
          <span className="absolute -right-3 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>

      <span className="mt-2 px-1 text-center text-[14px] font-medium leading-none text-steel-gray transition-colors duration-200 group-hover:text-graphite">
        {label}
      </span>
    </Link>
  );
}

function HeaderNavCardLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group hidden h-[82px] min-w-[86px] flex-col items-center justify-center rounded-xl border border-transparent bg-transparent px-2 text-graphite transition-all duration-200 hover:border-[#d8e0ec] hover:bg-[#f6f8fb] hover:shadow-[0_6px_18px_rgba(18,57,112,0.08)] xl:flex"
    >
      <div className="text-graphite/90 transition-colors duration-200 group-hover:text-primary">
        {icon}
      </div>

      <span className="mt-2 text-center text-[14px] font-medium leading-none text-steel-gray transition-colors duration-200 group-hover:text-graphite">
        {label}
      </span>
    </Link>
  );
}

function getCustomerDisplayLabel(customer: CustomerProfile | null): string {
  if (!customer?.email) return 'Кабинет';

  const email = customer.email.trim();
  if (!email) return 'Кабинет';

  const localPart = email.split('@')[0]?.trim();
  return localPart || 'Кабинет';
}

function normalizeSearchText(value: string): string {
  return String(value || '').trim();
}

function buildSearchPageUrl(query: string): string {
  const normalized = normalizeSearchText(query);
  if (!normalized) return '/search';

  const params = new URLSearchParams();
  params.set('q', normalized);

  return `/search?${params.toString()}`;
}

function HeaderSearchResultItem({
  product,
  from,
  onClick,
}: {
  product: ProductCard;
  from: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={`/product/${product.productSlug || product._id}`}
      state={{ from }}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-muted/60"
    >
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
        {product.itemImage ? (
          <img
            src={product.itemImage}
            alt={product.itemName}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-steel-gray">
            Нет фото
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-medium text-graphite">
          {product.itemName}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-steel-gray">
          {product.brand ? <span>{product.brand}</span> : null}
          {product.productSku ? <span>Арт: {product.productSku}</span> : null}
        </div>
      </div>
    </Link>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [mobileSearchValue, setMobileSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<ProductCard[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const mobileSearchRef = useRef<HTMLDivElement | null>(null);

  const favoritesCount = useCatalogUI((s) => s.favorites.length);
  const compareCount = useCatalogUI((s) => s.compare.length);
  const cartItemsCount = useCatalogUI((s) => s.getCartItemsCount());
  const cartUnitsCount = useCatalogUI((s) => s.getCartUnitsCount());

  const currentPathWithSearch = useMemo(() => {
    return `${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);

  const closeOverlays = () => {
    setIsMobileSearchOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    let active = true;

    async function loadCustomer() {
      try {
        const currentCustomer = await getCurrentCustomer();
        if (!active) return;
        setCustomer(currentCustomer);
      } catch (error) {
        console.error('Header auth load failed:', error);
        if (!active) return;
        setCustomer(null);
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    }

    loadCustomer();

    const unsubscribe = subscribeCustomerAuthChange(async () => {
      try {
        const currentCustomer = await getCurrentCustomer();
        if (!active) return;
        setCustomer(currentCustomer);
      } catch (error) {
        console.error('Header auth update failed:', error);
        if (!active) return;
        setCustomer(null);
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    closeOverlays();
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (mobileSearchRef.current && !mobileSearchRef.current.contains(target)) {
        setIsMobileSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const mobileQuery = useMemo(
    () => normalizeSearchText(mobileSearchValue),
    [mobileSearchValue]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (mobileQuery.length < 2) {
        if (!cancelled) {
          setSearchResults([]);
          setIsSearchLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) setIsSearchLoading(true);

        const result = await searchProducts({
          query: mobileQuery,
          limit: 6,
          sort: 'relevance',
        });

        if (cancelled) return;
        setSearchResults(result.items);
      } catch (error) {
        if (cancelled) return;
        console.error('Header search failed:', error);
        setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearchLoading(false);
      }
    };

    const timer = window.setTimeout(run, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mobileQuery]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await customerLogout();
      setCustomer(null);
      setMobileMenuOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Customer logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const accountLabel = isAuthLoading
    ? '...'
    : customer
      ? getCustomerDisplayLabel(customer)
      : 'Войти';

  const accountLink = customer ? '/account' : '/account-login';

  const handleMobileSearchSubmit = () => {
    const q = normalizeSearchText(mobileSearchValue);
    navigate(buildSearchPageUrl(q));
    closeOverlays();
  };

  const handleMobileSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleMobileSearchSubmit();
    }

    if (event.key === 'Escape') {
      setIsMobileSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-graphite/10 bg-white">
      <div className="hidden bg-graphite py-2.5 text-primary-foreground sm:block">
        <div className="mx-auto flex max-w-[120rem] flex-wrap items-center justify-between gap-3 px-4 sm:gap-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <a
              href="tel:+78126403996"
              className="flex items-center gap-2 transition-colors hover:text-secondary"
            >
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="font-paragraph text-xs sm:text-sm">
                +7 (812) 640-39-96
              </span>
            </a>

            <a
              href="mailto:info@cnc.su"
              className="flex items-center gap-2 transition-colors hover:text-secondary"
            >
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="font-paragraph text-xs sm:text-sm">
                info@cnc.su
              </span>
            </a>
          </div>

          <div className="hidden font-paragraph text-xs sm:text-sm md:block">
            г. Санкт-Петербург, ул. Заусадебная, д. 15, стр. 5
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[120rem] px-6 py-4 sm:px-8 sm:py-5 lg:px-12">
        <div className="flex items-center justify-between gap-6">
          <Link to="/" className="flex flex-shrink-0 items-center">
            <img
              src="/images/logo/logo.svg"
              alt="АВТОграф Инструментальные Решения"
              className="h-14 w-auto object-contain sm:h-16 lg:h-20"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 xl:flex 2xl:gap-3">
            <HeaderNavCardLink
              to="/catalog"
              icon={<LayoutGrid className="h-5 w-5" />}
              label="Каталог"
            />

            <HeaderNavCardLink
              to="/services"
              icon={<Wrench className="h-5 w-5" />}
              label="Услуги"
            />

            <HeaderNavCardLink
              to="/solutions"
              icon={<Lightbulb className="h-5 w-5" />}
              label="Решения"
            />

            <HeaderNavCardLink
              to="/brands"
              icon={<BadgeCheck className="h-5 w-5" />}
              label="Поставщики"
            />

            <HeaderNavCardLink
              to="/partners"
              icon={<Handshake className="h-5 w-5" />}
              label="Партнеры"
            />

            <HeaderNavCardLink
              to="/blog"
              icon={<Newspaper className="h-5 w-5" />}
              label="Блог"
            />

            <HeaderNavCardLink
              to="/about"
              icon={<Building2 className="h-5 w-5" />}
              label="О компании"
            />

            <HeaderNavCardLink
              to="/contacts"
              icon={<MapPin className="h-5 w-5" />}
              label="Контакты"
            />
          </nav>

          <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen((prev) => !prev);
                setMobileMenuOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-graphite transition hover:bg-[#f6f8fb] hover:text-primary lg:hidden"
              aria-label="Открыть поиск"
            >
              <Search className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <HeaderActionLink
              to="/search"
              icon={<Search className="h-5 w-5" />}
              label="Поиск по сайту"
            />

            <HeaderActionLink
              to="/compare"
              dataAttr="compare"
              icon={<BarChart3 className="h-5 w-5" />}
              label="Сравнение"
              count={compareCount}
            />

            <HeaderActionLink
              to="/favorites"
              dataAttr="favorites"
              icon={<Heart className="h-5 w-5" />}
              label="Избранное"
              count={favoritesCount}
            />
            
            <HeaderActionLink
              to="/cart"
              dataAttr="cart"
              icon={<ShoppingCart className="h-5 w-5" />}
              label={cartItemsCount > 0 ? 'В корзине' : 'Корзина'}
              count={cartUnitsCount}
            />

            <div className="hidden items-center gap-2 lg:flex">
              <Link
                to={accountLink}
                className="group relative flex h-[82px] min-w-[90px] flex-col items-center justify-center rounded-xl border border-transparent bg-transparent px-2 text-graphite transition-all duration-200 hover:border-[#d8e0ec] hover:bg-[#f6f8fb] hover:shadow-[0_6px_18px_rgba(18,57,112,0.08)]"
                title={customer?.email || 'Войти'}
              >
                <div className="text-graphite/90 transition-colors duration-200 group-hover:text-primary">
                  <User className="h-5 w-5" />
                </div>
                <span className="mt-2 max-w-[96px] truncate px-1 text-center text-[14px] font-medium leading-none text-graphite transition-colors duration-200">
                  {accountLabel}
                </span>
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center text-graphite sm:h-11 sm:w-11 lg:hidden"
              aria-label="Открыть меню"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileSearchOpen && (
            <motion.div
              ref={mobileSearchRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden border-t border-background pt-4 lg:hidden"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-gray" />

                <input
                  type="text"
                  value={mobileSearchValue}
                  onChange={(e) => setMobileSearchValue(e.target.value)}
                  onFocus={() => {
                    if (mobileQuery.length >= 2 || searchResults.length > 0) {
                      setIsMobileSearchOpen(true);
                    }
                  }}
                  onKeyDown={handleMobileSearchKeyDown}
                  placeholder="Поиск по каталогу"
                  className="h-12 w-full rounded-2xl border border-border bg-[#f8fafc] pl-12 pr-24 text-[15px] text-graphite outline-none transition focus:border-primary focus:bg-white"
                />

                <button
                  type="button"
                  onClick={handleMobileSearchSubmit}
                  className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary/90"
                >
                  Найти
                </button>
              </div>

              {mobileQuery.length >= 2 ? (
                <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-white">
                  {isSearchLoading ? (
                    <div className="px-4 py-5 text-sm text-steel-gray">
                      Идет поиск...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="p-2">
                        {searchResults.map((product) => (
                          <HeaderSearchResultItem
                            key={product._id}
                            product={product}
                            from={currentPathWithSearch}
                            onClick={closeOverlays}
                          />
                        ))}
                      </div>

                      <div className="border-t border-border p-3">
                        <button
                          type="button"
                          onClick={handleMobileSearchSubmit}
                          className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-medium text-graphite transition hover:bg-muted/80"
                        >
                          Показать все результаты
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-5 text-sm text-steel-gray">
                      Ничего не найдено. Попробуйте артикул, бренд или часть названия.
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 border-t border-background pb-4 pt-4 lg:hidden"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    to="/search"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Поиск
                  </Link>

                  <Link
                    to="/compare"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Сравнение ({compareCount})
                  </Link>

                  <Link
                    to="/favorites"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Избранное ({favoritesCount})
                  </Link>

                  <Link
                    to="/cart"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Корзина ({cartUnitsCount})
                  </Link>
                </div>

                <nav className="flex flex-col gap-3">
                  <Link
                    to="/catalog"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Каталог
                  </Link>

                  <Link
                    to="/services"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Услуги
                  </Link>

                  <Link
                    to="/solutions"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Решения
                  </Link>

                  <Link
                    to="/brands"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Бренды
                  </Link>

                  <Link
                    to="/partners"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Партнеры
                  </Link>

                  <Link
                    to="/blog"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Блог
                  </Link>

                  <Link
                    to="/about"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    О компании
                  </Link>

                  <Link
                    to="/contacts"
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    Контакты
                  </Link>

                  <Link
                    to={accountLink}
                    className="font-paragraph text-sm text-graphite transition-colors hover:text-primary"
                    onClick={closeOverlays}
                  >
                    {customer ? `Кабинет (${customer.email})` : 'Личный кабинет'}
                  </Link>

                  {customer && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-2 font-paragraph text-left text-sm text-graphite transition-colors hover:text-primary"
                    >
                      <LogOut className="h-4 w-4" />
                      {isLoggingOut ? 'Выход...' : 'Выйти'}
                    </button>
                  )}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
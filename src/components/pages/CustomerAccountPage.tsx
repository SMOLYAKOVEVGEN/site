import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Heart,
  Landmark,
  LandmarkIcon,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Truck,
  University,
  User,
  UserRoundCog,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCatalogUI } from '@/store/catalog-ui-store';
import { getProductsByIds, type ProductView } from '@/lib/catalog-service';
import {
  getCurrentCustomer,
  customerLogout,
  updateCustomerPassword,
  type CustomerType,
} from '@/lib/customer-auth';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAccountOverview,
  getCustomerProfile,
  updateCustomerAddress,
  upsertCustomerProfile,
  type CustomerOrderRow,
  type CustomerOrderItemRow,
  type CustomerOrderDocumentRow,
  type CustomerSavedAddressRow,
} from '@/lib/customer-account-service';
import { supabase } from '@/lib/supabase';
import { usePageMeta } from '@/lib/use-page-meta';

type AccountSection =
  | 'overview'
  | 'orders'
  | 'purchased'
  | 'favorites'
  | 'compare'
  | 'documents'
  | 'addresses'
  | 'profile';

type PurchasedItem = {
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  total_quantity: number;
  last_ordered_at: string;
};

type OrderWithItems = {
  order: CustomerOrderRow;
  items: CustomerOrderItemRow[];
};

type DashboardNotification = {
  id: string;
  title: string;
  text: string;
  tone: 'neutral' | 'success' | 'warning';
};

type AccountDocument = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  amount: number;
  createdAt: string;
};

function formatPrice(value: number): string {
  if (!value || value <= 0) return 'По запросу';
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function formatDate(value: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(value: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOrderStatusLabel(status: string): string {
  switch (status) {
    case 'new':
      return 'Новый';
    case 'in_progress':
      return 'В обработке';
    case 'paid':
      return 'Оплачен';
    case 'completed':
      return 'Завершен';
    case 'cancelled':
      return 'Отменен';
    default:
      return status || '—';
  }
}

function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Ожидает оплаты';
    case 'paid':
      return 'Оплачено';
    case 'failed':
      return 'Ошибка оплаты';
    case 'refunded':
      return 'Возврат';
    default:
      return status || '—';
  }
}

function getDeliveryMethodLabel(order: CustomerOrderRow): string {
  switch (order.delivery_method) {
    case 'pickup':
      return order.pickup_branch
        ? `Самовывоз: ${order.pickup_branch}`
        : 'Самовывоз';
    case 'courier':
      return order.delivery_address
        ? `Курьер: ${order.delivery_address}`
        : 'Курьер';
    case 'transport_company': {
      const company =
        order.transport_company === 'other'
          ? order.transport_company_custom || 'Другая ТК'
          : order.transport_company || 'Транспортная компания';

      return order.delivery_address
        ? `${company}: ${order.delivery_address}`
        : company;
    }
    default:
      return '—';
  }
}

function getPaymentMethodLabel(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'invoice':
      return 'Счет для юридического лица';
    case 'card_online':
      return 'Оплата картой онлайн';
    case 'manager_confirmation':
      return 'Согласование с менеджером';
    default:
      return paymentMethod || '—';
  }
}

function getCustomerTypeLabel(customerType: CustomerType): string {
  return customerType === 'company' ? 'Юридическое лицо' : 'Физическое лицо';
}

function getOrderStatusTone(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'paid':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'in_progress':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-background text-steel-gray border-graphite/10';
  }
}

function getPaymentStatusTone(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'refunded':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-background text-steel-gray border-graphite/10';
  }
}

function normalizeForSearch(value: string): string {
  return value.trim().toLowerCase();
}

function getProfileCompletionPercent(args: {
  customerType: CustomerType;
  profileForm: {
    fullName: string;
    email: string;
    phone: string;
    company: string;
    fullCompanyName: string;
    comment: string;
    inn: string;
    kpp: string;
    ogrn: string;
    bankName: string;
    bik: string;
    checkingAccount: string;
    legalAddress: string;
    contactPerson: string;
  };
}): number {
  const { customerType, profileForm } = args;

  const baseFields = [
    profileForm.fullName,
    profileForm.email,
    profileForm.phone,
  ];

  const companyFields =
    customerType === 'company'
      ? [
          profileForm.fullCompanyName,
          profileForm.inn,
          profileForm.kpp,
          profileForm.ogrn,
          profileForm.bankName,
          profileForm.bik,
          profileForm.checkingAccount,
          profileForm.legalAddress,
          profileForm.contactPerson,
        ]
      : [];

  const fields = [...baseFields, ...companyFields];
  const filled = fields.filter((item) => item.trim()).length;

  return Math.round((filled / Math.max(fields.length, 1)) * 100);
}

export default function CustomerAccountPage() {
  usePageMeta({
    title: 'Профиль клиента',
    description: 'Личный кабинет клиента, заказы и данные профиля.',
  });
  const navigate = useNavigate();

  const favoriteIds = useCatalogUI((s) => s.favorites);
  const compareIds = useCatalogUI((s) => s.compare);
  const replaceCart = useCatalogUI((s) => s.replaceCart);
  const getCartUnitsCount = useCatalogUI((s) => s.getCartUnitsCount);

  const [section, setSection] = useState<AccountSection>('overview');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('individual');

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    fullCompanyName: '',
    comment: '',
    inn: '',
    kpp: '',
    ogrn: '',
    bankName: '',
    bik: '',
    checkingAccount: '',
    legalAddress: '',
    contactPerson: '',
  });

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<ProductView[]>([]);
  const [compareProducts, setCompareProducts] = useState<ProductView[]>([]);

  const [documents, setDocuments] = useState<CustomerOrderDocumentRow[]>([]);
  const [savedAddressRows, setSavedAddressRows] = useState<CustomerSavedAddressRow[]>([]);

  const [addressForm, setAddressForm] = useState({
    id: '',
    title: '',
    address: '',
    comment: '',
    isPrimary: false,
  });

  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isAddressDeleting, setIsAddressDeleting] = useState(false);
  const [addressSuccessMessage, setAddressSuccessMessage] = useState('');
  const [addressErrorMessage, setAddressErrorMessage] = useState('');
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);

  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isPurchasedLoading, setIsPurchasedLoading] = useState(false);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
  const [profileErrorMessage, setProfileErrorMessage] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | string>('all');
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const customer = await getCurrentCustomer();

        if (!active) return;

        if (!customer?.id) {
          setIsAuthorized(false);
          setIsBootLoading(false);
          return;
        }

        setIsAuthorized(true);
        setCustomerId(customer.id);
        setCustomerEmail(customer.email || '');
        setCustomerType(customer.customerType || 'individual');

        const profile = await getCustomerProfile(customer.id);

        if (!active) return;

        const resolvedCustomerType =
          profile?.customer_type || customer.customerType || 'individual';

        setCustomerType(resolvedCustomerType);

        setProfileForm({
          fullName: profile?.full_name || customer.fullName || '',
          email: profile?.email || customer.email || '',
          phone: profile?.phone || customer.phone || '',
          company:
            profile?.company_name ||
            profile?.company ||
            customer.companyName ||
            customer.company ||
            '',
          fullCompanyName:
            profile?.full_company_name ||
            customer.fullCompanyName ||
            profile?.company_name ||
            profile?.company ||
            customer.companyName ||
            customer.company ||
            '',
          comment: profile?.comment || customer.comment || '',
          inn: profile?.inn || customer.inn || '',
          kpp: profile?.kpp || customer.kpp || '',
          ogrn: profile?.ogrn || customer.ogrn || '',
          bankName: profile?.bank_name || customer.bankName || '',
          bik: profile?.bik || customer.bik || '',
          checkingAccount:
            profile?.checking_account || customer.checkingAccount || '',
          legalAddress: profile?.legal_address || customer.legalAddress || '',
          contactPerson:
            profile?.contact_person ||
            customer.contactPerson ||
            customer.fullName ||
            '',
        });
      } catch (error) {
        console.error('Customer account bootstrap failed:', error);
        if (!active) return;
        setIsAuthorized(false);
      } finally {
        if (active) {
          setIsBootLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthorized || !customerId) return;

    let active = true;

    async function loadAccountOverview() {
      try {
        setIsOrdersLoading(true);
        setIsPurchasedLoading(true);

        const overview = await getCustomerAccountOverview();

        if (!active) return;

        const itemsByOrderId = new Map<string, CustomerOrderItemRow[]>();

        for (const item of overview.orderItems) {
          const current = itemsByOrderId.get(item.order_id) || [];
          current.push(item);
          itemsByOrderId.set(item.order_id, current);
        }

        const orderPairs: OrderWithItems[] = overview.orders.map((order) => ({
          order,
          items: itemsByOrderId.get(order.id) || [],
        }));

        setOrders(orderPairs);
        setPurchasedItems(overview.purchasedProducts);
        setDocuments(overview.documents);
        setSavedAddressRows(overview.savedAddresses);
      } catch (error) {
        console.error('Failed to load customer account overview:', error);
        if (!active) return;
        setOrders([]);
        setPurchasedItems([]);
        setDocuments([]);
        setSavedAddressRows([]);
      } finally {
        if (active) {
          setIsOrdersLoading(false);
          setIsPurchasedLoading(false);
        }
      }
    }

    loadAccountOverview();

    return () => {
      active = false;
    };
  }, [isAuthorized, customerId]);

  useEffect(() => {
    let active = true;

    async function loadFavorites() {
      if (!favoriteIds.length) {
        setFavoriteProducts([]);
        setIsFavoritesLoading(false);
        return;
      }

      try {
        setIsFavoritesLoading(true);

        const data = await getProductsByIds(favoriteIds);
        if (!active) return;

        const sorted = [...data].sort(
          (a, b) => favoriteIds.indexOf(a.id) - favoriteIds.indexOf(b.id)
        );

        setFavoriteProducts(sorted);
      } catch (error) {
        console.error('Failed to load favorite products:', error);
        if (!active) return;
        setFavoriteProducts([]);
      } finally {
        if (active) {
          setIsFavoritesLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      active = false;
    };
  }, [favoriteIds]);

  useEffect(() => {
    let active = true;

    async function loadCompare() {
      if (!compareIds.length) {
        setCompareProducts([]);
        setIsCompareLoading(false);
        return;
      }

      try {
        setIsCompareLoading(true);

        const data = await getProductsByIds(compareIds);
        if (!active) return;

        const sorted = [...data].sort(
          (a, b) => compareIds.indexOf(a.id) - compareIds.indexOf(b.id)
        );

        setCompareProducts(sorted);
      } catch (error) {
        console.error('Failed to load compare products:', error);
        if (!active) return;
        setCompareProducts([]);
      } finally {
        if (active) {
          setIsCompareLoading(false);
        }
      }
    }

    loadCompare();

    return () => {
      active = false;
    };
  }, [compareIds]);

  const cartUnitsCount = getCartUnitsCount();

  const accountStats = useMemo(() => {
    const activeOrdersCount = orders.filter(
      ({ order }) =>
        order.status === 'new' ||
        order.status === 'in_progress' ||
        order.status === 'paid'
    ).length;

    const pendingPaymentsCount = orders.filter(
      ({ order }) => order.payment_status === 'pending'
    ).length;

    const completedOrdersAmount = orders
      .filter(({ order }) => order.status === 'completed' || order.status === 'paid')
      .reduce((sum, { order }) => sum + (Number(order.total_amount) || 0), 0);

    const lastOrder = [...orders]
      .sort(
        (a, b) =>
          new Date(b.order.created_at).getTime() -
          new Date(a.order.created_at).getTime()
      )[0];

    return {
      orders: orders.length,
      activeOrders: activeOrdersCount,
      pendingPayments: pendingPaymentsCount,
      purchased: purchasedItems.length,
      favorites: favoriteProducts.length,
      compare: compareProducts.length,
      totalSpent: completedOrdersAmount,
      lastOrder,
      cartUnits: cartUnitsCount,
    };
  }, [orders, purchasedItems.length, favoriteProducts.length, compareProducts.length, cartUnitsCount]);

  const profileCompletionPercent = useMemo(() => {
    return getProfileCompletionPercent({
      customerType,
      profileForm,
    });
  }, [customerType, profileForm]);

  const dashboardNotifications = useMemo<DashboardNotification[]>(() => {
    const items: DashboardNotification[] = [];

    if (accountStats.pendingPayments > 0) {
      items.push({
        id: 'pending-payment',
        title: 'Есть заказы, ожидающие оплату',
        text: `Неоплаченных заказов: ${accountStats.pendingPayments}. Проверьте детали и завершите оплату.`,
        tone: 'warning',
      });
    }

    if (profileCompletionPercent < 100) {
      items.push({
        id: 'profile-incomplete',
        title: 'Профиль заполнен не полностью',
        text: `Заполненность профиля: ${profileCompletionPercent}%. Это влияет на скорость оформления заказов.`,
        tone: 'neutral',
      });
    }

    if (favoriteProducts.length > 0) {
      items.push({
        id: 'favorites-ready',
        title: 'У вас есть сохраненные товары',
        text: `В избранном ${favoriteProducts.length} позиций. Их можно быстро добавить в корзину или запросить повторно.`,
        tone: 'success',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'all-good',
        title: 'Все в порядке',
        text: 'Сейчас у вас нет важных уведомлений по заказам и профилю.',
        tone: 'success',
      });
    }

    return items;
  }, [
    accountStats.pendingPayments,
    favoriteProducts.length,
    profileCompletionPercent,
  ]);

  const savedAddresses = useMemo(() => {
    return savedAddressRows;
  }, [savedAddressRows]);

  const accountDocuments = useMemo<AccountDocument[]>(() => {
    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      subtitle: `Заказ № ${doc.order_id}`,
      status: doc.status,
      amount: Number(doc.amount) || 0,
      createdAt: doc.created_at,
    }));
  }, [documents]);

  const filteredOrders = useMemo(() => {
    const query = normalizeForSearch(orderSearch);

    return [...orders]
      .filter(({ order, items }) => {
        if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
          return false;
        }

        if (!query) return true;

        const haystack = [
          order.id,
          order.comment || '',
          getDeliveryMethodLabel(order),
          getPaymentMethodLabel(order.payment_method),
          ...items.map((item) => item.product_name),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.order.created_at).getTime() -
          new Date(a.order.created_at).getTime()
      );
  }, [orders, orderSearch, orderStatusFilter]);

  const recentPurchased = useMemo(() => {
    return [...purchasedItems]
      .sort(
        (a, b) =>
          new Date(b.last_ordered_at).getTime() -
          new Date(a.last_ordered_at).getTime()
      )
      .slice(0, 6);
  }, [purchasedItems]);

  const reloadAccountOverview = async () => {
    const overview = await getCustomerAccountOverview();

    const itemsByOrderId = new Map<string, CustomerOrderItemRow[]>();

    for (const item of overview.orderItems) {
      const current = itemsByOrderId.get(item.order_id) || [];
      current.push(item);
      itemsByOrderId.set(item.order_id, current);
    }

    const orderPairs: OrderWithItems[] = overview.orders.map((order) => ({
      order,
      items: itemsByOrderId.get(order.id) || [],
    }));

    setOrders(orderPairs);
    setPurchasedItems(overview.purchasedProducts);
    setDocuments(overview.documents);
    setSavedAddressRows(overview.savedAddresses);
  };

  const resetAddressForm = () => {
    setAddressForm({
      id: '',
      title: '',
      address: '',
      comment: '',
      isPrimary: false,
    });
    setAddressSuccessMessage('');
    setAddressErrorMessage('');
  };

  const handleOpenCreateAddress = () => {
    resetAddressForm();
    setIsAddressFormOpen(true);
  };

  const handleOpenEditAddress = (address: CustomerSavedAddressRow) => {
    setAddressForm({
      id: address.id,
      title: address.title || '',
      address: address.address || '',
      comment: address.comment || '',
      isPrimary: Boolean(address.is_primary),
    });
    setAddressSuccessMessage('');
    setAddressErrorMessage('');
    setIsAddressFormOpen(true);
  };

  const handleSaveAddress = async () => {
    try {
      setIsAddressSaving(true);
      setAddressSuccessMessage('');
      setAddressErrorMessage('');

      const title = addressForm.title.trim();
      const address = addressForm.address.trim();
      const comment = addressForm.comment.trim();

      if (!title) {
        throw new Error('Укажите название адреса');
      }

      if (!address) {
        throw new Error('Укажите адрес');
      }

      if (addressForm.id) {
        await updateCustomerAddress({
          id: addressForm.id,
          title,
          address,
          comment: comment || null,
          is_primary: addressForm.isPrimary,
        });
        setAddressSuccessMessage('Адрес обновлен.');
      } else {
        await createCustomerAddress({
          title,
          address,
          comment: comment || null,
          is_primary: addressForm.isPrimary,
        });
        setAddressSuccessMessage('Адрес добавлен.');
      }

      await reloadAccountOverview();
      resetAddressForm();
      setIsAddressFormOpen(false);
    } catch (error: any) {
      console.error('Address save failed:', error);
      setAddressErrorMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось сохранить адрес'
      );
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      setIsAddressDeleting(true);
      setAddressSuccessMessage('');
      setAddressErrorMessage('');

      await deleteCustomerAddress(addressId);
      await reloadAccountOverview();

      if (addressForm.id === addressId) {
        resetAddressForm();
        setIsAddressFormOpen(false);
      }

      setAddressSuccessMessage('Адрес удален.');
    } catch (error: any) {
      console.error('Address delete failed:', error);
      setAddressErrorMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось удалить адрес'
      );
    } finally {
      setIsAddressDeleting(false);
    }
  };

  const handleSetPrimaryAddress = async (address: CustomerSavedAddressRow) => {
    try {
      setIsAddressSaving(true);
      setAddressSuccessMessage('');
      setAddressErrorMessage('');

      await updateCustomerAddress({
        id: address.id,
        title: address.title,
        address: address.address,
        comment: address.comment || null,
        is_primary: true,
      });

      await reloadAccountOverview();
      setAddressSuccessMessage('Основной адрес обновлен.');
    } catch (error: any) {
      console.error('Primary address update failed:', error);
      setAddressErrorMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось обновить основной адрес'
      );
    } finally {
      setIsAddressSaving(false);
    }
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((item) => item !== orderId)
        : [...prev, orderId]
    );
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await customerLogout();
      navigate('/account-login', { replace: true });
    } catch (error) {
      console.error('Customer logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCustomerTypeChange = (nextType: CustomerType) => {
    setCustomerType(nextType);
    setProfileSuccessMessage('');
    setProfileErrorMessage('');

    if (nextType === 'individual') {
      setProfileForm((prev) => ({
        ...prev,
        fullName: prev.fullName || prev.contactPerson,
        company: '',
        fullCompanyName: '',
        inn: '',
        kpp: '',
        ogrn: '',
        bankName: '',
        bik: '',
        checkingAccount: '',
        legalAddress: '',
        contactPerson: '',
      }));
      return;
    }

    setProfileForm((prev) => ({
      ...prev,
      fullName: prev.fullName || prev.contactPerson,
      contactPerson: prev.contactPerson || prev.fullName,
      fullCompanyName: prev.fullCompanyName || prev.company,
      company: prev.company || prev.fullCompanyName,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      if (!customerId) {
        throw new Error('Пользователь не найден');
      }

      setIsProfileSaving(true);
      setProfileSuccessMessage('');
      setProfileErrorMessage('');

      const normalizedEmail = profileForm.email.trim();
      const normalizedFullName = profileForm.fullName.trim();
      const normalizedPhone = profileForm.phone.trim();
      const normalizedFullCompanyName = profileForm.fullCompanyName.trim();
      const normalizedComment = profileForm.comment.trim();
      const normalizedInn = profileForm.inn.trim();
      const normalizedKpp = profileForm.kpp.trim();
      const normalizedOgrn = profileForm.ogrn.trim();
      const normalizedBankName = profileForm.bankName.trim();
      const normalizedBik = profileForm.bik.trim();
      const normalizedCheckingAccount = profileForm.checkingAccount.trim();
      const normalizedLegalAddress = profileForm.legalAddress.trim();
      const normalizedContactPerson = profileForm.contactPerson.trim();

      if (!normalizedFullName) {
        throw new Error(
          customerType === 'company'
            ? 'Укажите контактное лицо'
            : 'Укажите имя'
        );
      }

      if (!normalizedPhone) {
        throw new Error('Укажите телефон');
      }

      if (customerType === 'company') {
        if (!normalizedFullCompanyName) {
          throw new Error('Укажите полное наименование организации');
        }

        if (!normalizedInn) {
          throw new Error('Укажите ИНН');
        }

        if (!normalizedKpp) {
          throw new Error('Укажите КПП');
        }

        if (!normalizedOgrn) {
          throw new Error('Укажите ОГРН');
        }

        if (!normalizedBankName) {
          throw new Error('Укажите банк');
        }

        if (!normalizedBik) {
          throw new Error('Укажите БИК');
        }

        if (!normalizedCheckingAccount) {
          throw new Error('Укажите расчетный счет');
        }

        if (!normalizedLegalAddress) {
          throw new Error('Укажите юридический адрес');
        }
      }

      if (normalizedEmail) {
        const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
        if (!emailIsValid) {
          throw new Error('Email заполнен некорректно');
        }
      }

      const resolvedFullName =
        customerType === 'company'
          ? normalizedContactPerson || normalizedFullName
          : normalizedFullName;

      const resolvedContactPerson =
        customerType === 'company'
          ? normalizedContactPerson || normalizedFullName
          : '';

      const resolvedCompany =
        customerType === 'company' ? normalizedFullCompanyName : '';

      const { error: authUpdateError } = await supabase.auth.updateUser({
        email: normalizedEmail || undefined,
        data: {
          customer_type: customerType,
          full_name: resolvedFullName,
          phone: normalizedPhone,
          company: resolvedCompany,
          comment: normalizedComment,
          company_name: customerType === 'company' ? resolvedCompany : '',
          full_company_name: customerType === 'company' ? resolvedCompany : '',
          inn: customerType === 'company' ? normalizedInn : '',
          kpp: customerType === 'company' ? normalizedKpp : '',
          ogrn: customerType === 'company' ? normalizedOgrn : '',
          bank_name: customerType === 'company' ? normalizedBankName : '',
          bik: customerType === 'company' ? normalizedBik : '',
          checking_account:
            customerType === 'company' ? normalizedCheckingAccount : '',
          legal_address:
            customerType === 'company' ? normalizedLegalAddress : '',
          contact_person: resolvedContactPerson,
        },
      });

      if (authUpdateError) {
        throw authUpdateError;
      }

      await upsertCustomerProfile({
        id: customerId,
        email: normalizedEmail || customerEmail || '',
        customer_type: customerType,
        full_name: resolvedFullName,
        phone: normalizedPhone,
        company: customerType === 'company' ? resolvedCompany : null,
        comment: normalizedComment,
        company_name: customerType === 'company' ? resolvedCompany : null,
        full_company_name:
          customerType === 'company' ? resolvedCompany : null,
        inn: customerType === 'company' ? normalizedInn : null,
        kpp: customerType === 'company' ? normalizedKpp : null,
        ogrn: customerType === 'company' ? normalizedOgrn : null,
        bank_name: customerType === 'company' ? normalizedBankName : null,
        bik: customerType === 'company' ? normalizedBik : null,
        checking_account:
          customerType === 'company' ? normalizedCheckingAccount : null,
        legal_address:
          customerType === 'company' ? normalizedLegalAddress : null,
        contact_person:
          customerType === 'company' ? resolvedContactPerson : null,
      });

      setCustomerEmail(normalizedEmail || customerEmail);

      setProfileForm((prev) => ({
        ...prev,
        fullName: resolvedFullName,
        email: normalizedEmail,
        phone: normalizedPhone,
        company: customerType === 'company' ? resolvedCompany : '',
        fullCompanyName: customerType === 'company' ? resolvedCompany : '',
        comment: normalizedComment,
        inn: customerType === 'company' ? normalizedInn : '',
        kpp: customerType === 'company' ? normalizedKpp : '',
        ogrn: customerType === 'company' ? normalizedOgrn : '',
        bankName: customerType === 'company' ? normalizedBankName : '',
        bik: customerType === 'company' ? normalizedBik : '',
        checkingAccount:
          customerType === 'company' ? normalizedCheckingAccount : '',
        legalAddress: customerType === 'company' ? normalizedLegalAddress : '',
        contactPerson: customerType === 'company' ? resolvedContactPerson : '',
      }));

      setProfileSuccessMessage('Данные учетной записи обновлены.');
      setProfileErrorMessage('');
    } catch (error: any) {
      console.error('Profile save failed:', error);
      setProfileErrorMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось сохранить данные'
      );
      setProfileSuccessMessage('');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsPasswordSaving(true);
      setPasswordSuccessMessage('');
      setPasswordErrorMessage('');

      const newPassword = passwordForm.newPassword.trim();
      const confirmPassword = passwordForm.confirmPassword.trim();

      if (!newPassword) {
        throw new Error('Введите новый пароль');
      }

      if (newPassword.length < 8) {
        throw new Error('Пароль должен содержать минимум 8 символов');
      }

      if (!confirmPassword) {
        throw new Error('Повторите новый пароль');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Пароли не совпадают');
      }

      await updateCustomerPassword(newPassword);

      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordSuccessMessage('Пароль успешно обновлен.');
      setPasswordErrorMessage('');
    } catch (error: any) {
      console.error('Password update failed:', error);
      setPasswordErrorMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось обновить пароль'
      );
      setPasswordSuccessMessage('');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleRepeatOrder = (items: CustomerOrderItemRow[]) => {
    const cart = items
      .filter((item) => item.product_id)
      .map((item) => ({
        productId: String(item.product_id),
        quantity: Number(item.quantity) || 1,
      }));

    if (!cart.length) return;

    replaceCart(cart);
    navigate('/cart');
  };

  const openProduct = (productId: string | null) => {
    if (!productId) return;
    navigate(`/product/${productId}`);
  };

  if (isBootLoading) {
    return (
      <div id="main" role="main" className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/account-login?redirect=/account" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-graphite text-primary-foreground py-14 sm:py-18">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <div className="text-sm text-white/70 mb-4">
            <Link to="/" className="hover:text-white transition-colors">
              Главная
            </Link>
            <span className="mx-2">/</span>
            <span>Личный кабинет</span>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-4">
                Личный кабинет
              </h1>
              <p className="text-white/70 max-w-3xl text-base sm:text-lg">
                Рабочее пространство клиента: заказы, документы, адреса, профиль,
                сохраненные товары и быстрые действия.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
              <HeroStatCard
                title="Заказы"
                value={String(accountStats.orders)}
                icon={<Package className="h-4 w-4" />}
              />
              <HeroStatCard
                title="Активные"
                value={String(accountStats.activeOrders)}
                icon={<Truck className="h-4 w-4" />}
              />
              <HeroStatCard
                title="Избранное"
                value={String(accountStats.favorites)}
                icon={<Heart className="h-4 w-4" />}
              />
              <HeroStatCard
                title="В корзине"
                value={String(accountStats.cartUnits)}
                icon={<ShoppingBag className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <div className="grid xl:grid-cols-[320px_1fr] gap-8">
            <aside className="space-y-6">
              <div className="border border-[#d9dde3] bg-white p-6 rounded-2xl">
                <div className="text-sm text-steel-gray mb-2">Пользователь</div>
                <div className="font-heading text-2xl text-graphite mb-1">
                  {profileForm.fullName || profileForm.contactPerson || 'Клиент'}
                </div>
                <div className="text-sm text-steel-gray break-all">
                  {profileForm.email || customerEmail || '—'}
                </div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-graphite/10 bg-background px-3 py-2 text-xs text-steel-gray">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span>{getCustomerTypeLabel(customerType)}</span>
                </div>

                <div className="mt-5 rounded-xl border border-graphite/10 bg-background p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm text-steel-gray">Профиль заполнен</div>
                    <div className="font-medium text-graphite">
                      {profileCompletionPercent}%
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-graphite/10 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${profileCompletionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <Button
                    type="button"
                    onClick={() => setSection('profile')}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <UserRoundCog className="mr-2 h-4 w-4" />
                    Настроить профиль
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLoggingOut ? 'Выход...' : 'Выйти'}
                  </Button>
                </div>
              </div>

              <div className="border border-[#d9dde3] bg-white rounded-2xl overflow-hidden">
                <SidebarButton
                  active={section === 'overview'}
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Обзор"
                  subtitle="Главная панель кабинета"
                  onClick={() => setSection('overview')}
                />
                <SidebarButton
                  active={section === 'orders'}
                  icon={<Package className="h-5 w-5" />}
                  title="Мои заказы"
                  subtitle={`${accountStats.orders} шт.`}
                  onClick={() => setSection('orders')}
                />
                <SidebarButton
                  active={section === 'documents'}
                  icon={<FileText className="h-5 w-5" />}
                  title="Документы"
                  subtitle={`${accountDocuments.length} записей`}
                  onClick={() => setSection('documents')}
                />
                <SidebarButton
                  active={section === 'addresses'}
                  icon={<MapPin className="h-5 w-5" />}
                  title="Адреса и доставка"
                  subtitle={`${savedAddresses.length} адресов`}
                  onClick={() => setSection('addresses')}
                />
                <SidebarButton
                  active={section === 'purchased'}
                  icon={<ShoppingBag className="h-5 w-5" />}
                  title="Купленные товары"
                  subtitle={`${accountStats.purchased} шт.`}
                  onClick={() => setSection('purchased')}
                />
                <SidebarButton
                  active={section === 'favorites'}
                  icon={<Heart className="h-5 w-5" />}
                  title="Избранное"
                  subtitle={`${accountStats.favorites} шт.`}
                  onClick={() => setSection('favorites')}
                />
                <SidebarButton
                  active={section === 'compare'}
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Сравнение"
                  subtitle={`${accountStats.compare} шт.`}
                  onClick={() => setSection('compare')}
                />
                <SidebarButton
                  active={section === 'profile'}
                  icon={<User className="h-5 w-5" />}
                  title="Учетная запись"
                  subtitle="Контакты и реквизиты"
                  onClick={() => setSection('profile')}
                  last
                />
              </div>
            </aside>

            <div className="space-y-8">
              {section === 'overview' && (
                <>
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <SummaryCard
                      title="Всего заказов"
                      value={String(accountStats.orders)}
                      description="История всех оформленных заказов"
                      icon={<Package className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Активные заказы"
                      value={String(accountStats.activeOrders)}
                      description="Новые, в обработке и оплаченные"
                      icon={<Truck className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Общая сумма"
                      value={formatPrice(accountStats.totalSpent)}
                      description="По завершенным и оплаченным заказам"
                      icon={<CreditCard className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Профиль"
                      value={`${profileCompletionPercent}%`}
                      description="Заполненность учетной записи"
                      icon={<UserRoundCog className="h-5 w-5" />}
                    />
                  </div>

                  <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6">
                    <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                      <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="font-heading text-3xl text-graphite">
                            Быстрые действия
                          </h2>
                          <p className="text-steel-gray mt-2">
                            Самые нужные действия для ежедневной работы с кабинетом.
                          </p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        <QuickActionCard
                          title="Открыть заказы"
                          text="Проверить статусы, состав и детали доставки"
                          icon={<Package className="h-5 w-5" />}
                          onClick={() => setSection('orders')}
                        />
                        <QuickActionCard
                          title="Документы"
                          text="Посмотреть документы и статусы оплат"
                          icon={<FileText className="h-5 w-5" />}
                          onClick={() => setSection('documents')}
                        />
                        <QuickActionCard
                          title="Профиль"
                          text="Обновить реквизиты и контактные данные"
                          icon={<User className="h-5 w-5" />}
                          onClick={() => setSection('profile')}
                        />
                        <QuickActionCard
                          title="Избранное"
                          text="Перейти к сохраненным товарам"
                          icon={<Heart className="h-5 w-5" />}
                          onClick={() => setSection('favorites')}
                        />
                        <QuickActionCard
                          title="Сравнение"
                          text="Открыть список сравнения товаров"
                          icon={<BarChart3 className="h-5 w-5" />}
                          onClick={() => setSection('compare')}
                        />
                        <QuickActionCard
                          title="В каталог"
                          text="Перейти к подбору новых товаров"
                          icon={<ArrowRight className="h-5 w-5" />}
                          onClick={() => navigate('/catalog')}
                        />
                      </div>
                    </div>

                    <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                      <div className="flex items-center gap-3 mb-6">
                        <Bell className="h-5 w-5 text-primary" />
                        <h2 className="font-heading text-2xl text-graphite">
                          Уведомления
                        </h2>
                      </div>

                      <div className="space-y-3">
                        {dashboardNotifications.map((item) => (
                          <NotificationCard
                            key={item.id}
                            title={item.title}
                            text={item.text}
                            tone={item.tone}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
                    <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                      <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="font-heading text-3xl text-graphite">
                            Последний заказ
                          </h2>
                          <p className="text-steel-gray mt-2">
                            Последняя активность по заказам клиента.
                          </p>
                        </div>

                        <Button variant="outline" onClick={() => setSection('orders')}>
                          Все заказы
                        </Button>
                      </div>

                      {!accountStats.lastOrder ? (
                        <EmptyState
                          title="Заказов пока нет"
                          text="После первого оформления здесь появится краткая информация по последнему заказу."
                        />
                      ) : (
                        <div className="rounded-2xl border border-graphite/10 p-5">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div>
                              <div className="font-heading text-2xl text-graphite">
                                Заказ № {accountStats.lastOrder.order.id}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-3">
                                <InfoBadge
                                  icon={<CalendarDays className="h-4 w-4" />}
                                  text={formatDateTime(
                                    accountStats.lastOrder.order.created_at
                                  )}
                                />
                                <StatusBadge
                                  text={getOrderStatusLabel(
                                    accountStats.lastOrder.order.status
                                  )}
                                  tone={getOrderStatusTone(
                                    accountStats.lastOrder.order.status
                                  )}
                                />
                                <StatusBadge
                                  text={getPaymentStatusLabel(
                                    accountStats.lastOrder.order.payment_status
                                  )}
                                  tone={getPaymentStatusTone(
                                    accountStats.lastOrder.order.payment_status
                                  )}
                                />
                              </div>
                            </div>

                            <div className="text-left lg:text-right">
                              <div className="text-sm text-steel-gray">Сумма</div>
                              <div className="font-heading text-2xl text-graphite">
                                {formatPrice(
                                  Number(accountStats.lastOrder.order.total_amount) || 0
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mt-6">
                            <DetailBlock
                              title="Доставка"
                              text={getDeliveryMethodLabel(accountStats.lastOrder.order)}
                            />
                            <DetailBlock
                              title="Оплата"
                              text={getPaymentMethodLabel(
                                accountStats.lastOrder.order.payment_method
                              )}
                            />
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3">
                            <Button
                              type="button"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              onClick={() =>
                                handleRepeatOrder(accountStats.lastOrder!.items)
                              }
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Повторить заказ
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSection('orders')}
                            >
                              Подробнее
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                      <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="font-heading text-2xl text-graphite">
                            Часто покупают
                          </h2>
                          <p className="text-steel-gray mt-2">
                            Последние и часто покупаемые позиции.
                          </p>
                        </div>
                      </div>

                      {isPurchasedLoading ? (
                        <div className="flex items-center justify-center py-20">
                          <LoadingSpinner />
                        </div>
                      ) : recentPurchased.length === 0 ? (
                        <EmptyState
                          title="Пока нет данных"
                          text="Здесь появятся товары после первых завершенных заказов."
                        />
                      ) : (
                        <div className="space-y-3">
                          {recentPurchased.map((item, index) => (
                            <div
                              key={`${item.product_id || item.product_name}-${index}`}
                              className="rounded-xl border border-graphite/10 p-4"
                            >
                              <div className="font-medium text-graphite">
                                {item.product_name}
                              </div>
                              <div className="text-sm text-steel-gray mt-1">
                                Куплено: {item.total_quantity} шт.
                              </div>
                              <div className="text-sm text-steel-gray mt-1">
                                Последний заказ: {formatDate(item.last_ordered_at)}
                              </div>

                              <div className="mt-3">
                                {item.product_id ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => openProduct(item.product_id)}
                                  >
                                    Открыть товар
                                  </Button>
                                ) : (
                                  <Button type="button" variant="outline" disabled>
                                    Товар недоступен
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {section === 'orders' && (
                <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                  <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-heading text-3xl text-graphite">
                        Мои заказы
                      </h2>
                      <p className="text-steel-gray mt-2">
                        История заказов с поиском, фильтрацией и быстрым повтором.
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-[1fr_220px] gap-3 w-full xl:w-auto xl:min-w-[560px]">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                        <Input
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          placeholder="Поиск по заказам и товарам"
                          className="pl-11"
                        />
                      </div>

                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="h-11 rounded-md border border-input bg-background px-4 text-sm text-graphite outline-none"
                      >
                        <option value="all">Все статусы</option>
                        <option value="new">Новый</option>
                        <option value="in_progress">В обработке</option>
                        <option value="paid">Оплачен</option>
                        <option value="completed">Завершен</option>
                        <option value="cancelled">Отменен</option>
                      </select>
                    </div>
                  </div>

                  {isOrdersLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <LoadingSpinner />
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <EmptyState
                      title="Ничего не найдено"
                      text={
                        orders.length === 0
                          ? 'После оформления заказа он появится в этом разделе.'
                          : 'По текущему фильтру и запросу заказов не найдено.'
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {filteredOrders.map(({ order, items }) => {
                        const isExpanded = expandedOrderIds.includes(order.id);

                        return (
                          <div
                            key={order.id}
                            className="rounded-2xl border border-graphite/10 overflow-hidden"
                          >
                            <div className="p-5 sm:p-6">
                              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                                <div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="font-heading text-xl text-graphite">
                                      Заказ № {order.id}
                                    </div>
                                    <StatusBadge
                                      text={getOrderStatusLabel(order.status)}
                                      tone={getOrderStatusTone(order.status)}
                                    />
                                    <StatusBadge
                                      text={getPaymentStatusLabel(order.payment_status)}
                                      tone={getPaymentStatusTone(order.payment_status)}
                                    />
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                                    <InfoBadge
                                      icon={<CalendarDays className="h-4 w-4" />}
                                      text={formatDateTime(order.created_at)}
                                    />
                                    <InfoBadge
                                      icon={<Truck className="h-4 w-4" />}
                                      text={getDeliveryMethodLabel(order)}
                                    />
                                  </div>
                                </div>

                                <div className="text-left xl:text-right">
                                  <div className="text-sm text-steel-gray">Сумма</div>
                                  <div className="font-heading text-2xl text-graphite">
                                    {formatPrice(order.total_amount)}
                                  </div>
                                  <div className="text-sm text-steel-gray mt-1">
                                    {items.length} поз.
                                  </div>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4 mt-6">
                                <DetailBlock
                                  title="Доставка"
                                  text={getDeliveryMethodLabel(order)}
                                />
                                <DetailBlock
                                  title="Оплата"
                                  text={getPaymentMethodLabel(order.payment_method)}
                                />
                              </div>

                              {order.comment ? (
                                <div className="mt-4 rounded-lg bg-background border border-graphite/10 px-4 py-3 text-sm text-graphite whitespace-pre-line">
                                  {order.comment}
                                </div>
                              ) : null}

                              <div className="mt-6 flex flex-wrap gap-3">
                                <Button
                                  type="button"
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                  onClick={() => handleRepeatOrder(items)}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Повторить заказ
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => toggleOrderExpanded(order.id)}
                                >
                                  {isExpanded ? 'Скрыть состав' : 'Показать состав'}
                                  <ChevronDown
                                    className={`ml-2 h-4 w-4 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                </Button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-graphite/10 bg-background/60 p-5 sm:p-6">
                                <div className="text-sm text-steel-gray mb-3">
                                  Состав заказа
                                </div>

                                <div className="space-y-3">
                                  {items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-graphite/10 bg-white px-4 py-4"
                                    >
                                      <div>
                                        <div className="font-medium text-graphite">
                                          {item.product_name}
                                        </div>
                                        <div className="text-sm text-steel-gray mt-1">
                                          Кол-во: {item.quantity}
                                        </div>
                                      </div>

                                      <div className="text-sm sm:text-right">
                                        <div className="text-steel-gray">
                                          Цена: {formatPrice(item.unit_price)}
                                        </div>
                                        <div className="font-medium text-graphite mt-1">
                                          Итого: {formatPrice(item.line_total)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {section === 'documents' && (
                <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-heading text-3xl text-graphite">
                        Документы
                      </h2>
                      <p className="text-steel-gray mt-2">
                        Централизованный список документов по заказам и оплатам.
                      </p>
                    </div>
                  </div>

                  {accountDocuments.length === 0 ? (
                    <EmptyState
                      title="Документов пока нет"
                      text="После появления заказов здесь будут отображаться счета и связанные документы."
                    />
                  ) : (
                    <div className="space-y-4">
                      {accountDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-2xl border border-graphite/10 p-5 sm:p-6"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div>
                              <div className="font-heading text-xl text-graphite">
                                {doc.title}
                              </div>
                              <div className="text-sm text-steel-gray mt-2">
                                {doc.subtitle}
                              </div>
                              <div className="text-sm text-steel-gray mt-2">
                                Дата: {formatDateTime(doc.createdAt)}
                              </div>
                            </div>

                            <div className="text-left lg:text-right">
                              <StatusBadge
                                text={doc.status}
                                tone={
                                  doc.status === 'Подтверждено'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }
                              />
                              <div className="font-heading text-2xl text-graphite mt-3">
                                {formatPrice(doc.amount)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <Button type="button" variant="outline" disabled>
                              Скачать документ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSection('orders')}
                            >
                              Перейти к заказу
                            </Button>
                          </div>

                          <div className="mt-4 rounded-lg border border-dashed border-graphite/15 bg-background px-4 py-3 text-sm text-steel-gray">
                            Сейчас блок документов собран на основе заказов. Когда
                            подключим файловое хранилище для счетов, УПД и PDF, сюда
                            просто добавится реальное скачивание.
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section === 'addresses' && (
                <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-heading text-3xl text-graphite">
                        Адреса и доставка
                      </h2>
                      <p className="text-steel-gray mt-2">
                        Используемые адреса и данные по способам доставки.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => setSection('profile')}>
                        Изменить реквизиты
                      </Button>
                    </div>
                  </div>

                  <div className="grid xl:grid-cols-[1fr_1fr] gap-6">
                    <div className="rounded-2xl border border-graphite/10 p-5 sm:p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="font-heading text-2xl text-graphite">
                          Сохраненные адреса
                        </h3>
                      </div>

                      {addressSuccessMessage && (
                        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                          {addressSuccessMessage}
                        </div>
                      )}

                      {addressErrorMessage && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {addressErrorMessage}
                        </div>
                      )}

                      {isAddressFormOpen && (
                        <div className="mb-6 rounded-xl border border-graphite/10 bg-background p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                              <div className="font-medium text-graphite">
                                {addressForm.id ? 'Редактирование адреса' : 'Новый адрес'}
                              </div>
                              <div className="text-sm text-steel-gray mt-1">
                                Сохраненный адрес доставки или реквизитный адрес.
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                resetAddressForm();
                                setIsAddressFormOpen(false);
                              }}
                            >
                              Отмена
                            </Button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-steel-gray mb-2">
                                Название
                              </label>
                              <Input
                                value={addressForm.title}
                                onChange={(e) =>
                                  setAddressForm((prev) => ({
                                    ...prev,
                                    title: e.target.value,
                                  }))
                                }
                                placeholder="Например: Основной склад"
                                disabled={isAddressSaving}
                              />
                            </div>

                            <div className="flex items-end">
                              <label className="inline-flex items-center gap-3 text-sm text-graphite">
                                <input
                                  type="checkbox"
                                  checked={addressForm.isPrimary}
                                  onChange={(e) =>
                                    setAddressForm((prev) => ({
                                      ...prev,
                                      isPrimary: e.target.checked,
                                    }))
                                  }
                                  disabled={isAddressSaving}
                                />
                                <span>Сделать основным адресом</span>
                              </label>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm text-steel-gray mb-2">
                                Адрес
                              </label>
                              <Textarea
                                value={addressForm.address}
                                onChange={(e) =>
                                  setAddressForm((prev) => ({
                                    ...prev,
                                    address: e.target.value,
                                  }))
                                }
                                placeholder="Введите полный адрес"
                                rows={3}
                                disabled={isAddressSaving}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm text-steel-gray mb-2">
                                Комментарий
                              </label>
                              <Textarea
                                value={addressForm.comment}
                                onChange={(e) =>
                                  setAddressForm((prev) => ({
                                    ...prev,
                                    comment: e.target.value,
                                  }))
                                }
                                placeholder="Дополнительная информация для доставки"
                                rows={2}
                                disabled={isAddressSaving}
                              />
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <Button
                              type="button"
                              onClick={handleSaveAddress}
                              disabled={isAddressSaving}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              {isAddressSaving ? 'Сохранение...' : 'Сохранить адрес'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {!isAddressFormOpen && (
                        <div className="mb-6">
                          <Button type="button" variant="outline" onClick={handleOpenCreateAddress}>
                            Добавить новый адрес
                          </Button>
                        </div>
                      )}

                      {savedAddresses.length === 0 ? (
                        <EmptyState
                          title="Адресов пока нет"
                          text="После заказов и заполнения профиля здесь появятся сохраненные адреса."
                        />
                      ) : (
                        <div className="space-y-3">
                          {savedAddresses.map((address, index) => (
                            <div
                              key={address.id}
                              className="rounded-xl border border-graphite/10 bg-background px-4 py-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-medium text-graphite">
                                  {address.title || (index === 0 ? 'Основной адрес' : `Адрес ${index + 1}`)}
                                </div>
                                <div className="text-xs text-steel-gray">
                                  {address.source === 'profile' ? 'Из профиля' : 'Из заказа'}
                                </div>
                              </div>

                              <div className="text-sm text-steel-gray mt-2 whitespace-pre-line">
                                {address.address}
                              </div>

                              {address.comment ? (
                                <div className="text-sm text-steel-gray mt-2 whitespace-pre-line">
                                  {address.comment}
                                </div>
                              ) : null}

                              <div className="mt-4 flex flex-wrap gap-2">
                                {!address.is_primary && address.source === 'profile' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleSetPrimaryAddress(address)}
                                    disabled={isAddressSaving}
                                  >
                                    Сделать основным
                                  </Button>
                                )}

                                {address.source === 'profile' && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => handleOpenEditAddress(address)}
                                    >
                                      Редактировать
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => handleDeleteAddress(address.id)}
                                      disabled={isAddressDeleting}
                                    >
                                      Удалить
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-graphite/10 p-5 sm:p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <Truck className="h-5 w-5 text-primary" />
                        <h3 className="font-heading text-2xl text-graphite">
                          Доставка и логистика
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <DetailBlock
                          title="Основной способ"
                          text={
                            orders[0]?.order
                              ? getDeliveryMethodLabel(orders[0].order)
                              : 'Будет определен после первого заказа'
                          }
                        />
                        <DetailBlock
                          title="Контактный телефон"
                          text={profileForm.phone || '—'}
                        />
                        <DetailBlock
                          title="Контактное лицо"
                          text={
                            customerType === 'company'
                              ? profileForm.contactPerson || profileForm.fullName || '—'
                              : profileForm.fullName || '—'
                          }
                        />
                        <DetailBlock
                          title="Комментарий"
                          text={
                            profileForm.comment ||
                            'Комментарий для логистики пока не заполнен'
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {section === 'purchased' && (
                <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-heading text-3xl text-graphite">
                        Купленные товары
                      </h2>
                      <p className="text-steel-gray mt-2">
                        Позиции из завершенных заказов, удобные для повторных закупок.
                      </p>
                    </div>
                  </div>

                  {isPurchasedLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <LoadingSpinner />
                    </div>
                  ) : purchasedItems.length === 0 ? (
                    <EmptyState
                      title="Купленных товаров пока нет"
                      text="После оформления заказов купленные позиции появятся в этом разделе."
                    />
                  ) : (
                    <div className="space-y-4">
                      {purchasedItems.map((item, index) => (
                        <div
                          key={`${item.product_id || item.product_name}-${index}`}
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-graphite/10 p-4"
                        >
                          <div>
                            <div className="font-medium text-graphite">
                              {item.product_name}
                            </div>
                            <div className="text-sm text-steel-gray mt-1">
                              Куплено: {item.total_quantity} шт.
                            </div>
                            <div className="text-sm text-steel-gray mt-1">
                              Последний заказ: {formatDate(item.last_ordered_at)}
                            </div>
                          </div>

                          {item.product_id ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openProduct(item.product_id)}
                            >
                              Открыть товар
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              Товар недоступен
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section === 'favorites' && (
                <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-heading text-3xl text-graphite">
                        Избранное
                      </h2>
                      <p className="text-steel-gray mt-2">
                        Сохраненные товары для быстрого возврата к подборке.
                      </p>
                    </div>

                    <Button variant="outline" onClick={() => navigate('/catalog')}>
                      Перейти в каталог
                    </Button>
                  </div>

                  {isFavoritesLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <LoadingSpinner />
                    </div>
                  ) : favoriteProducts.length === 0 ? (
                    <EmptyState
                      title="В избранном пока ничего нет"
                      text="Добавляйте товары в избранное, и они будут отображаться здесь."
                    />
                  ) : (
                    <ProductList products={favoriteProducts} />
                  )}
                </div>
              )}

              {section === 'compare' && (
                <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-heading text-3xl text-graphite">
                        Сравнение
                      </h2>
                      <p className="text-steel-gray mt-2">
                        Сравниваемые товары для выбора оптимальной позиции.
                      </p>
                    </div>
                  </div>

                  {isCompareLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <LoadingSpinner />
                    </div>
                  ) : compareProducts.length === 0 ? (
                    <EmptyState
                      title="Сравнение пустое"
                      text="Добавляйте товары в сравнение, и они будут отображаться здесь."
                    />
                  ) : (
                    <ProductList products={compareProducts} />
                  )}
                </div>
              )}

              {section === 'profile' && (
                <div className="border border-[#d9dde3] bg-white p-6 sm:p-8 rounded-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-heading text-3xl text-graphite">
                        Учетная запись
                      </h2>
                      <p className="text-steel-gray mt-2">
                        Контакты, реквизиты и данные клиента для быстрого оформления заказов.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isProfileSaving}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isProfileSaving ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-graphite/10 bg-background p-5 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="font-medium text-graphite">
                          Статус профиля
                        </div>
                        <div className="text-sm text-steel-gray mt-1">
                          Заполненность профиля: {profileCompletionPercent}%
                        </div>
                      </div>

                      <div className="w-full lg:w-80">
                        <div className="h-2 rounded-full bg-graphite/10 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${profileCompletionPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="text-sm text-steel-gray">Тип аккаунта</div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleCustomerTypeChange('individual')}
                        disabled={isProfileSaving}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          customerType === 'individual'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-graphite/10 bg-white text-steel-gray hover:border-graphite/20 hover:text-graphite'
                        }`}
                      >
                        Физическое лицо
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCustomerTypeChange('company')}
                        disabled={isProfileSaving}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          customerType === 'company'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-graphite/10 bg-white text-steel-gray hover:border-graphite/20 hover:text-graphite'
                        }`}
                      >
                        Юридическое лицо
                      </button>
                    </div>

                    <div className="rounded-lg border border-graphite/10 bg-white px-4 py-3 text-sm text-steel-gray">
                      Текущий тип профиля:{' '}
                      <span className="font-medium text-graphite">
                        {getCustomerTypeLabel(customerType)}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-steel-gray mb-2">
                        {customerType === 'company' ? 'Контактное лицо' : 'Имя'}
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                        <Input
                          value={profileForm.fullName}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              fullName: e.target.value,
                              contactPerson:
                                customerType === 'company'
                                  ? e.target.value
                                  : prev.contactPerson,
                            }))
                          }
                          placeholder={
                            customerType === 'company'
                              ? 'Введите контактное лицо'
                              : 'Введите имя'
                          }
                          className="pl-11"
                          disabled={isProfileSaving}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-steel-gray mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                        <Input
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="Введите email"
                          className="pl-11"
                          disabled={isProfileSaving}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-steel-gray mb-2">
                        Телефон
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                        <Input
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="Введите телефон"
                          className="pl-11"
                          disabled={isProfileSaving}
                        />
                      </div>
                    </div>

                    {customerType === 'company' ? (
                      <div>
                        <label className="block text-sm text-steel-gray mb-2">
                          Полное наименование организации
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                          <Input
                            value={profileForm.fullCompanyName}
                            onChange={(e) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                fullCompanyName: e.target.value,
                                company: e.target.value,
                              }))
                            }
                            placeholder="Введите полное наименование организации"
                            className="pl-11"
                            disabled={isProfileSaving}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {customerType === 'company' && (
                    <div className="mt-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-heading text-xl text-graphite">
                          Реквизиты юридического лица
                        </h3>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-steel-gray mb-2">
                            ИНН
                          </label>
                          <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              value={profileForm.inn}
                              onChange={(e) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  inn: e.target.value,
                                }))
                              }
                              placeholder="Введите ИНН"
                              className="pl-11"
                              disabled={isProfileSaving}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-steel-gray mb-2">
                            КПП
                          </label>
                          <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              value={profileForm.kpp}
                              onChange={(e) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  kpp: e.target.value,
                                }))
                              }
                              placeholder="Введите КПП"
                              className="pl-11"
                              disabled={isProfileSaving}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-steel-gray mb-2">
                            ОГРН
                          </label>
                          <div className="relative">
                            <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              value={profileForm.ogrn}
                              onChange={(e) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  ogrn: e.target.value,
                                }))
                              }
                              placeholder="Введите ОГРН"
                              className="pl-11"
                              disabled={isProfileSaving}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-steel-gray mb-2">
                            Контактное лицо
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              value={profileForm.contactPerson}
                              onChange={(e) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  contactPerson: e.target.value,
                                  fullName: e.target.value,
                                }))
                              }
                              placeholder="Введите контактное лицо"
                              className="pl-11"
                              disabled={isProfileSaving}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-steel-gray mb-2">
                            Банк
                          </label>
                          <div className="relative">
                            <University className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              value={profileForm.bankName}
                              onChange={(e) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  bankName: e.target.value,
                                }))
                              }
                              placeholder="Введите наименование банка"
                              className="pl-11"
                              disabled={isProfileSaving}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-steel-gray mb-2">
                            БИК
                          </label>
                          <div className="relative">
                            <LandmarkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              value={profileForm.bik}
                              onChange={(e) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  bik: e.target.value,
                                }))
                              }
                              placeholder="Введите БИК"
                              className="pl-11"
                              disabled={isProfileSaving}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm text-steel-gray mb-2">
                            Расчетный счет
                          </label>
                          <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              value={profileForm.checkingAccount}
                              onChange={(e) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  checkingAccount: e.target.value,
                                }))
                              }
                              placeholder="Введите расчетный счет"
                              className="pl-11"
                              disabled={isProfileSaving}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-steel-gray mb-2">
                          Юридический адрес
                        </label>
                        <Textarea
                          value={profileForm.legalAddress}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              legalAddress: e.target.value,
                            }))
                          }
                          placeholder="Введите юридический адрес"
                          rows={3}
                          disabled={isProfileSaving}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <label className="block text-sm text-steel-gray mb-2">
                      Комментарий
                    </label>
                    <Textarea
                      value={profileForm.comment}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          comment: e.target.value,
                        }))
                      }
                      placeholder="Дополнительная информация"
                      rows={4}
                      disabled={isProfileSaving}
                    />
                  </div>

                  <div className="mt-8 rounded-2xl border border-graphite/10 bg-background p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <Lock className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-heading text-xl text-graphite">
                          Смена пароля
                        </h3>
                        <p className="text-sm text-steel-gray mt-1">
                          Используйте пароль не короче 8 символов.
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-steel-gray mb-2">
                          Новый пароль
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                newPassword: e.target.value,
                              }))
                            }
                            placeholder="Введите новый пароль"
                            className="pl-11 pr-11"
                            disabled={isPasswordSaving}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-gray hover:text-graphite transition-colors"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-steel-gray mb-2">
                          Повторите новый пароль
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                confirmPassword: e.target.value,
                              }))
                            }
                            placeholder="Повторите новый пароль"
                            className="pl-11 pr-11"
                            disabled={isPasswordSaving}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-gray hover:text-graphite transition-colors"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={isPasswordSaving}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        {isPasswordSaving ? 'Обновление...' : 'Обновить пароль'}
                      </Button>
                    </div>

                    {passwordSuccessMessage && (
                      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {passwordSuccessMessage}
                      </div>
                    )}

                    {passwordErrorMessage && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {passwordErrorMessage}
                      </div>
                    )}
                  </div>

                  {profileSuccessMessage && (
                    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {profileSuccessMessage}
                    </div>
                  )}

                  {profileErrorMessage && (
                    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {profileErrorMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function HeroStatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-white/70">{title}</div>
        <div className="text-white/70">{icon}</div>
      </div>
      <div className="font-heading text-2xl text-white mt-2">{value}</div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#d9dde3] bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-sm text-steel-gray">{title}</div>
        <div className="text-primary">{icon}</div>
      </div>
      <div className="font-heading text-3xl text-graphite">{value}</div>
      <div className="text-sm text-steel-gray mt-2">{description}</div>
    </div>
  );
}

function QuickActionCard({
  title,
  text,
  icon,
  onClick,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-graphite/10 bg-background p-5 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-primary">{icon}</div>
        <ArrowRight className="h-4 w-4 text-steel-gray" />
      </div>
      <div className="font-medium text-graphite mt-4">{title}</div>
      <div className="text-sm text-steel-gray mt-2">{text}</div>
    </button>
  );
}

function NotificationCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: 'neutral' | 'success' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-green-200 bg-green-50'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : 'border-graphite/10 bg-background';

  return (
    <div className={`rounded-xl border px-4 py-4 ${toneClass}`}>
      <div className="font-medium text-graphite">{title}</div>
      <div className="text-sm text-steel-gray mt-2">{text}</div>
    </div>
  );
}

function SidebarButton({
  active,
  icon,
  title,
  subtitle,
  onClick,
  last = false,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-4 px-4 py-4 text-left transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-background text-graphite'
      } ${last ? '' : 'border-b border-graphite/10'}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div>{icon}</div>
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-sm text-steel-gray truncate">{subtitle}</div>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0" />
    </button>
  );
}

function StatusBadge({
  text,
  tone,
}: {
  text: string;
  tone: string;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${tone}`}
    >
      {text}
    </div>
  );
}

function InfoBadge({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-graphite/10 bg-background px-3 py-2 text-sm text-steel-gray">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function DetailBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-graphite/10 bg-background px-4 py-4">
      <div className="mb-2 text-sm text-steel-gray">{title}</div>
      <div className="text-graphite">{text || '—'}</div>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="py-16 text-center">
      <div className="mb-4 font-heading text-2xl text-graphite">{title}</div>
      <div className="mx-auto max-w-2xl text-steel-gray">{text}</div>
    </div>
  );
}

function ProductList({
  products,
}: {
  products: ProductView[];
}) {
  return (
    <div className="space-y-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex flex-col gap-4 rounded-2xl border border-graphite/10 p-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-graphite/10 bg-background flex items-center justify-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : null}
            </div>

            <div>
              <div className="font-medium text-graphite">{product.name}</div>
              <div className="mt-1 text-sm text-steel-gray">
                {product.brand || '—'}
              </div>
              <div className="mt-1 text-sm text-steel-gray">
                Артикул: {product.sku || '—'}
              </div>
              <div className="mt-2 font-medium text-graphite">
                {formatPrice(product.price)}
              </div>
            </div>
          </div>

          <Link to={`/product/${product.id}`}>
            <Button variant="outline">Открыть товар</Button>
          </Link>
        </div>
      ))}
    </div>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Truck,
  User,
  FileText,
  Building2,
  Landmark,
  Info,
  PackageCheck,
  University,
  LandmarkIcon,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCatalogUI } from '@/store/catalog-ui-store';
import { getProductsByIds, type ProductView } from '@/lib/catalog-service';
import { createLead } from '@/lib/lead-service';
import { getCurrentCustomer, type CustomerType } from '@/lib/customer-auth';
import {
  createCustomerOrder,
  upsertCustomerProfile,
  getCustomerProfile,
  type CustomerPaymentMethod,
} from '@/lib/customer-account-service';
import { usePageMeta } from '@/lib/use-page-meta';

type CheckoutProductRow = ProductView & {
  cartQuantity: number;
};

type DeliveryMethod = 'pickup' | 'courier' | 'transport_company';

type PickupBranch = 'spb' | 'ekb' | 'kazan' | 'krasnodar';
type TransportCompany =
  | 'delovye_linii'
  | 'cdek'
  | 'pek'
  | 'kit'
  | 'jde'
  | 'baikal'
  | 'other';

const PICKUP_BRANCH_OPTIONS: Array<{
  value: PickupBranch;
  label: string;
}> = [
  {
    value: 'spb',
    label: 'Санкт-Петербург, ул. Заусадебная, д. 15, стр. 5',
  },
  {
    value: 'ekb',
    label: 'Екатеринбург, ул. Академика Вонсовского, д. 1-А',
  },
  {
    value: 'kazan',
    label: 'Казань, ул. Михаила Миля, д. 33-А',
  },
  {
    value: 'krasnodar',
    label: 'Краснодар, ул. Шевченко, 152/2',
  },
];

const TRANSPORT_COMPANY_OPTIONS: Array<{
  value: TransportCompany;
  label: string;
}> = [
  { value: 'delovye_linii', label: 'Деловые Линии' },
  { value: 'cdek', label: 'СДЭК' },
  { value: 'pek', label: 'ПЭК' },
  { value: 'kit', label: 'КИТ' },
  { value: 'jde', label: 'ЖелДорЭкспедиция' },
  { value: 'baikal', label: 'Байкал Сервис' },
  { value: 'other', label: 'Другая' },
];

function getPickupBranchLabel(value: PickupBranch): string {
  return PICKUP_BRANCH_OPTIONS.find((item) => item.value === value)?.label || '';
}

function getTransportCompanyLabel(
  value: TransportCompany,
  customName: string
): string {
  if (value === 'other') {
    return customName.trim() || 'Другая';
  }

  return (
    TRANSPORT_COMPANY_OPTIONS.find((item) => item.value === value)?.label || ''
  );
}

function getCustomerTypeLabel(customerType: CustomerType): string {
  return customerType === 'company' ? 'Юридическое лицо' : 'Физическое лицо';
}

function getPaymentMethodLabel(
  paymentMethod: CustomerPaymentMethod,
  customerType: CustomerType
): string {
  if (paymentMethod === 'invoice') {
    return customerType === 'company'
      ? 'Безналичный расчет для юридического лица'
      : 'Счет / согласование с менеджером';
  }

  if (paymentMethod === 'card_online') {
    return 'Оплата картой онлайн';
  }

  return 'Согласование с менеджером';
}

export default function CheckoutPage() {
  usePageMeta({
    title: 'Оформление заказа',
    description: 'Оформление заказа и ввод контактных данных покупателя.',
  });
  const cart = useCatalogUI((s) => s.cart);
  const clearCart = useCatalogUI((s) => s.clearCart);
  const syncCartWithExistingIds = useCatalogUI((s) => s.syncCartWithExistingIds);

  const [baseProducts, setBaseProducts] = useState<ProductView[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [isCustomerResolved, setIsCustomerResolved] = useState(false);

  const [isOrderCompleted, setIsOrderCompleted] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState('');
  const [shouldClearCartAfterSuccess, setShouldClearCartAfterSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    fullCompanyName: '',
    comment: '',
    courierAddress: '',
    transportAddress: '',
    transportCompanyCustom: '',
    inn: '',
    kpp: '',
    ogrn: '',
    bankName: '',
    bik: '',
    checkingAccount: '',
    legalAddress: '',
    contactPerson: '',
  });

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [pickupBranch, setPickupBranch] = useState<PickupBranch>('spb');
  const [transportCompany, setTransportCompany] =
    useState<TransportCompany>('delovye_linii');
  const [paymentMethod, setPaymentMethod] =
    useState<CustomerPaymentMethod>('manager_confirmation');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');
  const [submitErrorMessage, setSubmitErrorMessage] = useState('');

  const cartIds = useMemo(() => cart.map((item) => item.productId), [cart]);
  const cartIdsKey = useMemo(() => cartIds.join('|'), [cartIds]);

  useEffect(() => {
    let active = true;

    async function loadCustomer() {
      try {
        const customer = await getCurrentCustomer();
        if (!active) return;

        const id = customer?.id || '';
        if (!id) {
          setCustomerId('');
          setCustomerEmail('');
          setCustomerType('individual');
          setIsCustomerResolved(true);
          return;
        }

        const profile = await getCustomerProfile(id);
        if (!active) return;

        const resolvedCustomerType =
          profile?.customer_type || customer?.customerType || 'individual';

        const resolvedFullName =
          resolvedCustomerType === 'company'
            ? profile?.contact_person ||
              customer?.contactPerson ||
              profile?.full_name ||
              customer?.fullName ||
              ''
            : profile?.full_name || customer?.fullName || '';

        const resolvedFullCompanyName =
          profile?.full_company_name ||
          customer?.fullCompanyName ||
          profile?.company_name ||
          profile?.company ||
          customer?.companyName ||
          customer?.company ||
          '';

        const resolvedCompany =
          profile?.company_name ||
          profile?.company ||
          customer?.companyName ||
          customer?.company ||
          resolvedFullCompanyName ||
          '';

        const resolvedPhone = profile?.phone || customer?.phone || '';
        const resolvedEmail = profile?.email || customer?.email || '';
        const resolvedComment = profile?.comment || customer?.comment || '';
        const resolvedInn = profile?.inn || customer?.inn || '';
        const resolvedKpp = profile?.kpp || customer?.kpp || '';
        const resolvedOgrn = profile?.ogrn || customer?.ogrn || '';
        const resolvedBankName = profile?.bank_name || customer?.bankName || '';
        const resolvedBik = profile?.bik || customer?.bik || '';
        const resolvedCheckingAccount =
          profile?.checking_account || customer?.checkingAccount || '';
        const resolvedLegalAddress =
          profile?.legal_address || customer?.legalAddress || '';
        const resolvedContactPerson =
          profile?.contact_person ||
          customer?.contactPerson ||
          customer?.fullName ||
          '';

        setCustomerId(id);
        setCustomerEmail(resolvedEmail);
        setCustomerType(resolvedCustomerType);

        setFormData((prev) => ({
          ...prev,
          name: prev.name || resolvedFullName,
          phone: prev.phone || resolvedPhone,
          email: prev.email || resolvedEmail,
          company: prev.company || resolvedCompany,
          fullCompanyName: prev.fullCompanyName || resolvedFullCompanyName,
          comment: prev.comment || resolvedComment,
          inn: prev.inn || resolvedInn,
          kpp: prev.kpp || resolvedKpp,
          ogrn: prev.ogrn || resolvedOgrn,
          bankName: prev.bankName || resolvedBankName,
          bik: prev.bik || resolvedBik,
          checkingAccount: prev.checkingAccount || resolvedCheckingAccount,
          legalAddress: prev.legalAddress || resolvedLegalAddress,
          contactPerson: prev.contactPerson || resolvedContactPerson,
        }));

        setPaymentMethod(
          resolvedCustomerType === 'company'
            ? 'invoice'
            : 'manager_confirmation'
        );
      } catch (error) {
        console.error('Failed to load current customer:', error);
        if (!active) return;
        setCustomerId('');
        setCustomerEmail('');
        setCustomerType('individual');
      } finally {
        if (active) {
          setIsCustomerResolved(true);
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
        console.error('CheckoutPage load error:', error);
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

  useEffect(() => {
    if (customerType === 'company') {
      if (paymentMethod !== 'invoice') {
        setPaymentMethod('invoice');
      }
      return;
    }

    if (
      customerType === 'individual' &&
      deliveryMethod !== 'pickup' &&
      paymentMethod === 'card_online'
    ) {
      setPaymentMethod('manager_confirmation');
    }
  }, [customerType, deliveryMethod, paymentMethod]);


  useEffect(() => {
  if (!shouldClearCartAfterSuccess) return;

  void clearCart();
  }, [shouldClearCartAfterSuccess, clearCart]);

  const products = useMemo<CheckoutProductRow[]>(() => {
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

  const isIndividual = customerType === 'individual';
  const isCompany = customerType === 'company';
  const canPayByCard = isIndividual && deliveryMethod === 'pickup';

  if (!isCustomerResolved || loading) {
    return (
      <div id="main" role="main" className="min-h-screen bg-background">
        <Header />
        <section className="py-24">
          <div className="max-w-[100rem] mx-auto px-4 sm:px-8 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (!customerId) {
    return <Navigate to="/account-login?next=%2Fcheckout" replace />;
  }

  if (isOrderCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <section className="bg-graphite text-primary-foreground py-16 sm:py-20">
          <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-4">
              Заказ оформлен
            </h1>
            <p className="font-paragraph text-base sm:text-lg text-white/75 max-w-3xl">
              Заявка успешно отправлена. Мы свяжемся с вами для подтверждения и уточнения деталей.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="max-w-[52rem] mx-auto px-4 sm:px-8">
            <div className="border border-[#d9dde3] bg-white p-8 sm:p-10 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 border border-green-200">
                <PackageCheck className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="font-heading text-3xl text-graphite mb-4">
                Спасибо, заказ принят
              </h2>

              {completedOrderNumber ? (
                <>
                  <p className="font-paragraph text-base text-steel-gray mb-3">
                    Номер заказа:
                  </p>

                  <div className="font-heading text-2xl text-primary mb-6">
                    {completedOrderNumber}
                  </div>
                </>
              ) : (
                <div className="font-paragraph text-base text-steel-gray mb-6">
                  Номер заказа будет подтвержден менеджером.
                </div>
              )}

              <p className="font-paragraph text-steel-gray mb-8">
                Мы получили вашу заявку и скоро свяжемся с вами.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/catalog">
                  <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                    Перейти в каталог
                  </Button>
                </Link>

                <Link to="/account">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Перейти в кабинет
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  if (products.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setSubmitSuccessMessage('');
    setSubmitErrorMessage('');

    try {
      if (!customerId) {
        throw new Error('Не найден авторизованный пользователь');
      }

      if (!formData.name.trim()) {
        throw new Error(isCompany ? 'Укажите контактное лицо' : 'Укажите имя');
      }

      if (!formData.phone.trim()) {
        throw new Error('Укажите телефон');
      }

      if (isCompany) {
        if (!formData.fullCompanyName.trim()) {
          throw new Error('Укажите полное наименование организации');
        }

        if (!formData.inn.trim()) {
          throw new Error('Укажите ИНН');
        }

        if (!formData.kpp.trim()) {
          throw new Error('Укажите КПП');
        }

        if (!formData.ogrn.trim()) {
          throw new Error('Укажите ОГРН');
        }

        if (!formData.bankName.trim()) {
          throw new Error('Укажите банк');
        }

        if (!formData.bik.trim()) {
          throw new Error('Укажите БИК');
        }

        if (!formData.checkingAccount.trim()) {
          throw new Error('Укажите расчетный счет');
        }

        if (!formData.legalAddress.trim()) {
          throw new Error('Укажите юридический адрес');
        }
      }

      if (deliveryMethod === 'courier' && !formData.courierAddress.trim()) {
        throw new Error('Укажите адрес доставки для курьера');
      }

      if (
        deliveryMethod === 'transport_company' &&
        !formData.transportAddress.trim()
      ) {
        throw new Error('Укажите адрес доставки для транспортной компании');
      }

      if (
        deliveryMethod === 'transport_company' &&
        transportCompany === 'other' &&
        !formData.transportCompanyCustom.trim()
      ) {
        throw new Error('Укажите название транспортной компании');
      }

      if (isIndividual && !canPayByCard && paymentMethod === 'card_online') {
        throw new Error(
          'Оплата картой доступна только для физического лица при самовывозе'
        );
      }

      if (paymentMethod === 'card_online') {
        throw new Error(
          'Онлайн-оплата картой пока не подключена. Выберите согласование с менеджером.'
        );
      }

      const deliveryText =
        deliveryMethod === 'pickup'
          ? `Самовывоз: ${getPickupBranchLabel(pickupBranch)}`
          : deliveryMethod === 'courier'
            ? `Курьер: ${formData.courierAddress.trim()}`
            : `Транспортная компания: ${getTransportCompanyLabel(
                transportCompany,
                formData.transportCompanyCustom
              )}; адрес доставки: ${formData.transportAddress.trim()}`;

      const paymentText = getPaymentMethodLabel(paymentMethod, customerType);

      const commentParts = [
        formData.comment.trim(),
        isCompany ? 'Тип клиента: юридическое лицо' : 'Тип клиента: физическое лицо',
        isCompany && formData.fullCompanyName.trim()
          ? `Полное наименование организации: ${formData.fullCompanyName.trim()}`
          : '',
        isCompany && formData.inn.trim() ? `ИНН: ${formData.inn.trim()}` : '',
        isCompany && formData.kpp.trim() ? `КПП: ${formData.kpp.trim()}` : '',
        isCompany && formData.ogrn.trim() ? `ОГРН: ${formData.ogrn.trim()}` : '',
        isCompany && formData.bankName.trim()
          ? `Банк: ${formData.bankName.trim()}`
          : '',
        isCompany && formData.bik.trim() ? `БИК: ${formData.bik.trim()}` : '',
        isCompany && formData.checkingAccount.trim()
          ? `Расчетный счет: ${formData.checkingAccount.trim()}`
          : '',
        isCompany && formData.legalAddress.trim()
          ? `Юридический адрес: ${formData.legalAddress.trim()}`
          : '',
        deliveryMethod === 'transport_company'
          ? 'Рекомендуемый сценарий: менеджер уточняет параметры отправки и ТК после оформления'
          : '',
        `Способ доставки: ${deliveryText}`,
        `Способ оплаты: ${paymentText}`,
      ].filter(Boolean);

      const resolvedCompany = isCompany ? formData.fullCompanyName.trim() : null;

      await upsertCustomerProfile({
        id: customerId,
        email: formData.email || customerEmail || '',
        customer_type: customerType,
        full_name: formData.name,
        phone: formData.phone,
        company: resolvedCompany,
        comment: formData.comment,
        company_name: resolvedCompany,
        full_company_name: resolvedCompany,
        inn: isCompany ? formData.inn : null,
        kpp: isCompany ? formData.kpp : null,
        ogrn: isCompany ? formData.ogrn : null,
        bank_name: isCompany ? formData.bankName : null,
        bik: isCompany ? formData.bik : null,
        checking_account: isCompany ? formData.checkingAccount : null,
        legal_address: isCompany ? formData.legalAddress : null,
        contact_person: isCompany ? formData.name : null,
      });

      const orderResult = await createCustomerOrder({
        userId: customerId,
        deliveryMethod,
        pickupBranch: deliveryMethod === 'pickup' ? pickupBranch : null,
        transportCompany:
          deliveryMethod === 'transport_company' ? transportCompany : null,
        transportCompanyCustom:
          deliveryMethod === 'transport_company' && transportCompany === 'other'
            ? formData.transportCompanyCustom
            : null,
        deliveryAddress:
          deliveryMethod === 'courier'
            ? formData.courierAddress
            : deliveryMethod === 'transport_company'
              ? formData.transportAddress
              : null,
        paymentMethod,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email || customerEmail || '',
        customerCompany: resolvedCompany,
        comment: commentParts.join('\n'),
        items: products.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          product_slug: item.slug,
          quantity: item.cartQuantity,
          unit_price: item.price > 0 ? item.price : 0,
          line_total: item.price > 0 ? item.price * item.cartQuantity : 0,
        })),
      });

      try {
        await createLead({
          customer_name: formData.name,
          phone: formData.phone,
          email: formData.email || customerEmail || '',
          company: isCompany ? formData.fullCompanyName : '',
          comment: `Заказ № ${orderResult?.orderId || ''}\n${commentParts.join('\n')}`,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
          source: 'cart',
          items: products.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            product_slug: item.slug,
            quantity: item.cartQuantity,
          })),
        });
      } catch (leadError) {
        console.error('Lead creation failed:', leadError);
      }

      setIsOrderCompleted(true);
      setCompletedOrderNumber(String(orderResult?.orderId || ''));
      setSubmitSuccessMessage(
        `Заказ создан. ${orderResult?.orderId ? `Номер заказа: ${orderResult.orderId}. ` : ''}Мы свяжемся с вами для подтверждения и уточнения деталей.`
      );
      setSubmitErrorMessage('');
      setShouldClearCartAfterSuccess(true);

      setFormData((prev) => ({
        ...prev,
        courierAddress: '',
        transportAddress: '',
        transportCompanyCustom: '',
        comment: '',
      }));
      setDeliveryMethod('pickup');
      setPickupBranch('spb');
      setTransportCompany('delovye_linii');
      setPaymentMethod(isCompany ? 'invoice' : 'manager_confirmation');
    } catch (error: any) {
      console.error('Checkout submit error:', error);
      setSubmitErrorMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось оформить заказ. Попробуйте еще раз.'
      );
      setSubmitSuccessMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-graphite text-primary-foreground py-16 sm:py-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-4">
            Оформление заказа
          </h1>
          <p className="font-paragraph text-base sm:text-lg text-white/75 max-w-3xl">
            Проверьте состав заказа, выберите доставку и оплату, затем отправьте заявку.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <div className="grid xl:grid-cols-[1fr_360px] gap-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <div>Тип аккаунта: {getCustomerTypeLabel(customerType)}</div>
                    {isCompany ? (
                      <>
                        <div>
                          Для юридических лиц оформление идет по безналичному расчету.
                        </div>
                        <div>
                          Реквизиты можно сохранить и использовать в следующих заказах.
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          Для физического лица оплата картой доступна только при самовывозе.
                        </div>
                        <div>
                          При курьере и доставке транспортной компанией оплата согласуется с менеджером.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-[#d9dde3] bg-white p-6">
                <div className="flex items-center gap-3 mb-6">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-2xl text-graphite">
                    {isCompany ? 'Данные контактного лица и организации' : 'Контактные данные'}
                  </h2>
                </div>

                <div className="mb-6 rounded-lg border border-graphite/10 bg-background px-4 py-3 text-sm text-steel-gray">
                  Тип аккаунта:{' '}
                  <span className="font-medium text-graphite">
                    {getCustomerTypeLabel(customerType)}
                  </span>
                </div>

                {isIndividual ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      placeholder="ФИО *"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      disabled={isSubmitting}
                      required
                    />
                    <Input
                      placeholder="Телефон *"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      disabled={isSubmitting}
                      required
                    />
                    <Input
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Контактное лицо *"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                            contactPerson: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                        required
                      />
                      <Input
                        placeholder="Телефон *"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        disabled={isSubmitting}
                        required
                      />
                      <Input
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        disabled={isSubmitting}
                      />
                      <Input
                        placeholder="Полное наименование организации *"
                        value={formData.fullCompanyName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            fullCompanyName: e.target.value,
                            company: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="rounded-xl border border-graphite/10 bg-background p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="font-heading text-xl text-graphite">
                          Реквизиты организации
                        </h3>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <Input
                          placeholder="ИНН *"
                          value={formData.inn}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, inn: e.target.value }))
                          }
                          disabled={isSubmitting}
                          required
                        />
                        <Input
                          placeholder="КПП *"
                          value={formData.kpp}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, kpp: e.target.value }))
                          }
                          disabled={isSubmitting}
                          required
                        />
                        <Input
                          placeholder="ОГРН *"
                          value={formData.ogrn}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, ogrn: e.target.value }))
                          }
                          disabled={isSubmitting}
                          required
                        />
                        <Input
                          placeholder="Контактное лицо"
                          value={formData.contactPerson}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              contactPerson: e.target.value,
                              name: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                        />
                        <div className="md:col-span-2 relative">
                          <University className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                          <Input
                            placeholder="Банк *"
                            value={formData.bankName}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                bankName: e.target.value,
                              }))
                            }
                            disabled={isSubmitting}
                            className="pl-11"
                            required
                          />
                        </div>
                        <div className="relative">
                          <LandmarkIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                          <Input
                            placeholder="БИК *"
                            value={formData.bik}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                bik: e.target.value,
                              }))
                            }
                            disabled={isSubmitting}
                            className="pl-11"
                            required
                          />
                        </div>
                        <div className="relative">
                          <CreditCard className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                          <Input
                            placeholder="Расчетный счет *"
                            value={formData.checkingAccount}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                checkingAccount: e.target.value,
                              }))
                            }
                            disabled={isSubmitting}
                            className="pl-11"
                            required
                          />
                        </div>
                      </div>

                      <div className="mt-4 relative">
                        <Landmark className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-steel-gray" />
                        <Textarea
                          placeholder="Юридический адрес *"
                          value={formData.legalAddress}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              legalAddress: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                          rows={3}
                          className="pl-11"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-[#d9dde3] bg-white p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Truck className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-2xl text-graphite">
                    Способ доставки
                  </h2>
                </div>

                <div className="mb-6 rounded-lg border border-graphite/10 bg-background px-4 py-3 text-sm text-steel-gray">
                  Для доставки транспортной компанией рекомендуем указать предпочтительную ТК и дополнительную информацию в комментарии.
                </div>

                <div className="space-y-5">
                  <div className="grid lg:grid-cols-[220px_1fr] gap-4 items-start">
                    <label className="flex items-center gap-3 cursor-pointer pt-3">
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryMethod === 'pickup'}
                        onChange={() => setDeliveryMethod('pickup')}
                        className="h-5 w-5 accent-primary"
                      />
                      <span>Самовывоз</span>
                    </label>

                    <div className={deliveryMethod === 'pickup' ? '' : 'opacity-50'}>
                      <select
                        value={pickupBranch}
                        onChange={(e) => setPickupBranch(e.target.value as PickupBranch)}
                        disabled={isSubmitting || deliveryMethod !== 'pickup'}
                        className="w-full h-12 rounded-lg border border-graphite/15 bg-white px-4 text-sm outline-none focus:border-primary"
                      >
                        {PICKUP_BRANCH_OPTIONS.map((branch) => (
                          <option key={branch.value} value={branch.value}>
                            {branch.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[220px_1fr] gap-4 items-start">
                    <label className="flex items-center gap-3 cursor-pointer pt-3">
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryMethod === 'courier'}
                        onChange={() => setDeliveryMethod('courier')}
                        className="h-5 w-5 accent-primary"
                      />
                      <span>Курьер</span>
                    </label>

                    <div className={deliveryMethod === 'courier' ? '' : 'opacity-50'}>
                      <Input
                        placeholder="Адрес доставки"
                        value={formData.courierAddress}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            courierAddress: e.target.value,
                          }))
                        }
                        disabled={isSubmitting || deliveryMethod !== 'courier'}
                      />
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[220px_1fr] gap-4 items-start">
                    <label className="flex items-center gap-3 cursor-pointer pt-3">
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryMethod === 'transport_company'}
                        onChange={() => setDeliveryMethod('transport_company')}
                        className="h-5 w-5 accent-primary"
                      />
                      <span>Транспортная компания</span>
                    </label>

                    <div
                      className={`space-y-4 ${
                        deliveryMethod === 'transport_company' ? '' : 'opacity-50'
                      }`}
                    >
                      <select
                        value={transportCompany}
                        onChange={(e) =>
                          setTransportCompany(e.target.value as TransportCompany)
                        }
                        disabled={isSubmitting || deliveryMethod !== 'transport_company'}
                        className="w-full h-12 rounded-lg border border-graphite/15 bg-white px-4 text-sm outline-none focus:border-primary"
                      >
                        {TRANSPORT_COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.label}
                          </option>
                        ))}
                      </select>

                      {transportCompany === 'other' && (
                        <Input
                          placeholder="Название транспортной компании"
                          value={formData.transportCompanyCustom}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              transportCompanyCustom: e.target.value,
                            }))
                          }
                          disabled={
                            isSubmitting || deliveryMethod !== 'transport_company'
                          }
                        />
                      )}

                      <Textarea
                        placeholder="Адрес доставки"
                        value={formData.transportAddress}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transportAddress: e.target.value,
                          }))
                        }
                        disabled={
                          isSubmitting || deliveryMethod !== 'transport_company'
                        }
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-[#d9dde3] bg-white p-6">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-2xl text-graphite">
                    Способ оплаты
                  </h2>
                </div>

                {isCompany ? (
                  <div className="rounded-xl border border-graphite/10 bg-background p-5">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-graphite">
                          Безналичный расчет
                        </div>
                        <div className="mt-2 text-sm text-steel-gray">
                          Для юридических лиц заказ оформляется по счету. Менеджер подготовит документы и свяжется с вами после получения заявки.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
                      <label className="flex items-center gap-3 cursor-pointer pt-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === 'manager_confirmation'}
                          onChange={() => setPaymentMethod('manager_confirmation')}
                          className="h-5 w-5 accent-primary"
                        />
                        <span>Согласование с менеджером</span>
                      </label>

                      <div
                        className={`text-sm text-steel-gray rounded-lg border border-graphite/10 bg-background px-4 py-3 ${
                          paymentMethod === 'manager_confirmation' ? '' : 'opacity-50'
                        }`}
                      >
                        После оформления заказа менеджер уточнит способ оплаты, наличие и условия получения товара.
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
                      <label className="flex items-center gap-3 cursor-pointer pt-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === 'card_online'}
                          onChange={() => setPaymentMethod('card_online')}
                          disabled={!canPayByCard}
                          className="h-5 w-5 accent-primary"
                        />
                        <span>Оплата картой онлайн</span>
                      </label>

                      <div
                        className={`text-sm rounded-lg border px-4 py-3 ${
                          canPayByCard
                            ? paymentMethod === 'card_online'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-graphite/10 bg-background text-steel-gray'
                            : 'border-graphite/10 bg-background text-steel-gray opacity-50'
                        }`}
                      >
                        {canPayByCard
                          ? 'Оплата картой доступна только при самовывозе. Сейчас этот режим еще не подключен технически.'
                          : 'Оплата картой недоступна для выбранного способа доставки. Используется согласование с менеджером.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-[#d9dde3] bg-white p-6">
                <div className="flex items-center gap-3 mb-6">
                  <PackageCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-2xl text-graphite">
                    Комментарий к заказу
                  </h2>
                </div>

                <div className="mb-4 rounded-lg border border-graphite/10 bg-background px-4 py-3 text-sm text-steel-gray">
                  Здесь можно указать удобную транспортную компанию, особенности доставки, данные для связи и другую важную информацию.
                </div>

                <Textarea
                  placeholder="Комментарий к заказу"
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  disabled={isSubmitting}
                  rows={5}
                />
              </div>

              {submitSuccessMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {submitSuccessMessage}
                </div>
              )}

              {submitErrorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitErrorMessage}
                </div>
              )}

              <div className="xl:hidden">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12"
                >
                  {isSubmitting ? 'Отправка...' : 'Оформить заказ'}
                </Button>
              </div>
            </form>

            <aside className="h-fit border border-[#d9dde3] bg-white p-6 sticky top-28">
              <h2 className="font-heading text-2xl text-graphite mb-6">Мой заказ</h2>

              <div className="space-y-4 border-b border-graphite/10 pb-6">
                {products.map((product) => (
                  <div key={product.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-background border border-graphite/10 flex items-center justify-center shrink-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain p-1"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-graphite line-clamp-2">
                        {product.name}
                      </div>
                      <div className="mt-1 text-xs text-steel-gray">
                        {product.cartQuantity} шт.
                      </div>
                      <div className="mt-1 text-sm text-graphite">
                        {product.price > 0
                          ? `${(product.price * product.cartQuantity).toLocaleString('ru-RU')} ₽`
                          : 'По запросу'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 space-y-4">
                <div className="flex items-center justify-between text-sm text-steel-gray">
                  <span>Позиций</span>
                  <span className="text-graphite font-medium">{totals.itemsCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-steel-gray">
                  <span>Общее количество</span>
                  <span className="text-graphite font-medium">{totals.unitsCount}</span>
                </div>

                <div className="flex items-center justify-between text-base">
                  <span className="text-graphite font-medium">Сумма</span>
                  <span className="font-heading text-2xl text-graphite">
                    {totals.totalPrice > 0
                      ? `${totals.totalPrice.toLocaleString('ru-RU')} ₽`
                      : 'По запросу'}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => {
                    const form = document.querySelector('form');
                    if (!form) return;
                    form.requestSubmit();
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12"
                >
                  {isSubmitting ? 'Отправка...' : 'Оформить заказ'}
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
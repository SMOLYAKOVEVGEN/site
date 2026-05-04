import { supabase } from '@/lib/supabase';

export type CustomerType = 'individual' | 'company';
export type CustomerPaymentMethod =
  | 'invoice'
  | 'card_online'
  | 'manager_confirmation';

export type CustomerProfileRow = {
  id: string;
  email: string | null;
  customer_type: CustomerType | null;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  comment: string | null;
  company_name: string | null;
  full_company_name: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  bank_name: string | null;
  bik: string | null;
  checking_account: string | null;
  legal_address: string | null;
  contact_person: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerOrderRow = {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  delivery_method: string;
  pickup_branch: string | null;
  transport_company: string | null;
  transport_company_custom: string | null;
  delivery_address: string | null;
  payment_method: CustomerPaymentMethod | string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_company: string | null;
  comment: string | null;
  total_items: number;
  total_units: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type CustomerOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
};

export type CustomerCartItemRow = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type GuestCartItemInput = {
  productId: string;
  quantity: number;
};

export type CreateCustomerOrderInput = {
  userId: string;
  deliveryMethod: string;
  pickupBranch?: string | null;
  transportCompany?: string | null;
  transportCompanyCustom?: string | null;
  deliveryAddress?: string | null;
  paymentMethod: CustomerPaymentMethod;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerCompany?: string | null;
  comment?: string | null;
  items: Array<{
    product_id?: string | null;
    product_name: string;
    product_slug?: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

export type UpsertCustomerProfileInput = {
  id: string;
  email?: string | null;
  customer_type?: CustomerType | null;
  full_name?: string | null;
  phone?: string | null;
  company?: string | null;
  comment?: string | null;
  company_name?: string | null;
  full_company_name?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  bank_name?: string | null;
  bik?: string | null;
  checking_account?: string | null;
  legal_address?: string | null;
  contact_person?: string | null;
};

export type CustomerPurchasedProductRow = {
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  total_quantity: number;
  last_ordered_at: string;
};

export type CustomerOrderDocumentRow = {
  id: string;
  order_id: string | null;
  title: string;
  document_type:
    | 'invoice'
    | 'upf'
    | 'contract'
    | 'offer'
    | 'shipping'
    | 'other'
    | 'payment'
    | 'order';
  status: string;
  created_at: string;
  amount: number;
  download_url: string | null;
  file_name: string | null;
};

export type CustomerAddressRow = {
  id: string;
  user_id: string;
  title: string;
  address: string;
  comment: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerSavedAddressRow = {
  id: string;
  title: string;
  address: string;
  comment: string | null;
  source: 'profile' | 'order';
  is_primary: boolean;
  created_at: string | null;
};

export type CustomerAccountOverview = {
  profile: CustomerProfileRow | null;
  orders: CustomerOrderRow[];
  orderItems: CustomerOrderItemRow[];
  purchasedProducts: CustomerPurchasedProductRow[];
  documents: CustomerOrderDocumentRow[];
  savedAddresses: CustomerSavedAddressRow[];
  stats: {
    ordersCount: number;
    activeOrdersCount: number;
    pendingPaymentsCount: number;
    purchasedProductsCount: number;
    totalSpent: number;
    lastOrderDate: string | null;
  };
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const valueText = normalizeText(value);
  return valueText || null;
}

function normalizeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeQuantity(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function normalizeCustomerType(value: unknown): CustomerType | null {
  if (value === 'company') return 'company';
  if (value === 'individual') return 'individual';
  return null;
}

function normalizePaymentMethod(value: unknown): CustomerPaymentMethod {
  if (value === 'invoice') return 'invoice';
  if (value === 'card_online') return 'card_online';
  return 'manager_confirmation';
}

function normalizeGuestCartItems(
  items: GuestCartItemInput[] | null | undefined
): GuestCartItemInput[] {
  if (!Array.isArray(items)) return [];

  const merged = new Map<string, number>();

  for (const item of items) {
    const productId = normalizeText(item?.productId);
    const quantity = normalizeQuantity(item?.quantity);

    if (!productId) continue;

    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function isIgnorableSupabaseError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const combined = `${message} ${details} ${hint} ${code}`;

  return (
    combined.includes('does not exist') ||
    combined.includes('could not find the table') ||
    combined.includes('relation') ||
    combined.includes('42p01') ||
    combined.includes('permission denied') ||
    combined.includes('42501') ||
    combined.includes('not found')
  );
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  const userId = normalizeText(user?.id);

  if (!userId) {
    throw new Error('Пользователь не авторизован');
  }

  return userId;
}

function mapOrderRow(row: any): CustomerOrderRow {
  return {
    id: normalizeText(row?.id),
    user_id: normalizeText(row?.user_id),
    status: normalizeText(row?.status),
    payment_status: normalizeText(row?.payment_status),
    delivery_method: normalizeText(row?.delivery_method),
    pickup_branch: normalizeOptionalText(row?.pickup_branch),
    transport_company: normalizeOptionalText(row?.transport_company),
    transport_company_custom: normalizeOptionalText(row?.transport_company_custom),
    delivery_address: normalizeOptionalText(row?.delivery_address),
    payment_method: normalizeText(row?.payment_method),
    customer_name: normalizeText(row?.customer_name),
    customer_phone: normalizeText(row?.customer_phone),
    customer_email: normalizeOptionalText(row?.customer_email),
    customer_company: normalizeOptionalText(row?.customer_company),
    comment: normalizeOptionalText(row?.comment),
    total_items: normalizeNumber(row?.total_items),
    total_units: normalizeNumber(row?.total_units),
    total_amount: normalizeNumber(row?.total_amount),
    created_at: normalizeText(row?.created_at),
    updated_at: normalizeText(row?.updated_at),
  };
}

function mapOrderItemRow(row: any): CustomerOrderItemRow {
  return {
    id: normalizeText(row?.id),
    order_id: normalizeText(row?.order_id),
    product_id: normalizeOptionalText(row?.product_id),
    product_name: normalizeText(row?.product_name),
    product_slug: normalizeOptionalText(row?.product_slug),
    quantity: normalizeQuantity(row?.quantity),
    unit_price: normalizeNumber(row?.unit_price),
    line_total: normalizeNumber(row?.line_total),
    created_at: normalizeText(row?.created_at),
  };
}

async function getCustomerOrderItemsByOrderIds(
  orderIds: string[]
): Promise<CustomerOrderItemRow[]> {
  const normalizedOrderIds = orderIds.map(normalizeText).filter(Boolean);
  if (!normalizedOrderIds.length) return [];

  const { data, error } = await supabase
    .from('customer_order_items')
    .select(`
      id,
      order_id,
      product_id,
      product_name,
      product_slug,
      quantity,
      unit_price,
      line_total,
      created_at
    `)
    .in('order_id', normalizedOrderIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data as any[]) || []).map(mapOrderItemRow);
}

function mapCustomerDocumentRow(row: any): CustomerOrderDocumentRow {
  return {
    id: normalizeText(row?.id),
    order_id: normalizeOptionalText(row?.order_id),
    title: normalizeText(row?.title),
    document_type: normalizeText(
      row?.document_type
    ) as CustomerOrderDocumentRow['document_type'],
    status: normalizeText(row?.status),
    created_at: normalizeText(row?.created_at),
    amount: normalizeNumber(row?.amount),
    download_url: normalizeOptionalText(row?.file_url),
    file_name: normalizeOptionalText(row?.file_name),
  };
}

function mapCustomerAddressRow(row: any): CustomerAddressRow {
  return {
    id: normalizeText(row?.id),
    user_id: normalizeText(row?.user_id),
    title: normalizeText(row?.title),
    address: normalizeText(row?.address),
    comment: normalizeOptionalText(row?.comment),
    is_primary: Boolean(row?.is_primary),
    created_at: normalizeText(row?.created_at),
    updated_at: normalizeText(row?.updated_at),
  };
}

function mapSavedAddressRow(row: CustomerAddressRow): CustomerSavedAddressRow {
  return {
    id: row.id,
    title: row.title,
    address: row.address,
    comment: row.comment,
    source: 'profile',
    is_primary: row.is_primary,
    created_at: row.created_at,
  };
}

export async function getCustomerProfile(
  userId: string
): Promise<CustomerProfileRow | null> {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) return null;

  const { data, error } = await supabase
    .from('customer_profiles')
    .select(`
      id,
      email,
      customer_type,
      full_name,
      phone,
      company,
      comment,
      company_name,
      full_company_name,
      inn,
      kpp,
      ogrn,
      bank_name,
      bik,
      checking_account,
      legal_address,
      contact_person,
      created_at,
      updated_at
    `)
    .eq('id', normalizedUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CustomerProfileRow | null) || null;
}

export async function upsertCustomerProfile(
  payload: UpsertCustomerProfileInput
): Promise<void> {
  const id = normalizeText(payload.id);

  if (!id) {
    throw new Error('Не найден пользователь');
  }

  const { error } = await supabase.from('customer_profiles').upsert(
    {
      id,
      email: normalizeOptionalText(payload.email),
      customer_type: normalizeCustomerType(payload.customer_type),
      full_name: normalizeOptionalText(payload.full_name),
      phone: normalizeOptionalText(payload.phone),
      company: normalizeOptionalText(payload.company),
      comment: normalizeOptionalText(payload.comment),
      company_name: normalizeOptionalText(payload.company_name),
      full_company_name: normalizeOptionalText(payload.full_company_name),
      inn: normalizeOptionalText(payload.inn),
      kpp: normalizeOptionalText(payload.kpp),
      ogrn: normalizeOptionalText(payload.ogrn),
      bank_name: normalizeOptionalText(payload.bank_name),
      bik: normalizeOptionalText(payload.bik),
      checking_account: normalizeOptionalText(payload.checking_account),
      legal_address: normalizeOptionalText(payload.legal_address),
      contact_person: normalizeOptionalText(payload.contact_person),
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    throw error;
  }
}

export async function getCustomerOrders(): Promise<CustomerOrderRow[]> {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('customer_orders')
    .select(`
      id,
      user_id,
      status,
      payment_status,
      delivery_method,
      pickup_branch,
      transport_company,
      transport_company_custom,
      delivery_address,
      payment_method,
      customer_name,
      customer_phone,
      customer_email,
      customer_company,
      comment,
      total_items,
      total_units,
      total_amount,
      created_at,
      updated_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data as any[]) || []).map(mapOrderRow);
}

export async function getCustomerOrdersByUser(
  userId: string
): Promise<CustomerOrderRow[]> {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) return [];

  const { data, error } = await supabase
    .from('customer_orders')
    .select(`
      id,
      user_id,
      status,
      payment_status,
      delivery_method,
      pickup_branch,
      transport_company,
      transport_company_custom,
      delivery_address,
      payment_method,
      customer_name,
      customer_phone,
      customer_email,
      customer_company,
      comment,
      total_items,
      total_units,
      total_amount,
      created_at,
      updated_at
    `)
    .eq('user_id', normalizedUserId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data as any[]) || []).map(mapOrderRow);
}

export async function getCustomerOrderItems(
  orderId: string
): Promise<CustomerOrderItemRow[]> {
  const normalizedOrderId = normalizeText(orderId);
  if (!normalizedOrderId) return [];

  const { data, error } = await supabase
    .from('customer_order_items')
    .select(`
      id,
      order_id,
      product_id,
      product_name,
      product_slug,
      quantity,
      unit_price,
      line_total,
      created_at
    `)
    .eq('order_id', normalizedOrderId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data as any[]) || []).map(mapOrderItemRow);
}

export async function getCustomerAddresses(): Promise<CustomerAddressRow[]> {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('customer_addresses')
    .select(`
      id,
      user_id,
      title,
      address,
      comment,
      is_primary,
      created_at,
      updated_at
    `)
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('getCustomerAddresses failed:', error);

    if (isIgnorableSupabaseError(error)) {
      return [];
    }

    throw error;
  }

  return ((data as any[]) || []).map(mapCustomerAddressRow);
}

export async function createCustomerAddress(params: {
  title: string;
  address: string;
  comment?: string | null;
  is_primary?: boolean;
}): Promise<CustomerAddressRow> {
  const userId = await getAuthenticatedUserId();

  const title = normalizeText(params.title);
  const address = normalizeText(params.address);
  const comment = normalizeOptionalText(params.comment);
  const isPrimary = Boolean(params.is_primary);

  if (!title) {
    throw new Error('Укажите название адреса');
  }

  if (!address) {
    throw new Error('Укажите адрес');
  }

  if (isPrimary) {
    await supabase
      .from('customer_addresses')
      .update({ is_primary: false })
      .eq('user_id', userId);
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({
      user_id: userId,
      title,
      address,
      comment,
      is_primary: isPrimary,
    })
    .select(`
      id,
      user_id,
      title,
      address,
      comment,
      is_primary,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw error;
  }

  return mapCustomerAddressRow(data);
}

export async function updateCustomerAddress(params: {
  id: string;
  title: string;
  address: string;
  comment?: string | null;
  is_primary?: boolean;
}): Promise<CustomerAddressRow> {
  const userId = await getAuthenticatedUserId();

  const id = normalizeText(params.id);
  const title = normalizeText(params.title);
  const address = normalizeText(params.address);
  const comment = normalizeOptionalText(params.comment);
  const isPrimary = Boolean(params.is_primary);

  if (!id) {
    throw new Error('Не найден адрес');
  }

  if (!title) {
    throw new Error('Укажите название адреса');
  }

  if (!address) {
    throw new Error('Укажите адрес');
  }

  if (isPrimary) {
    await supabase
      .from('customer_addresses')
      .update({ is_primary: false })
      .eq('user_id', userId);
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .update({
      title,
      address,
      comment,
      is_primary: isPrimary,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select(`
      id,
      user_id,
      title,
      address,
      comment,
      is_primary,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw error;
  }

  return mapCustomerAddressRow(data);
}

export async function deleteCustomerAddress(id: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const normalizedId = normalizeText(id);

  if (!normalizedId) {
    throw new Error('Не найден адрес');
  }

  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', normalizedId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function getCustomerDocuments(): Promise<CustomerOrderDocumentRow[]> {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('customer_documents')
    .select(`
      id,
      order_id,
      title,
      document_type,
      status,
      file_name,
      file_url,
      amount,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getCustomerDocuments failed:', error);

    if (isIgnorableSupabaseError(error)) {
      return [];
    }

    throw error;
  }

  return ((data as any[]) || []).map(mapCustomerDocumentRow);
}

export async function createCustomerOrder(
  payload: CreateCustomerOrderInput
): Promise<{ orderId: string }> {
  const userId = normalizeText(payload.userId);
  const customerName = normalizeText(payload.customerName);
  const customerPhone = normalizeText(payload.customerPhone);
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

  if (!userId) {
    throw new Error('Пользователь не найден');
  }

  if (!customerName) {
    throw new Error('Укажите имя');
  }

  if (!customerPhone) {
    throw new Error('Укажите телефон');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('Корзина пуста');
  }

  const normalizedItems = payload.items.map((item) => {
    const quantity = normalizeQuantity(item.quantity);
    const unitPrice = normalizeNumber(item.unit_price);
    const lineTotal = normalizeNumber(item.line_total) || unitPrice * quantity;

    return {
      product_id: normalizeOptionalText(item.product_id),
      product_name: normalizeText(item.product_name),
      product_slug: normalizeOptionalText(item.product_slug),
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
    };
  });

  const hasInvalidItem = normalizedItems.some((item) => !item.product_name);
  if (hasInvalidItem) {
    throw new Error('В заказе есть товар без названия');
  }

  const totalItems = normalizedItems.length;
  const totalUnits = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.line_total, 0);

  const { data: orderData, error: orderError } = await supabase
    .from('customer_orders')
    .insert({
      user_id: userId,
      status: 'new',
      payment_status: 'pending',
      delivery_method: normalizeText(payload.deliveryMethod),
      pickup_branch: normalizeOptionalText(payload.pickupBranch),
      transport_company: normalizeOptionalText(payload.transportCompany),
      transport_company_custom: normalizeOptionalText(payload.transportCompanyCustom),
      delivery_address: normalizeOptionalText(payload.deliveryAddress),
      payment_method: paymentMethod,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: normalizeOptionalText(payload.customerEmail),
      customer_company: normalizeOptionalText(payload.customerCompany),
      comment: normalizeOptionalText(payload.comment),
      total_items: totalItems,
      total_units: totalUnits,
      total_amount: totalAmount,
    })
    .select('id')
    .single();

  if (orderError) {
    throw orderError;
  }

  const orderId = String(orderData.id);

  const orderItemsPayload = normalizedItems.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    product_name: item.product_name,
    product_slug: item.product_slug,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
  }));

  const { error: itemsError } = await supabase
    .from('customer_order_items')
    .insert(orderItemsPayload);

  if (itemsError) {
    throw itemsError;
  }

  return { orderId };
}

export async function getPurchasedProducts(): Promise<CustomerPurchasedProductRow[]> {
  const orders = await getCustomerOrders();
  if (!orders.length) return [];

  const orderIds = orders.map((order) => order.id);
  const items = await getCustomerOrderItemsByOrderIds(orderIds);

  if (!items.length) return [];

  const orderDateById = new Map<string, string>();
  for (const order of orders) {
    orderDateById.set(order.id, order.created_at);
  }

  const itemsByProduct = new Map<
    string,
    {
      product_id: string | null;
      product_name: string;
      product_slug: string | null;
      total_quantity: number;
      last_ordered_at: string;
    }
  >();

  for (const item of items) {
    const key =
      item.product_id || `${item.product_slug || ''}::${item.product_name}`;
    const orderCreatedAt = orderDateById.get(item.order_id) || item.created_at;
    const existing = itemsByProduct.get(key);

    if (!existing) {
      itemsByProduct.set(key, {
        product_id: item.product_id,
        product_name: item.product_name,
        product_slug: item.product_slug,
        total_quantity: item.quantity,
        last_ordered_at: orderCreatedAt,
      });
      continue;
    }

    existing.total_quantity += item.quantity;

    if (
      new Date(orderCreatedAt).getTime() >
      new Date(existing.last_ordered_at).getTime()
    ) {
      existing.last_ordered_at = orderCreatedAt;
    }
  }

  return Array.from(itemsByProduct.values()).sort(
    (a, b) =>
      new Date(b.last_ordered_at).getTime() -
      new Date(a.last_ordered_at).getTime()
  );
}

export async function getCustomerOrderDocuments(): Promise<CustomerOrderDocumentRow[]> {
  const documents = await getCustomerDocuments();

  if (documents.length > 0) {
    return documents;
  }

  const orders = await getCustomerOrders();
  if (!orders.length) return [];

  return orders.map((order) => {
    const paymentPaid = order.payment_status === 'paid';

    return {
      id: `derived-order-${order.id}`,
      order_id: order.id,
      title: paymentPaid
        ? `Документы по заказу № ${order.id}`
        : `Счет по заказу № ${order.id}`,
      document_type: paymentPaid ? 'payment' : 'invoice',
      status: paymentPaid ? 'Подтверждено' : 'Ожидает оплаты',
      created_at: order.created_at,
      amount: normalizeNumber(order.total_amount),
      download_url: null,
      file_name: paymentPaid
        ? `order-${order.id}.pdf`
        : `invoice-${order.id}.pdf`,
    };
  });
}

export async function getCustomerSavedAddresses(): Promise<CustomerSavedAddressRow[]> {
  const addresses = await getCustomerAddresses();

  if (addresses.length > 0) {
    return addresses.map(mapSavedAddressRow);
  }

  const userId = await getAuthenticatedUserId();
  const [profile, orders] = await Promise.all([
    getCustomerProfile(userId),
    getCustomerOrdersByUser(userId),
  ]);

  const result: CustomerSavedAddressRow[] = [];
  const seen = new Set<string>();

  const pushItem = (
    address: string | null | undefined,
    source: 'profile' | 'order',
    title: string,
    createdAt: string | null,
    isPrimary: boolean,
    comment?: string | null
  ) => {
    const normalizedAddress = normalizeText(address);
    if (!normalizedAddress) return;

    const key = normalizedAddress.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    result.push({
      id: `${source}-${result.length + 1}`,
      title,
      address: normalizedAddress,
      comment: normalizeOptionalText(comment),
      source,
      is_primary: isPrimary,
      created_at: createdAt,
    });
  };

  pushItem(
    profile?.legal_address,
    'profile',
    'Юридический адрес',
    profile?.updated_at || profile?.created_at || null,
    true
  );

  for (const order of orders) {
    pushItem(
      order.delivery_address,
      'order',
      order.delivery_method === 'pickup'
        ? 'Адрес самовывоза'
        : 'Адрес доставки',
      order.created_at,
      false
    );
  }

  return result.sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;

    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

    return bTime - aTime;
  });
}

export async function getCustomerAccountOverview(): Promise<CustomerAccountOverview> {
  const userId = await getAuthenticatedUserId();

  const [profile, orders] = await Promise.all([
    getCustomerProfile(userId),
    getCustomerOrdersByUser(userId),
  ]);

  const orderIds = orders.map((order) => order.id);
  const orderItems = await getCustomerOrderItemsByOrderIds(orderIds);

  const orderDateById = new Map<string, string>();
  for (const order of orders) {
    orderDateById.set(order.id, order.created_at);
  }

  const itemsByProduct = new Map<
    string,
    {
      product_id: string | null;
      product_name: string;
      product_slug: string | null;
      total_quantity: number;
      last_ordered_at: string;
    }
  >();

  for (const item of orderItems) {
    const key =
      item.product_id || `${item.product_slug || ''}::${item.product_name}`;
    const orderCreatedAt = orderDateById.get(item.order_id) || item.created_at;
    const existing = itemsByProduct.get(key);

    if (!existing) {
      itemsByProduct.set(key, {
        product_id: item.product_id,
        product_name: item.product_name,
        product_slug: item.product_slug,
        total_quantity: item.quantity,
        last_ordered_at: orderCreatedAt,
      });
      continue;
    }

    existing.total_quantity += item.quantity;

    if (
      new Date(orderCreatedAt).getTime() >
      new Date(existing.last_ordered_at).getTime()
    ) {
      existing.last_ordered_at = orderCreatedAt;
    }
  }

  const purchasedProducts = Array.from(itemsByProduct.values()).sort(
    (a, b) =>
      new Date(b.last_ordered_at).getTime() -
      new Date(a.last_ordered_at).getTime()
  );

  let documents: CustomerOrderDocumentRow[] = [];
  try {
    const realDocuments = await getCustomerDocuments();
    documents =
      realDocuments.length > 0
        ? realDocuments
        : orders.map((order): CustomerOrderDocumentRow => {
            const paymentPaid = order.payment_status === 'paid';

            return {
              id: `derived-order-${order.id}`,
              order_id: order.id,
              title: paymentPaid
                ? `Документы по заказу № ${order.id}`
                : `Счет по заказу № ${order.id}`,
              document_type: paymentPaid ? 'payment' : 'invoice',
              status: paymentPaid ? 'Подтверждено' : 'Ожидает оплаты',
              created_at: order.created_at,
              amount: normalizeNumber(order.total_amount),
              download_url: null,
              file_name: paymentPaid
                ? `order-${order.id}.pdf`
                : `invoice-${order.id}.pdf`,
            };
          });
  } catch (error) {
    console.error('getCustomerAccountOverview documents fallback failed:', error);
    documents = orders.map((order): CustomerOrderDocumentRow => {
      const paymentPaid = order.payment_status === 'paid';

      return {
        id: `derived-order-${order.id}`,
        order_id: order.id,
        title: paymentPaid
          ? `Документы по заказу № ${order.id}`
          : `Счет по заказу № ${order.id}`,
        document_type: paymentPaid ? 'payment' : 'invoice',
        status: paymentPaid ? 'Подтверждено' : 'Ожидает оплаты',
        created_at: order.created_at,
        amount: normalizeNumber(order.total_amount),
        download_url: null,
        file_name: paymentPaid
          ? `order-${order.id}.pdf`
          : `invoice-${order.id}.pdf`,
      };
    });
  }

  let savedAddresses: CustomerSavedAddressRow[] = [];
  try {
    const realAddresses = await getCustomerAddresses();

    savedAddresses =
      realAddresses.length > 0
        ? realAddresses.map(mapSavedAddressRow)
        : (() => {
            const result: CustomerSavedAddressRow[] = [];
            const seen = new Set<string>();

            const pushItem = (
              address: string | null | undefined,
              source: 'profile' | 'order',
              title: string,
              createdAt: string | null,
              isPrimary: boolean,
              comment?: string | null
            ) => {
              const normalizedAddress = normalizeText(address);
              if (!normalizedAddress) return;

              const key = normalizedAddress.toLowerCase();
              if (seen.has(key)) return;
              seen.add(key);

              result.push({
                id: `${source}-${result.length + 1}`,
                title,
                address: normalizedAddress,
                comment: normalizeOptionalText(comment),
                source,
                is_primary: isPrimary,
                created_at: createdAt,
              });
            };

            pushItem(
              profile?.legal_address,
              'profile',
              'Юридический адрес',
              profile?.updated_at || profile?.created_at || null,
              true
            );

            for (const order of orders) {
              pushItem(
                order.delivery_address,
                'order',
                order.delivery_method === 'pickup'
                  ? 'Адрес самовывоза'
                  : 'Адрес доставки',
                order.created_at,
                false
              );
            }

            return result.sort((a, b) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;

              const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

              return bTime - aTime;
            });
          })();
  } catch (error) {
    console.error('getCustomerAccountOverview addresses fallback failed:', error);
    savedAddresses = [];
  }

  const activeOrdersCount = orders.filter(
    (order) =>
      order.status === 'new' ||
      order.status === 'in_progress' ||
      order.status === 'paid'
  ).length;

  const pendingPaymentsCount = orders.filter(
    (order) => order.payment_status === 'pending'
  ).length;

  const totalSpent = orders
    .filter((order) => order.status === 'completed' || order.payment_status === 'paid')
    .reduce((sum, order) => sum + normalizeNumber(order.total_amount), 0);

  const lastOrderDate = orders[0]?.created_at || null;

  return {
    profile,
    orders,
    orderItems,
    purchasedProducts,
    documents,
    savedAddresses,
    stats: {
      ordersCount: orders.length,
      activeOrdersCount,
      pendingPaymentsCount,
      purchasedProductsCount: purchasedProducts.length,
      totalSpent,
      lastOrderDate,
    },
  };
}

export async function getCustomerCartItems(
  userId: string
): Promise<CustomerCartItemRow[]> {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) return [];

  const { data, error } = await supabase
    .from('customer_cart_items')
    .select(`
      id,
      user_id,
      product_id,
      quantity,
      created_at,
      updated_at
    `)
    .eq('user_id', normalizedUserId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data as CustomerCartItemRow[]) || []).map((item) => ({
    ...item,
    product_id: normalizeText(item.product_id),
    quantity: normalizeQuantity(item.quantity),
  }));
}

export async function upsertCustomerCartItem(params: {
  userId: string;
  productId: string;
  quantity: number;
}): Promise<void> {
  const userId = normalizeText(params.userId);
  const productId = normalizeText(params.productId);
  const quantity = Math.max(0, Math.floor(Number(params.quantity)));

  if (!userId) {
    throw new Error('Не найден пользователь');
  }

  if (!productId) {
    throw new Error('Не найден товар');
  }

  if (quantity <= 0) {
    await removeCustomerCartItem(userId, productId);
    return;
  }

  const { error } = await supabase
    .from('customer_cart_items')
    .upsert(
      {
        user_id: userId,
        product_id: productId,
        quantity,
      },
      {
        onConflict: 'user_id,product_id',
      }
    );

  if (error) {
    throw error;
  }
}

export async function removeCustomerCartItem(
  userId: string,
  productId: string
): Promise<void> {
  const normalizedUserId = normalizeText(userId);
  const normalizedProductId = normalizeText(productId);

  if (!normalizedUserId || !normalizedProductId) return;

  const { error } = await supabase
    .from('customer_cart_items')
    .delete()
    .eq('user_id', normalizedUserId)
    .eq('product_id', normalizedProductId);

  if (error) {
    throw error;
  }
}

export async function clearCustomerCart(userId: string): Promise<void> {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) return;

  const { error } = await supabase
    .from('customer_cart_items')
    .delete()
    .eq('user_id', normalizedUserId);

  if (error) {
    throw error;
  }
}

export async function replaceCustomerCart(
  userId: string,
  items: GuestCartItemInput[]
): Promise<void> {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    throw new Error('Не найден пользователь');
  }

  const normalizedItems = normalizeGuestCartItems(items);

  const existingItems = await getCustomerCartItems(normalizedUserId);
  const nextProductIds = new Set(normalizedItems.map((item) => item.productId));
  const idsToDelete = existingItems
    .filter((item) => !nextProductIds.has(item.product_id))
    .map((item) => item.product_id);

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('customer_cart_items')
      .delete()
      .eq('user_id', normalizedUserId)
      .in('product_id', idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  if (normalizedItems.length === 0) {
    return;
  }

  const payload = normalizedItems.map((item) => ({
    user_id: normalizedUserId,
    product_id: item.productId,
    quantity: item.quantity,
  }));

  const { error: upsertError } = await supabase
    .from('customer_cart_items')
    .upsert(payload, {
      onConflict: 'user_id,product_id',
    });

  if (upsertError) {
    throw upsertError;
  }
}

export async function mergeGuestCartIntoCustomerCart(
  userId: string,
  guestItems: GuestCartItemInput[]
): Promise<CustomerCartItemRow[]> {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    throw new Error('Не найден пользователь');
  }

  const normalizedGuestItems = normalizeGuestCartItems(guestItems);
  if (normalizedGuestItems.length === 0) {
    return await getCustomerCartItems(normalizedUserId);
  }

  const existingItems = await getCustomerCartItems(normalizedUserId);
  const mergedMap = new Map<string, number>();

  for (const item of existingItems) {
    const productId = normalizeText(item.product_id);
    if (!productId) continue;
    mergedMap.set(productId, normalizeQuantity(item.quantity));
  }

  for (const item of normalizedGuestItems) {
    mergedMap.set(item.productId, (mergedMap.get(item.productId) || 0) + item.quantity);
  }

  const mergedItems = Array.from(mergedMap.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));

  await replaceCustomerCart(normalizedUserId, mergedItems);

  return await getCustomerCartItems(normalizedUserId);
}
import { supabase } from '@/lib/supabase';
import {
  getCustomerCartItems,
  mergeGuestCartIntoCustomerCart,
  upsertCustomerProfile,
} from '@/lib/customer-account-service';
import { useCatalogUI, type CartItem } from '@/store/catalog-ui-store';

export type CustomerType = 'individual' | 'company';

export type CustomerProfile = {
  id: string;
  email: string;
  customerType: CustomerType;
  fullName: string;
  company: string;
  phone: string;
  comment: string;
  companyName: string;
  fullCompanyName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  bankName: string;
  bik: string;
  checkingAccount: string;
  legalAddress: string;
  contactPerson: string;
};

export type CustomerRegisterPayload = {
  email: string;
  password: string;
  customerType: CustomerType;
  fullName?: string;
  company?: string;
  phone?: string;
  comment?: string;
  companyName?: string;
  fullCompanyName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  legalAddress?: string;
  contactPerson?: string;
};

const LS_CART = 'catalog_cart';

function normalizeText(value?: string): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapCustomerType(value: unknown): CustomerType {
  return value === 'company' ? 'company' : 'individual';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function normalizeCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];

  const merged = new Map<string, number>();

  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== 'object') continue;

    const productId =
      typeof (rawItem as { productId?: unknown }).productId === 'string'
        ? (rawItem as { productId: string }).productId.trim()
        : '';

    const quantityRaw =
      typeof (rawItem as { quantity?: unknown }).quantity === 'number'
        ? (rawItem as { quantity: number }).quantity
        : Number((rawItem as { quantity?: unknown }).quantity);

    if (!productId) continue;
    if (!Number.isFinite(quantityRaw)) continue;

    const quantity = Math.max(1, Math.floor(quantityRaw));
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function readGuestCartFromStorage(): CartItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(LS_CART);
    if (!raw) return [];
    return normalizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeActiveCart(items: CartItem[]): void {
  const normalized = normalizeCartItems(items);

  if (isBrowser()) {
    localStorage.setItem(LS_CART, JSON.stringify(normalized));
  }

  useCatalogUI.getState().replaceCart(normalized);
}

function clearActiveCart(): void {
  if (isBrowser()) {
    localStorage.removeItem(LS_CART);
  }

  useCatalogUI.getState().replaceCart([]);
}

async function hydrateCustomerCartToActiveState(userId: string): Promise<void> {
  const serverCart = await getCustomerCartItems(userId);

  const mapped: CartItem[] = serverCart.map((item) => ({
    productId: item.product_id,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
  }));

  writeActiveCart(mapped);
}

export async function getCurrentCustomer(): Promise<CustomerProfile | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user) {
    return null;
  }

  const meta = session.user.user_metadata || {};
  const customerType = mapCustomerType(meta.customer_type);

  const fullCompanyName =
    typeof meta.full_company_name === 'string'
      ? meta.full_company_name
      : typeof meta.company_name === 'string'
        ? meta.company_name
        : typeof meta.company === 'string'
          ? meta.company
          : '';

  return {
    id: session.user.id,
    email: session.user.email || '',
    customerType,
    fullName: typeof meta.full_name === 'string' ? meta.full_name : '',
    company: typeof meta.company === 'string' ? meta.company : '',
    phone: typeof meta.phone === 'string' ? meta.phone : '',
    comment: typeof meta.comment === 'string' ? meta.comment : '',
    companyName:
      typeof meta.company_name === 'string'
        ? meta.company_name
        : typeof meta.company === 'string'
          ? meta.company
          : '',
    fullCompanyName: fullCompanyName,
    inn: typeof meta.inn === 'string' ? meta.inn : '',
    kpp: typeof meta.kpp === 'string' ? meta.kpp : '',
    ogrn: typeof meta.ogrn === 'string' ? meta.ogrn : '',
    bankName: typeof meta.bank_name === 'string' ? meta.bank_name : '',
    bik: typeof meta.bik === 'string' ? meta.bik : '',
    checkingAccount:
      typeof meta.checking_account === 'string' ? meta.checking_account : '',
    legalAddress:
      typeof meta.legal_address === 'string' ? meta.legal_address : '',
    contactPerson:
      typeof meta.contact_person === 'string'
        ? meta.contact_person
        : typeof meta.full_name === 'string'
          ? meta.full_name
          : '',
  };
}

export async function isCustomerAuthenticated(): Promise<boolean> {
  const customer = await getCurrentCustomer();
  return Boolean(customer);
}

export async function customerLogin(email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Введите email и пароль');
  }

  const guestCart = readGuestCartFromStorage();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    throw error;
  }

  const userId = data.user?.id || data.session?.user?.id;

  if (!userId) {
    throw new Error('Не удалось определить пользователя после входа');
  }

  const mergedCart = await mergeGuestCartIntoCustomerCart(userId, guestCart);

  const mapped: CartItem[] = mergedCart.map((item) => ({
    productId: item.product_id,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
  }));

  writeActiveCart(mapped);
}

export async function customerRegister(
  payload: CustomerRegisterPayload
): Promise<void> {
  const email = normalizeText(payload.email);
  const password = normalizeText(payload.password);
  const customerType = mapCustomerType(payload.customerType);

  if (!email || !password) {
    throw new Error('Введите email и пароль');
  }

  if (password.length < 6) {
    throw new Error('Пароль должен быть не короче 6 символов');
  }

  const fullName = normalizeText(payload.fullName);
  const company = normalizeText(payload.company);
  const phone = normalizeText(payload.phone);
  const comment = normalizeText(payload.comment);
  const companyName = normalizeText(payload.companyName);
  const fullCompanyName = normalizeText(payload.fullCompanyName);
  const inn = normalizeText(payload.inn);
  const kpp = normalizeText(payload.kpp);
  const ogrn = normalizeText(payload.ogrn);
  const bankName = normalizeText(payload.bankName);
  const bik = normalizeText(payload.bik);
  const checkingAccount = normalizeText(payload.checkingAccount);
  const legalAddress = normalizeText(payload.legalAddress);
  const contactPerson = normalizeText(payload.contactPerson);

  if (customerType === 'individual') {
    if (!fullName) {
      throw new Error('Введите ФИО');
    }
  }

  if (customerType === 'company') {
    if (!fullCompanyName && !companyName) {
      throw new Error('Введите полное наименование организации');
    }

    if (!inn) {
      throw new Error('Введите ИНН');
    }

    if (!kpp) {
      throw new Error('Введите КПП');
    }

    if (!ogrn) {
      throw new Error('Введите ОГРН');
    }

    if (!bankName) {
      throw new Error('Введите банк');
    }

    if (!bik) {
      throw new Error('Введите БИК');
    }

    if (!checkingAccount) {
      throw new Error('Введите расчетный счет');
    }

    if (!legalAddress) {
      throw new Error('Введите юридический адрес');
    }

    if (!contactPerson) {
      throw new Error('Введите контактное лицо');
    }
  }

  const resolvedFullName =
    customerType === 'company' ? contactPerson || fullName : fullName;

  const resolvedCompanyName =
    customerType === 'company'
      ? fullCompanyName || companyName || company
      : company;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        customer_type: customerType,
        full_name: resolvedFullName,
        company: resolvedCompanyName,
        phone,
        comment,
        company_name: customerType === 'company' ? resolvedCompanyName : '',
        full_company_name: customerType === 'company' ? resolvedCompanyName : '',
        inn,
        kpp,
        ogrn,
        bank_name: bankName,
        bik,
        checking_account: checkingAccount,
        legal_address: legalAddress,
        contact_person: contactPerson,
      },
    },
  });

  if (error) {
    throw error;
  }

  const createdUser = data.user;

  if (!createdUser?.id) {
    throw new Error(
      'Аккаунт создан, но не удалось сразу инициализировать профиль пользователя'
    );
  }

  await upsertCustomerProfile({
    id: createdUser.id,
    email,
    customer_type: customerType,
    full_name: resolvedFullName,
    phone,
    company: resolvedCompanyName,
    comment,
    company_name: customerType === 'company' ? resolvedCompanyName : null,
    full_company_name: customerType === 'company' ? resolvedCompanyName : null,
    inn: customerType === 'company' ? inn : null,
    kpp: customerType === 'company' ? kpp : null,
    ogrn: customerType === 'company' ? ogrn : null,
    bank_name: customerType === 'company' ? bankName : null,
    bik: customerType === 'company' ? bik : null,
    checking_account:
      customerType === 'company' ? checkingAccount : null,
    legal_address: customerType === 'company' ? legalAddress : null,
    contact_person: customerType === 'company' ? contactPerson : null,
  });
}

export async function customerLogout(): Promise<void> {
  clearActiveCart();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function subscribeCustomerAuthChange(
  callback: () => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        await hydrateCustomerCartToActiveState(session.user.id);
      }

      if (event === 'SIGNED_OUT') {
        clearActiveCart();
      }
    } catch (error) {
      console.error('Customer auth sync failed:', error);
    } finally {
      callback();
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    throw new Error('Введите email');
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function updateCustomerPassword(newPassword: string): Promise<void> {
  const password = newPassword.trim();

  if (!password) {
    throw new Error('Введите новый пароль');
  }

  if (password.length < 6) {
    throw new Error('Пароль должен быть не короче 6 символов');
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw error;
  }
}
import { supabase } from '@/lib/supabase';

export type LeadStatus = 'new' | 'in_progress' | 'closed' | 'spam';

export type LeadSource = 'site' | 'product_page' | 'cart' | 'quick_request';

export type LeadItemInput = {
  product_id?: string | null;
  product_name: string;
  product_slug?: string | null;
  quantity?: number | null;
};

export type CreateLeadInput = {
  customer_name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  comment?: string | null;
  page_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  source?: LeadSource | string | null;
  items: LeadItemInput[];
};

export type LeadRow = {
  id: string;
  source: string;
  status: LeadStatus;
  customer_name: string;
  phone: string;
  email: string | null;
  company: string | null;
  comment: string | null;
  page_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadItemRow = {
  id: string;
  lead_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  quantity: number;
  created_at: string;
};

export type CreateLeadResult = {
  leadId: string;
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function normalizePhone(value: unknown): string {
  const raw = String(value ?? '').trim();

  return raw
    .replace(/[^\d+\-() ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuantity(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;

  const normalized = Math.floor(n);
  return normalized > 0 ? normalized : 1;
}

function normalizeLeadItem(item: LeadItemInput): LeadItemInput {
  return {
    product_id: normalizeOptionalText(item.product_id),
    product_name: normalizeText(item.product_name),
    product_slug: normalizeOptionalText(item.product_slug),
    quantity: normalizeQuantity(item.quantity),
  };
}

function validateLeadInput(payload: CreateLeadInput): void {
  const customerName = normalizeText(payload.customer_name);
  const phone = normalizePhone(payload.phone);
  const items = Array.isArray(payload.items) ? payload.items.map(normalizeLeadItem) : [];

  if (!customerName) {
    throw new Error('Укажите имя');
  }

  if (!phone) {
    throw new Error('Укажите телефон');
  }

  if (phone.replace(/[^\d]/g, '').length < 6) {
    throw new Error('Телефон заполнен некорректно');
  }

  if (!items.length) {
    throw new Error('Не выбраны товары для заявки');
  }

  const hasInvalidItem = items.some((item) => !item.product_name);
  if (hasInvalidItem) {
    throw new Error('В заявке есть товар без названия');
  }

  const email = normalizeOptionalText(payload.email);
  if (email) {
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailIsValid) {
      throw new Error('Email заполнен некорректно');
    }
  }
}

function generateLeadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function sendLeadTelegramNotification(payload: {
  leadId: string;
  source: string;
  customerName: string;
  phone: string;
  email: string | null;
  company: string | null;
  comment: string | null;
  pageUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  items: Array<{
    product_name: string;
    product_slug: string | null;
    quantity: number;
  }>;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('send-lead-telegram', {
    body: payload,
  });

  if (error) {
    throw error;
  }
}

export async function createLead(payload: CreateLeadInput): Promise<CreateLeadResult> {
  validateLeadInput(payload);

  const leadId = generateLeadId();
  const customerName = normalizeText(payload.customer_name);
  const phone = normalizePhone(payload.phone);
  const email = normalizeOptionalText(payload.email);
  const company = normalizeOptionalText(payload.company);
  const comment = normalizeOptionalText(payload.comment);
  const pageUrl = normalizeOptionalText(payload.page_url);
  const utmSource = normalizeOptionalText(payload.utm_source);
  const utmMedium = normalizeOptionalText(payload.utm_medium);
  const utmCampaign = normalizeOptionalText(payload.utm_campaign);
  const source = normalizeOptionalText(payload.source) || 'site';

  const items = payload.items.map(normalizeLeadItem);

  const { error: leadError } = await supabase.from('leads').insert({
    id: leadId,
    source,
    status: 'new',
    customer_name: customerName,
    phone,
    email,
    company,
    comment,
    page_url: pageUrl,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
  });

  if (leadError) {
    throw leadError;
  }

  const leadItems = items.map((item) => ({
    lead_id: leadId,
    product_id: item.product_id || null,
    product_name: item.product_name,
    product_slug: item.product_slug || null,
    quantity: normalizeQuantity(item.quantity),
  }));

  const { error: itemsError } = await supabase.from('lead_items').insert(leadItems);

  if (itemsError) {
    throw itemsError;
  }

  try {
    await sendLeadTelegramNotification({
      leadId,
      source,
      customerName,
      phone,
      email,
      company,
      comment,
      pageUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      items: items.map((item) => ({
        product_name: item.product_name,
        product_slug: item.product_slug || null,
        quantity: normalizeQuantity(item.quantity),
      })),
    });
  } catch (error) {
    console.error('Telegram notification failed:', error);
  }

  return {
    leadId,
  };
}

export async function getLeadById(id: string): Promise<LeadRow | null> {
  const normalizedId = normalizeText(id);
  if (!normalizedId) return null;

  const { data, error } = await supabase
    .from('leads')
    .select(`
      id,
      source,
      status,
      customer_name,
      phone,
      email,
      company,
      comment,
      page_url,
      utm_source,
      utm_medium,
      utm_campaign,
      created_at,
      updated_at
    `)
    .eq('id', normalizedId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LeadRow | null) || null;
}

export async function getLeadItemsByLeadId(leadId: string): Promise<LeadItemRow[]> {
  const normalizedLeadId = normalizeText(leadId);
  if (!normalizedLeadId) return [];

  const { data, error } = await supabase
    .from('lead_items')
    .select(`
      id,
      lead_id,
      product_id,
      product_name,
      product_slug,
      quantity,
      created_at
    `)
    .eq('lead_id', normalizedLeadId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as LeadItemRow[]) || [];
}
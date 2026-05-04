import { supabase } from '@/lib/supabase';

export type AdminLeadStatus = 'new' | 'in_progress' | 'closed' | 'spam';

export type AdminLeadListItem = {
  id: string;
  source: string;
  status: AdminLeadStatus;
  customerName: string;
  phone: string;
  email: string;
  company: string;
  comment: string;
  pageUrl: string;
  createdAt: string;
  itemsCount: number;
};

export type AdminLeadItem = {
  id: string;
  leadId: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  createdAt: string;
};

export type AdminLeadDetails = {
  id: string;
  source: string;
  status: AdminLeadStatus;
  customerName: string;
  phone: string;
  email: string;
  company: string;
  comment: string;
  pageUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  createdAt: string;
  updatedAt: string;
  items: AdminLeadItem[];
};

export type GetAdminLeadsParams = {
  search?: string;
  status?: AdminLeadStatus | '';
  limit?: number;
  page?: number;
};

export type GetAdminLeadsResult = {
  items: AdminLeadListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type LeadRow = {
  id: string;
  source: string | null;
  status: AdminLeadStatus;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  comment: string | null;
  page_url: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  created_at: string;
  updated_at?: string;
};

type LeadItemRow = {
  id: string;
  lead_id: string;
  product_id: string | null;
  product_name: string | null;
  product_slug: string | null;
  quantity: number | null;
  created_at: string;
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeLeadStatus(value: unknown): AdminLeadStatus {
  const normalized = normalizeText(value);

  if (
    normalized === 'new' ||
    normalized === 'in_progress' ||
    normalized === 'closed' ||
    normalized === 'spam'
  ) {
    return normalized;
  }

  return 'new';
}

function mapLeadItem(row: LeadItemRow): AdminLeadItem {
  return {
    id: row.id,
    leadId: row.lead_id,
    productId: normalizeText(row.product_id),
    productName: normalizeText(row.product_name),
    productSlug: normalizeText(row.product_slug),
    quantity: Number(row.quantity || 0),
    createdAt: row.created_at,
  };
}

function mapLeadListItem(row: LeadRow, itemsCount: number): AdminLeadListItem {
  return {
    id: row.id,
    source: normalizeText(row.source),
    status: normalizeLeadStatus(row.status),
    customerName: normalizeText(row.customer_name),
    phone: normalizeText(row.phone),
    email: normalizeText(row.email),
    company: normalizeText(row.company),
    comment: normalizeText(row.comment),
    pageUrl: normalizeText(row.page_url),
    createdAt: row.created_at,
    itemsCount,
  };
}

export async function getAdminLeads(
  params?: GetAdminLeadsParams
): Promise<GetAdminLeadsResult> {
  const search = normalizeText(params?.search);
  const status = normalizeText(params?.status);
  const limit = Math.max(1, Number(params?.limit || 20));
  const page = Math.max(1, Number(params?.page || 1));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('leads').select(
    `
      id,
      source,
      status,
      customer_name,
      phone,
      email,
      company,
      comment,
      page_url,
      created_at
    `,
    { count: 'exact' }
  );

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(
      [
        `customer_name.ilike.%${search}%`,
        `phone.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `company.ilike.%${search}%`,
        `comment.ilike.%${search}%`,
      ].join(',')
    );
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const rows = ((data || []) as LeadRow[]) || [];
  const leadIds = rows.map((row) => row.id);

  const itemsCountMap = new Map<string, number>();

  if (leadIds.length) {
    const { data: leadItemsData, error: leadItemsError } = await supabase
      .from('lead_items')
      .select('lead_id')
      .in('lead_id', leadIds);

    if (leadItemsError) {
      throw leadItemsError;
    }

    ((leadItemsData || []) as Array<{ lead_id: string }>).forEach((item) => {
      const current = itemsCountMap.get(item.lead_id) || 0;
      itemsCountMap.set(item.lead_id, current + 1);
    });
  }

  const items = rows.map((row) => mapLeadListItem(row, itemsCountMap.get(row.id) || 0));

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
  };
}

export async function getAdminLeadById(id: string): Promise<AdminLeadDetails | null> {
  const leadId = normalizeText(id);
  if (!leadId) {
    return null;
  }

  const { data, error } = await supabase
    .from('leads')
    .select(
      `
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
    `
    )
    .eq('id', leadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from('lead_items')
    .select(
      `
      id,
      lead_id,
      product_id,
      product_name,
      product_slug,
      quantity,
      created_at
    `
    )
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  const row = data as LeadRow;
  const items = ((itemsData || []) as LeadItemRow[]).map(mapLeadItem);

  return {
    id: row.id,
    source: normalizeText(row.source),
    status: normalizeLeadStatus(row.status),
    customerName: normalizeText(row.customer_name),
    phone: normalizeText(row.phone),
    email: normalizeText(row.email),
    company: normalizeText(row.company),
    comment: normalizeText(row.comment),
    pageUrl: normalizeText(row.page_url),
    utmSource: normalizeText(row.utm_source),
    utmMedium: normalizeText(row.utm_medium),
    utmCampaign: normalizeText(row.utm_campaign),
    createdAt: row.created_at,
    updatedAt: normalizeText(row.updated_at),
    items,
  };
}

export async function updateAdminLeadStatus(
  leadId: string,
  status: AdminLeadStatus
): Promise<void> {
  const normalizedLeadId = normalizeText(leadId);
  const normalizedStatus = normalizeLeadStatus(status);

  if (!normalizedLeadId) {
    throw new Error('Не указан ID заявки');
  }

  const { error } = await supabase
    .from('leads')
    .update({
      status: normalizedStatus,
    })
    .eq('id', normalizedLeadId);

  if (error) {
    throw error;
  }
}
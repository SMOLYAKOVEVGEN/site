import { supabase } from '@/lib/supabase';

export type AdminOption = {
  id: string;
  name: string;
};

export type AdminCategoryTreeItem = {
  id: string;
  name: string;
  source_type: string | null;
  parent_id: string | null;
};

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  availabilityText: string;
  isAvailable: boolean;
  brandName: string;
  categoryName: string;
};

export type AdminProductImage = {
  product_id: string;
  url: string;
  is_main: boolean | null;
  sort_order: number | null;
};

export type AdminProductDocument = {
  product_id: string;
  url: string;
  name: string | null;
  sort_order: number | null;
};

export type AdminProductFormData = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  short_description: string;
  full_description: string;
  is_available: boolean;
  availability_text: string;
  specifications: Record<string, string>;
  brand_id: string;
  category_id: string;
  images: AdminProductImage[];
  documents: AdminProductDocument[];
};

export type AdminCategoryItem = {
  id: string;
  name: string;
  slug: string;
  source_type: string | null;
  parent_id: string | null;
  parent_name: string;
  image: string;
};

export type AdminBrandItem = {
  id: string;
  name: string;
  slug: string;
};

export type ImportProductInput = {
  name: string;
  slug: string;
  sku?: string;
  price?: number;
  brand?: string;
  group?: string;
  subgroup?: string;
  short_description?: string;
  full_description?: string;
  availability_text?: string;
  is_available?: boolean;
  specifications?: Record<string, string>;
  images?: string[];
  documents?: Array<{ name?: string; url: string }>;
};

export type ImportProductsResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export type CatalogResultGroupInput = {
  name: string;
  slug: string;
  url: string;
};

export type CatalogResultCollectionInput = {
  id?: string;
  site_section_id?: string;
  group_slug?: string;
  group_name?: string;
  root_group_slug?: string;
  root_group_name?: string;
  name: string;
  slug: string;
  url: string;
  parent_url?: string;
  image?: string;
  image_alt?: string;
  image_title?: string;
  sort_order?: number;
};

export type CatalogResultProductImageInput = {
  full_image?: string;
  preview_image?: string;
  alt?: string;
  title?: string;
};

export type CatalogResultSpecInput = {
  name: string;
  value: string;
};

export type CatalogResultProductInput = {
  site_id?: string;
  url: string;
  slug: string;
  name: string;
  article?: string;
  brand?: string;

  group_slug?: string;
  group_name?: string;

  subgroup_slug?: string;
  subgroup_name?: string;
  subgroup_url?: string;

  availability_raw?: string;
  availability?: string;
  stock_qty?: number | null;

  price_value?: number | null;
  currency?: string;
  measure?: string;

  preview_image?: string;
  full_image?: string;
  main_image?: string;
  gallery_images?: CatalogResultProductImageInput[];

  description?: string;
  specifications?: CatalogResultSpecInput[] | Record<string, string>;
};

export type CatalogResultInput = {
  group?: CatalogResultGroupInput;
  collections?: CatalogResultCollectionInput[];
  products?: CatalogResultProductInput[];
  stats?: {
    groups_count?: number;
    collections_count?: number;
    products_count?: number;
    issues_count?: number;
  };
};

type CategoryDbRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  source_url: string | null;
  root_group_slug: string | null;
  root_group_name: string | null;
  source_type: string | null;
  level: number | null;
  image: string | null;
};

function safeText(value: unknown): string {
  return String(value ?? '').trim();
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toNullableText(value: unknown): string | null {
  const text = safeText(value);
  return text || null;
}

function toBooleanAvailability(value: unknown): boolean {
  return safeText(value) === 'in_stock';
}

function normalizePrice(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSpecs(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = String(v ?? '');
  }
  return result;
}

function specsArrayToObject(
  value: CatalogResultSpecInput[] | Record<string, string> | null | undefined
): Record<string, string> {
  if (!value) return {};

  if (Array.isArray(value)) {
    const result: Record<string, string> = {};
    for (const item of value) {
      const name = safeText(item?.name);
      const val = safeText(item?.value);
      if (name && val && !(name in result)) {
        result[name] = val;
      }
    }
    return result;
  }

  return normalizeSpecs(value);
}

function buildShortDescriptionFromDescription(value: unknown, maxLen = 220): string {
  const text = safeText(value);
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3).trimEnd() + '...';
}

function uniqueStrings(values: unknown[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = safeText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }

  return result;
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const result: T[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function normalizeComparableUrl(value: unknown): string {
  const text = safeText(value);
  if (!text) return '';

  try {
    const url = new URL(text);
    url.hash = '';
    url.search = '';
    let normalized = url.toString();
    if (!normalized.endsWith('/')) normalized += '/';
    return normalized;
  } catch {
    return text.endsWith('/') ? text : `${text}/`;
  }
}

function analyzeCatalogProductPath(params: {
  productUrl: string;
  rootGroupSlug: string;
}): {
  mode: 'group_product' | 'group_subgroup_product' | 'unknown';
  subgroupSlug: string;
  subgroupUrl: string;
} {
  const productUrl = normalizeComparableUrl(params.productUrl);
  const rootGroupSlug = safeText(params.rootGroupSlug);

  if (!productUrl || !rootGroupSlug) {
    return {
      mode: 'unknown',
      subgroupSlug: '',
      subgroupUrl: '',
    };
  }

  try {
    const url = new URL(productUrl);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts.length === 3 && parts[0] === 'catalog' && parts[1] === rootGroupSlug) {
      return {
        mode: 'group_product',
        subgroupSlug: '',
        subgroupUrl: '',
      };
    }

    if (parts.length >= 4 && parts[0] === 'catalog' && parts[1] === rootGroupSlug) {
      const subgroupSlug = safeText(parts[2]);

      if (!subgroupSlug) {
        return {
          mode: 'unknown',
          subgroupSlug: '',
          subgroupUrl: '',
        };
      }

      return {
        mode: 'group_subgroup_product',
        subgroupSlug,
        subgroupUrl: `${url.origin}/catalog/${rootGroupSlug}/${subgroupSlug}/`,
      };
    }

    return {
      mode: 'unknown',
      subgroupSlug: '',
      subgroupUrl: '',
    };
  } catch {
    return {
      mode: 'unknown',
      subgroupSlug: '',
      subgroupUrl: '',
    };
  }
}

function extractCatalogProductImages(product: CatalogResultProductInput): string[] {
  const gallery = safeArray(product.gallery_images);

  return uniqueStrings([
    product.main_image,
    product.full_image,
    product.preview_image,
    ...gallery.flatMap((item) => [item?.full_image, item?.preview_image]),
  ]);
}

async function uploadCatalogProductImages(params: {
  product: CatalogResultProductInput;
  rootGroupSlug: string;
  productSlug: string;
}): Promise<string[]> {
  const rawUrls = extractCatalogProductImages(params.product);
  const uploadedUrls: string[] = [];

  for (let index = 0; index < rawUrls.length; index++) {
    const rawUrl = safeText(rawUrls[index]);
    if (!rawUrl) continue;

    try {
      const uploadedUrl = await uploadExternalImageToStorage({
        imageUrl: rawUrl,
        bucket: 'catalog-media',
        targetPath: `products/${params.rootGroupSlug}/${params.productSlug}/${index}`,
      });

      if (uploadedUrl) {
        uploadedUrls.push(uploadedUrl);
      }
    } catch (e) {
      console.error('Product image upload failed:', {
        product: params.product.name,
        slug: params.product.slug,
        imageUrl: rawUrl,
        error: e,
      });

      uploadedUrls.push(rawUrl);
    }
  }

  return uniqueStrings(uploadedUrls);
}

async function uploadExternalImageToStorage(params: {
  imageUrl?: string | null;
  targetPath: string;
  bucket?: string;
}): Promise<string | null> {
  const imageUrl = safeText(params.imageUrl);
  if (!imageUrl) return null;

  if (imageUrl.includes('/storage/v1/object/public/')) {
    return imageUrl;
  }

  const { data, error } = await supabase.functions.invoke('download-catalog-image', {
    body: {
      imageUrl,
      bucket: params.bucket || 'catalog-media',
      targetPath: params.targetPath,
    },
  });

  if (error) {
    throw error;
  }

  const publicUrl = safeText(data?.publicUrl);
  if (!publicUrl) {
    throw new Error(`Не получен publicUrl для изображения: ${imageUrl}`);
  }

  return publicUrl;
}

async function getBrandIdByName(
  brandName: string,
  brandCache: Map<string, string>
): Promise<string | null> {
  const normalizedName = safeText(brandName);
  if (!normalizedName) return null;

  const cacheKey = normalizedName.toLowerCase();
  const cached = brandCache.get(cacheKey);
  if (cached) return cached;

  const brandSlug = normalizedName
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const { data: existingBySlug, error: existingBySlugError } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('slug', brandSlug)
    .maybeSingle();

  if (existingBySlugError) throw existingBySlugError;

  if (existingBySlug?.id) {
    brandCache.set(cacheKey, existingBySlug.id);
    return existingBySlug.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('brands')
    .insert({
      name: normalizedName,
      slug: brandSlug || `brand-${Date.now()}`,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;

  brandCache.set(cacheKey, inserted.id);
  return inserted.id;
}

async function getCategoryBySourceUrl(sourceUrl: string): Promise<CategoryDbRow | null> {
  const normalizedSourceUrl = safeText(sourceUrl);
  if (!normalizedSourceUrl) return null;

  const { data, error } = await supabase
    .from('categories')
    .select(
      'id, name, slug, parent_id, source_url, root_group_slug, root_group_name, source_type, level, image'
    )
    .eq('source_url', normalizedSourceUrl)
    .maybeSingle();

  if (error) throw error;
  return (data as CategoryDbRow | null) || null;
}

async function getCategoryBySlugAndParent(
  slug: string,
  parentId: string | null
): Promise<CategoryDbRow | null> {
  let query = supabase
    .from('categories')
    .select(
      'id, name, slug, parent_id, source_url, root_group_slug, root_group_name, source_type, level, image'
    )
    .eq('slug', slug);

  query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return (data as CategoryDbRow | null) || null;
}

async function upsertCategoryNode(params: {
  name: string;
  slug: string;
  parentId: string | null;
  sourceUrl?: string;
  sourceType?: string;
  rootGroupSlug?: string;
  rootGroupName?: string;
  level?: number;
  image?: string;
}): Promise<string> {
  const name = safeText(params.name);
  const slug = safeText(params.slug);
  const sourceUrl = safeText(params.sourceUrl);

  if (!name || !slug) {
    throw new Error(`Категория не может быть создана без name/slug: ${name} / ${slug}`);
  }

  let existing: CategoryDbRow | null = null;

  if (sourceUrl) {
    existing = await getCategoryBySourceUrl(sourceUrl);
  }

  if (!existing) {
    existing = await getCategoryBySlugAndParent(slug, params.parentId);
  }

  const payload = {
    name,
    slug,
    parent_id: params.parentId,
    source_url: toNullableText(sourceUrl),
    source_type: toNullableText(params.sourceType),
    root_group_slug: toNullableText(params.rootGroupSlug),
    root_group_name: toNullableText(params.rootGroupName),
    level: params.level ?? null,
    image: toNullableText(params.image),
  };

  if (existing?.id) {
    const { error } = await supabase.from('categories').update(payload).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.from('categories').insert(payload).select('id').single();

  if (error) throw error;
  return data.id as string;
}

async function ensureRootGroupCategory(group: CatalogResultGroupInput): Promise<string> {
  return await upsertCategoryNode({
    name: group.name,
    slug: group.slug,
    parentId: null,
    sourceUrl: group.url,
    sourceType: 'group',
    rootGroupSlug: group.slug,
    rootGroupName: group.name,
    level: 0,
  });
}

async function ensureCollectionCategory(
  collection: CatalogResultCollectionInput,
  rootGroupId: string,
  rootGroupSlug: string,
  rootGroupName: string,
  rootGroupUrl?: string
): Promise<string> {
  const ownUrl = safeText(collection.url);
  if (!ownUrl) {
    throw new Error(`Collection без url: ${collection.name || collection.slug || 'unknown'}`);
  }

  const parentUrl = safeText(collection.parent_url);
  const parentId =
    parentUrl && rootGroupUrl && parentUrl === rootGroupUrl
      ? rootGroupId
      : rootGroupId;

  let categoryImageUrl: string | null = null;

  try {
    categoryImageUrl = await uploadExternalImageToStorage({
      imageUrl: collection.image,
      bucket: 'catalog-media',
      targetPath: `categories/${rootGroupSlug}/${safeText(collection.slug)}`,
    });
  } catch (e) {
    console.error('Category image upload failed:', {
      collection: collection.name,
      slug: collection.slug,
      image: collection.image,
      error: e,
    });
    categoryImageUrl = toNullableText(collection.image);
  }

  return await upsertCategoryNode({
    name: collection.name,
    slug: collection.slug,
    parentId,
    sourceUrl: ownUrl,
    sourceType: 'subgroup',
    rootGroupSlug,
    rootGroupName,
    level: 1,
    image: categoryImageUrl,
  });
}

function resolveProductRootGroup(
  product: CatalogResultProductInput,
  catalogGroup: CatalogResultGroupInput | null | undefined
): { slug: string; name: string; url: string } {
  const slug = safeText(product.group_slug) || safeText(catalogGroup?.slug);
  const name = safeText(product.group_name) || safeText(catalogGroup?.name);
  const url = safeText(catalogGroup?.url);
  return { slug, name, url };
}

export async function getAdminProducts(params?: {
  search?: string;
  brandId?: string;
  categoryId?: string;
  limit?: number;
  page?: number;
}) {
  const search = params?.search?.trim() || '';
  const brandId = params?.brandId || '';
  const categoryId = params?.categoryId || '';
  const limit = params?.limit ?? 20;
  const page = params?.page ?? 1;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('products')
    .select(
      'id, name, slug, sku, price, is_available, availability_text, brand_id, category_id',
      {
        count: 'exact',
      }
    );

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (brandId) {
    query = query.eq('brand_id', brandId);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error, count } = await query.order('name', { ascending: true }).range(from, to);

  if (error) throw error;

  const rows = (data || []) as Array<{
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    price: number | null;
    is_available: boolean | null;
    availability_text: string | null;
    brand_id: string | null;
    category_id: string | null;
  }>;

  const brandIds = [...new Set(rows.map((r) => r.brand_id).filter(Boolean))] as string[];
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter(Boolean))] as string[];

  const [brandsRes, categoriesRes] = await Promise.all([
    brandIds.length
      ? supabase.from('brands').select('id, name').in('id', brandIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length
      ? supabase.from('categories').select('id, name').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  const brandMap = new Map<string, string>();
  ((brandsRes.data || []) as Array<{ id: string; name: string }>).forEach((b) => {
    brandMap.set(b.id, b.name);
  });

  const categoryMap = new Map<string, string>();
  ((categoriesRes.data || []) as Array<{ id: string; name: string }>).forEach((c) => {
    categoryMap.set(c.id, c.name);
  });

  const items: AdminProductListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sku: r.sku || '',
    price: normalizePrice(r.price),
    availabilityText: r.availability_text || '',
    isAvailable: Boolean(r.is_available),
    brandName: r.brand_id ? brandMap.get(r.brand_id) || '' : '',
    categoryName: r.category_id ? categoryMap.get(r.category_id) || '' : '',
  }));

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
  };
}

export async function getAdminBrandsOptions(): Promise<AdminOption[]> {
  const { data, error } = await supabase.from('brands').select('id, name').order('name', {
    ascending: true,
  });

  if (error) throw error;
  return ((data || []) as Array<{ id: string; name: string }>).map((x) => ({
    id: x.id,
    name: x.name,
  }));
}

export async function getAdminCategoriesOptions(): Promise<AdminOption[]> {
  const { data, error } = await supabase.from('categories').select('id, name').order('name', {
    ascending: true,
  });

  if (error) throw error;
  return ((data || []) as Array<{ id: string; name: string }>).map((x) => ({
    id: x.id,
    name: x.name,
  }));
}

export async function getAdminCategoryTree(): Promise<AdminCategoryTreeItem[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, source_type, parent_id')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as AdminCategoryTreeItem[];
}

export async function getAdminProductById(id: string): Promise<AdminProductFormData | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      sku,
      price,
      short_description,
      full_description,
      is_available,
      availability_text,
      specifications,
      brand_id,
      category_id
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [imagesRes, documentsRes] = await Promise.all([
    supabase
      .from('product_images')
      .select('product_id, url, is_main, sort_order')
      .eq('product_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_documents')
      .select('product_id, url, name, sort_order')
      .eq('product_id', id)
      .order('sort_order', { ascending: true }),
  ]);

  if (imagesRes.error) throw imagesRes.error;
  if (documentsRes.error) throw documentsRes.error;

  return {
    id: data.id,
    name: data.name || '',
    slug: data.slug || '',
    sku: data.sku || '',
    price: normalizePrice(data.price),
    short_description: data.short_description || '',
    full_description: data.full_description || '',
    is_available: Boolean(data.is_available),
    availability_text: data.availability_text || '',
    specifications: normalizeSpecs(data.specifications),
    brand_id: data.brand_id || '',
    category_id: data.category_id || '',
    images: (imagesRes.data || []) as AdminProductImage[],
    documents: (documentsRes.data || []) as AdminProductDocument[],
  };
}

export async function createAdminProduct(initial?: Partial<AdminProductFormData>): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: initial?.name || 'Новый товар',
      slug: initial?.slug || `new-product-${Date.now()}`,
      sku: initial?.sku || '',
      price: initial?.price || 0,
      description: initial?.full_description || initial?.short_description || '',
      short_description: initial?.short_description || '',
      full_description: initial?.full_description || '',
      is_available: initial?.is_available ?? false,
      availability_text: initial?.availability_text || '',
      specifications: initial?.specifications || {},
      brand_id: initial?.brand_id || null,
      category_id: initial?.category_id || null,
    })
    .select('id')
    .single();

  if (error) throw error;

  const productId = data.id as string;

  const images = (initial?.images || [])
    .filter((x) => x.url?.trim())
    .map((x, index) => ({
      product_id: productId,
      url: x.url.trim(),
      is_main: Boolean(x.is_main),
      sort_order: index,
    }));

  if (images.length) {
    const insImages = await supabase.from('product_images').insert(images);
    if (insImages.error) throw insImages.error;
  }

  const documents = (initial?.documents || [])
    .filter((x) => x.url?.trim())
    .map((x, index) => ({
      product_id: productId,
      url: x.url.trim(),
      name: x.name?.trim() || '',
      sort_order: index,
    }));

  if (documents.length) {
    const insDocs = await supabase.from('product_documents').insert(documents);
    if (insDocs.error) throw insDocs.error;
  }

  return productId;
}

export async function updateAdminProduct(payload: AdminProductFormData): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: payload.name,
      slug: payload.slug,
      sku: payload.sku,
      price: payload.price,
      description: payload.full_description || payload.short_description || '',
      short_description: payload.short_description,
      full_description: payload.full_description,
      is_available: payload.is_available,
      availability_text: payload.availability_text,
      specifications: payload.specifications,
      brand_id: payload.brand_id || null,
      category_id: payload.category_id || null,
    })
    .eq('id', payload.id);

  if (error) throw error;

  const delImages = await supabase.from('product_images').delete().eq('product_id', payload.id);
  if (delImages.error) throw delImages.error;

  const validImages = payload.images
    .filter((x) => x.url?.trim())
    .map((x, index) => ({
      product_id: payload.id,
      url: x.url.trim(),
      is_main: Boolean(x.is_main),
      sort_order: index,
    }));

  if (validImages.length) {
    const insImages = await supabase.from('product_images').insert(validImages);
    if (insImages.error) throw insImages.error;
  }

  const delDocs = await supabase.from('product_documents').delete().eq('product_id', payload.id);
  if (delDocs.error) throw delDocs.error;

  const validDocs = payload.documents
    .filter((x) => x.url?.trim())
    .map((x, index) => ({
      product_id: payload.id,
      url: x.url.trim(),
      name: x.name?.trim() || '',
      sort_order: index,
    }));

  if (validDocs.length) {
    const insDocs = await supabase.from('product_documents').insert(validDocs);
    if (insDocs.error) throw insDocs.error;
  }
}

export async function deleteAdminProduct(id: string): Promise<void> {
  const [imgDel, docDel, prodDel] = await Promise.all([
    supabase.from('product_images').delete().eq('product_id', id),
    supabase.from('product_documents').delete().eq('product_id', id),
    supabase.from('products').delete().eq('id', id),
  ]);

  if (imgDel.error) throw imgDel.error;
  if (docDel.error) throw docDel.error;
  if (prodDel.error) throw prodDel.error;
}

export async function getAdminCategories(): Promise<AdminCategoryItem[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, source_type, parent_id, image')
    .order('name', { ascending: true });

  if (error) throw error;

  const rows = (data || []) as Array<{
    id: string;
    name: string;
    slug: string;
    source_type: string | null;
    parent_id: string | null;
    image: string | null;
  }>;

  const parentIds = [...new Set(rows.map((r) => r.parent_id).filter(Boolean))] as string[];
  const parentMap = new Map<string, string>();

  if (parentIds.length) {
    const parentRes = await supabase.from('categories').select('id, name').in('id', parentIds);
    if (parentRes.error) throw parentRes.error;
    ((parentRes.data || []) as Array<{ id: string; name: string }>).forEach((p) => {
      parentMap.set(p.id, p.name);
    });
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    source_type: r.source_type,
    parent_id: r.parent_id,
    parent_name: r.parent_id ? parentMap.get(r.parent_id) || '' : '',
    image: r.image || '',
  }));
}

export async function updateAdminCategory(item: AdminCategoryItem): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({
      name: item.name,
      slug: item.slug,
      source_type: item.source_type,
      parent_id: item.parent_id || null,
      image: item.image || null,
    })
    .eq('id', item.id);

  if (error) throw error;
}

export async function createAdminCategory(): Promise<string> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: 'Новая категория',
      slug: `new-category-${Date.now()}`,
      source_type: 'group',
      parent_id: null,
      image: null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getAdminBrands(): Promise<AdminBrandItem[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug')
    .order('name', { ascending: true });

  if (error) throw error;

  return ((data || []) as Array<{ id: string; name: string; slug: string }>).map((x) => ({
    id: x.id,
    name: x.name,
    slug: x.slug,
  }));
}

export async function updateAdminBrand(item: AdminBrandItem): Promise<void> {
  const { error } = await supabase
    .from('brands')
    .update({
      name: item.name,
      slug: item.slug,
    })
    .eq('id', item.id);

  if (error) throw error;
}

export async function createAdminBrand(): Promise<string> {
  const { data, error } = await supabase
    .from('brands')
    .insert({
      name: 'Новый бренд',
      slug: `new-brand-${Date.now()}`,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getAdminDashboardStats() {
  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (brandsRes.error) throw brandsRes.error;

  return {
    products: productsRes.count || 0,
    categories: categoriesRes.count || 0,
    brands: brandsRes.count || 0,
  };
}

export async function importProducts(items: ImportProductInput[]): Promise<ImportProductsResult> {
  const [brands, categories] = await Promise.all([getAdminBrandsOptions(), getAdminCategoryTree()]);

  const brandMap = new Map(brands.map((b) => [b.name.trim().toLowerCase(), b.id]));

  const groups = categories.filter((c) => c.source_type === 'group');
  const subgroups = categories.filter((c) => c.source_type === 'subgroup');

  const groupMap = new Map(groups.map((g) => [g.name.trim().toLowerCase(), g]));
  const subgroupMap = new Map(subgroups.map((s) => [s.name.trim().toLowerCase(), s]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of items) {
    const name = String(raw.name || '').trim();
    const slug = String(raw.slug || '').trim();
    const sku = String(raw.sku || '').trim();

    if (!name || !slug) {
      skipped++;
      errors.push(`Пропущено: отсутствует name или slug`);
      continue;
    }

    try {
      let brand_id: string | null = null;
      let category_id: string | null = null;

      if (raw.brand) {
        brand_id = brandMap.get(String(raw.brand).trim().toLowerCase()) || null;
      }

      const groupName = String(raw.group || '').trim().toLowerCase();
      const subgroupName = String(raw.subgroup || '').trim().toLowerCase();

      if (subgroupName) {
        const subgroup = subgroupMap.get(subgroupName);
        if (subgroup) {
          if (groupName) {
            const group = groupMap.get(groupName);
            if (group && subgroup.parent_id === group.id) {
              category_id = subgroup.id;
            } else {
              errors.push(`У товара "${name}" подгруппа не принадлежит выбранной группе`);
              skipped++;
              continue;
            }
          } else {
            category_id = subgroup.id;
          }
        }
      }

      const specifications =
        raw.specifications && typeof raw.specifications === 'object' && !Array.isArray(raw.specifications)
          ? raw.specifications
          : {};

      const images = Array.isArray(raw.images)
        ? raw.images.filter(Boolean).map((x) => String(x).trim()).filter(Boolean)
        : [];

      const documents = Array.isArray(raw.documents)
        ? raw.documents
            .filter((x) => x && typeof x === 'object' && 'url' in x)
            .map((x) => ({
              name: String(x.name || '').trim(),
              url: String(x.url || '').trim(),
            }))
            .filter((x) => x.url)
        : [];

      const { data: existing, error: existingError } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        await updateAdminProduct({
          id: existing.id,
          name,
          slug,
          sku,
          price: Number(raw.price || 0),
          short_description: String(raw.short_description || ''),
          full_description: String(raw.full_description || ''),
          is_available: Boolean(raw.is_available),
          availability_text: String(raw.availability_text || ''),
          specifications,
          brand_id: brand_id || '',
          category_id: category_id || '',
          images: images.map((url, index) => ({
            product_id: existing.id,
            url,
            is_main: index === 0,
            sort_order: index,
          })),
          documents: documents.map((doc, index) => ({
            product_id: existing.id,
            url: doc.url,
            name: doc.name || '',
            sort_order: index,
          })),
        });

        updated++;
      } else {
        await createAdminProduct({
          id: '',
          name,
          slug,
          sku,
          price: Number(raw.price || 0),
          short_description: String(raw.short_description || ''),
          full_description: String(raw.full_description || ''),
          is_available: Boolean(raw.is_available),
          availability_text: String(raw.availability_text || ''),
          specifications,
          brand_id: brand_id || '',
          category_id: category_id || '',
          images: images.map((url, index) => ({
            product_id: '',
            url,
            is_main: index === 0,
            sort_order: index,
          })),
          documents: documents.map((doc, index) => ({
            product_id: '',
            url: doc.url,
            name: doc.name || '',
            sort_order: index,
          })),
        });

        created++;
      }
    } catch (e: any) {
      errors.push(`Ошибка для "${name}": ${e?.message || 'unknown error'}`);
    }
  }

  return { created, updated, skipped, errors };
}

export async function importCatalogResult(
  catalog: CatalogResultInput
): Promise<ImportProductsResult> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const rootGroup = catalog.group;
  const collections = safeArray(catalog.collections);
  const products = safeArray(catalog.products);

  if (!rootGroup || !safeText(rootGroup.name) || !safeText(rootGroup.slug) || !safeText(rootGroup.url)) {
    return {
      created: 0,
      updated: 0,
      skipped: products.length,
      errors: ['В catalog_result отсутствует корректный корневой group'],
    };
  }

  const brandCache = new Map<string, string>();
  const categoryIdByUrl = new Map<string, string>();

  let rootGroupId: string;

  try {
    rootGroupId = await ensureRootGroupCategory(rootGroup);
    categoryIdByUrl.set(normalizeComparableUrl(rootGroup.url), rootGroupId);
  } catch (e: any) {
    return {
      created: 0,
      updated: 0,
      skipped: products.length,
      errors: [`Ошибка импорта root group "${rootGroup.name}": ${e?.message || 'unknown error'}`],
    };
  }

  for (const collection of collections) {
    const ownUrl = safeText(collection.url);
    const name = safeText(collection.name);
    const slug = safeText(collection.slug);

    if (!ownUrl || !name || !slug) {
      skipped++;
      errors.push(`Пропущена collection без url/name/slug: ${name || slug || ownUrl || 'unknown'}`);
      continue;
    }

    try {
      const categoryId = await ensureCollectionCategory(
        {
          ...collection,
          group_slug: safeText(collection.group_slug || rootGroup.slug),
          group_name: safeText(collection.group_name || rootGroup.name),
          root_group_slug: safeText(collection.root_group_slug || rootGroup.slug),
          root_group_name: safeText(collection.root_group_name || rootGroup.name),
        },
        rootGroupId,
        rootGroup.slug,
        rootGroup.name,
        rootGroup.url
      );

      categoryIdByUrl.set(normalizeComparableUrl(ownUrl), categoryId);
    } catch (e: any) {
      errors.push(`Ошибка импорта collection "${name}": ${e?.message || 'unknown error'}`);
    }
  }

  for (const product of products) {
    const sourceUrl = safeText(product.url);
    const name = safeText(product.name);
    const slug = safeText(product.slug);

    if (!sourceUrl || !name || !slug) {
      skipped++;
      errors.push(`Пропущен товар без url/name/slug: ${name || slug || sourceUrl || 'unknown'}`);
      continue;
    }

    try {
      const resolvedRoot = resolveProductRootGroup(product, rootGroup);

      const rawSubgroupUrl = safeText(product.subgroup_url);
      const rawSubgroupSlug = safeText(product.subgroup_slug);
      const subgroupName = safeText(product.subgroup_name);

      const pathInfo = analyzeCatalogProductPath({
        productUrl: sourceUrl,
        rootGroupSlug: resolvedRoot.slug || rootGroup.slug,
      });

      const subgroupUrl = normalizeComparableUrl(rawSubgroupUrl || pathInfo.subgroupUrl);
      const subgroupSlug = safeText(rawSubgroupSlug || pathInfo.subgroupSlug);

      let categoryId: string | null = null;
      const rootCategoryId: string | null = rootGroupId;

      console.log('IMPORT CATEGORY DEBUG', {
        productName: name,
        sourceUrl,
        rawSubgroupUrl,
        rawSubgroupSlug,
        subgroupName,
        pathMode: pathInfo.mode,
        derivedSubgroupUrl: pathInfo.subgroupUrl,
        derivedSubgroupSlug: pathInfo.subgroupSlug,
        finalSubgroupUrl: subgroupUrl,
        finalSubgroupSlug: subgroupSlug,
      });

      if (subgroupUrl || subgroupSlug || subgroupName || pathInfo.mode === 'group_subgroup_product') {
        if (subgroupUrl) {
          categoryId = categoryIdByUrl.get(subgroupUrl) || null;
        }

        if (!categoryId && subgroupSlug) {
          const subgroupRow = await getCategoryBySlugAndParent(subgroupSlug, rootGroupId);
          if (subgroupRow?.id) {
            categoryId = subgroupRow.id;

            if (subgroupUrl) {
              categoryIdByUrl.set(subgroupUrl, subgroupRow.id);
            }
          }
        }

        if (!categoryId) {
          skipped++;
          errors.push(
            `Для товара "${name}" не найдена подгруппа. subgroup_url="${subgroupUrl}", subgroup_slug="${subgroupSlug}", subgroup_name="${subgroupName}", source_url="${sourceUrl}"`
          );
          continue;
        }
      } else if (pathInfo.mode === 'group_product' || (!subgroupUrl && !subgroupSlug && !subgroupName)) {
        categoryId = rootGroupId;

        if (!categoryId) {
          skipped++;
          errors.push(`Для товара "${name}" не найдена root group: ${resolvedRoot.name}`);
          continue;
        }
      } else {
        skipped++;
        errors.push(`Для товара "${name}" не удалось определить структуру пути: ${sourceUrl}`);
        continue;
      }

      const brandId = await getBrandIdByName(safeText(product.brand), brandCache);

      const productPayload = {
        name,
        slug,
        sku: toNullableText(product.article),
        price: product.price_value ?? null,
        description: toNullableText(product.description),
        short_description: buildShortDescriptionFromDescription(product.description),
        full_description: safeText(product.description),
        is_available: toBooleanAvailability(product.availability),
        availability_text: toNullableText(product.availability_raw),
        specifications: specsArrayToObject(product.specifications),
        brand_id: brandId,
        category_id: categoryId,
        source_url: sourceUrl,
        root_group_slug: toNullableText(resolvedRoot.slug),
        root_group_name: toNullableText(resolvedRoot.name),
        source_site_id: toNullableText(product.site_id),
        stock_qty: product.stock_qty ?? null,
        currency: toNullableText(product.currency),
        measure: toNullableText(product.measure),
      };

      let existingId: string | null = null;

      const { data: existingBySourceUrl, error: existingBySourceUrlError } = await supabase
        .from('products')
        .select('id')
        .eq('source_url', sourceUrl)
        .maybeSingle();

      if (existingBySourceUrlError) throw existingBySourceUrlError;

      if (existingBySourceUrl?.id) {
        existingId = existingBySourceUrl.id;
      } else {
        const { data: existingBySlug, error: existingBySlugError } = await supabase
          .from('products')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (existingBySlugError) throw existingBySlugError;
        if (existingBySlug?.id) {
          existingId = existingBySlug.id;
        }
      }

      let productId = existingId;

      if (productId) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', productId);

        if (updateError) throw updateError;
        updated++;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('products')
          .insert(productPayload)
          .select('id')
          .single();

        if (insertError) throw insertError;
        productId = inserted.id as string;
        created++;
      }

      if (!productId) {
        throw new Error(`Не удалось определить product_id для "${name}"`);
      }

      const { error: deleteProductCategoriesError } = await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', productId);

      if (deleteProductCategoriesError) throw deleteProductCategoriesError;

      const relationRows: Array<{
        product_id: string;
        category_id: string;
        is_primary: boolean;
        sort_order: number;
      }> = [
        {
          product_id: productId,
          category_id: categoryId,
          is_primary: true,
          sort_order: 0,
        },
      ];

      if (rootCategoryId && rootCategoryId !== categoryId) {
        relationRows.push({
          product_id: productId,
          category_id: rootCategoryId,
          is_primary: false,
          sort_order: 1,
        });
      }

      const { error: insertRelationsError } = await supabase
        .from('product_categories')
        .insert(relationRows);

      if (insertRelationsError) throw insertRelationsError;

      const imageUrls = await uploadCatalogProductImages({
        product,
        rootGroupSlug: resolvedRoot.slug || 'group',
        productSlug: slug,
      });

      const { error: deleteImagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      if (deleteImagesError) throw deleteImagesError;

      if (imageUrls.length) {
        const imageRows = imageUrls.map((url, index) => ({
          product_id: productId,
          url,
          is_main: index === 0,
          sort_order: index,
        }));

        const { error: insertImagesError } = await supabase
          .from('product_images')
          .insert(imageRows);

        if (insertImagesError) throw insertImagesError;
      }
    } catch (e: any) {
      errors.push(`Ошибка для товара "${name}": ${e?.message || 'unknown error'}`);
    }
  }

  return {
    created,
    updated,
    skipped,
    errors,
  };
}

export async function uploadAdminFile(file: File, folder: 'images' | 'documents') {
  const ext = file.name.split('.').pop() || 'bin';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from('catalog-media').upload(fileName, file, {
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('catalog-media').getPublicUrl(fileName);
  return data.publicUrl;
}
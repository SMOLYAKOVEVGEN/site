import 'dotenv/config';
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET || 'catalog-media';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function safeText(value) {
  return String(value ?? '').trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNullableText(value) {
  const text = safeText(value);
  return text || null;
}

function toBooleanAvailability(value) {
  const text = safeText(value).toLowerCase();
  return text === 'in_stock' || text === 'в наличии';
}

function normalizeSpecs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [k, v] of Object.entries(value)) {
    const key = safeText(k);
    const val = safeText(v);
    if (key && val) result[key] = val;
  }
  return result;
}

function specsArrayToObject(value) {
  if (!value) return {};

  if (Array.isArray(value)) {
    const result = {};
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

function uniqueStrings(values) {
  const result = [];
  const seen = new Set();

  for (const value of values) {
    const text = safeText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }

  return result;
}

function extractCatalogProductImages(product) {
  const gallery = safeArray(product.gallery_images);

  return uniqueStrings([
    product.main_image,
    product.full_image,
    product.preview_image,
    ...gallery.flatMap((item) => [item?.full_image, item?.preview_image]),
  ]);
}

function buildShortDescriptionFromDescription(value, maxLen = 220) {
  const text = safeText(value);
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3).trimEnd() + '...';
}

function getRootSlugFromCatalogUrl(url) {
  const text = safeText(url);
  if (!text) return '';

  try {
    const pathname = new URL(text).pathname;
    const parts = pathname.split('/').filter(Boolean);
    const catalogIndex = parts.indexOf('catalog');
    if (catalogIndex >= 0 && parts[catalogIndex + 1]) {
      return safeText(parts[catalogIndex + 1]);
    }
  } catch {
    const parts = text.split('/').filter(Boolean);
    const catalogIndex = parts.indexOf('catalog');
    if (catalogIndex >= 0 && parts[catalogIndex + 1]) {
      return safeText(parts[catalogIndex + 1]);
    }
  }

  return '';
}

function getProductRootGroup(product, catalogRootGroup = null) {
  const explicitSlug = safeText(product.root_group_slug);
  const explicitName = safeText(product.root_group_name);

  if (explicitSlug) {
    return {
      slug: explicitSlug,
      name: explicitName || safeText(catalogRootGroup?.name),
    };
  }

  const catalogSlug = safeText(catalogRootGroup?.slug);
  const catalogName = safeText(catalogRootGroup?.name);

  if (catalogSlug) {
    return {
      slug: catalogSlug,
      name: explicitName || catalogName,
    };
  }

  const urlDerivedSlug = getRootSlugFromCatalogUrl(product.url);

  return {
    slug: urlDerivedSlug,
    name: explicitName || catalogName,
  };
}

function slugifyFilenamePart(value) {
  return safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadCategoryMapFromDb() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, source_url');

  if (error) throw error;

  const categoryIdByUrl = new Map();

  for (const row of data || []) {
    const sourceUrl = safeText(row.source_url);
    if (sourceUrl && row.id) {
      categoryIdByUrl.set(sourceUrl, row.id);
    }
  }

  return { categoryIdByUrl };
}

function sanitizePathPart(value, fallback = 'item') {
  const result = slugifyFilenamePart(value);
  return result || fallback;
}

function extensionFromContentType(contentType) {
  const text = safeText(contentType).toLowerCase();
  if (text.includes('image/jpeg')) return 'jpg';
  if (text.includes('image/png')) return 'png';
  if (text.includes('image/webp')) return 'webp';
  if (text.includes('image/gif')) return 'gif';
  if (text.includes('image/svg')) return 'svg';
  if (text.includes('image/avif')) return 'avif';
  if (text.includes('image/bmp')) return 'bmp';
  if (text.includes('image/tiff')) return 'tiff';
  return '';
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1] : '';
  } catch {
    const match = String(url).toLowerCase().match(/\.([a-z0-9]{2,5})(?:\?|#|$)/i);
    return match ? match[1] : '';
  }
}

async function readJsonFromLocalFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 5, delayMs = 2000) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    let timeout;

    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      console.log(`fetch retry ${attempt}/${retries} failed: ${url}`);

      if (attempt < retries) {
        await sleep(delayMs * attempt);
      }
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function uploadExternalImageToStorage(params) {
  const externalUrl = safeText(params.externalUrl);
  if (!externalUrl) return null;

  const response = await fetchWithRetry(
    externalUrl,
    {
      headers: {
        'user-agent': 'Mozilla/5.0 ImportWorker/1.0',
        accept: 'image/*,*/*;q=0.8',
      },
    },
    4,
    1500
  );

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || '';
  const ext =
    extensionFromContentType(contentType) ||
    extensionFromUrl(externalUrl) ||
    'jpg';

  const productSlug = sanitizePathPart(params.productSlug, 'product');
  const groupSlug = sanitizePathPart(params.rootGroupSlug, '');
  const fileName = `${params.index + 1}.${ext}`;
  const storagePath = groupSlug
    ? `products/${groupSlug}/${productSlug}/${fileName}`
    : `products/${productSlug}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, arrayBuffer, {
      upsert: true,
      contentType: contentType || 'image/jpeg',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function updateJob(jobId, patch) {
  const { error } = await supabase.from('import_jobs').update(patch).eq('id', jobId);
  if (error) throw error;
}

async function lockNextJob() {
  const { data: jobs, error } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw error;

  const job = jobs?.[0];
  if (!job) return null;

  const { data: updated, error: updateError } = await supabase
    .from('import_jobs')
    .update({
      status: 'running',
      locked_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (updateError) throw updateError;
  return updated || null;
}

async function getBrandIdByName(brandName, brandCache) {
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
    .select('id')
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

async function getCategoryBySourceUrl(sourceUrl) {
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
  return data || null;
}

async function getCategoryBySlugAndParent(slug, parentId) {
  let query = supabase
    .from('categories')
    .select(
      'id, name, slug, parent_id, source_url, root_group_slug, root_group_name, source_type, level, image'
    )
    .eq('slug', slug);

  query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function upsertCategoryNode(params) {
  console.log('upsertCategoryNode:start', {
    name: params.name,
    slug: params.slug,
    parentId: params.parentId,
    sourceUrl: params.sourceUrl,
    sourceType: params.sourceType,
    level: params.level,
  });

  const name = safeText(params.name);
  const slug = safeText(params.slug);
  const sourceUrl = safeText(params.sourceUrl);

  if (!name || !slug) {
    throw new Error(`Category requires name/slug: ${name} / ${slug}`);
  }

  let existing = null;

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
    console.log('upsertCategoryNode:update_done', { id: existing.id, slug });
    return existing.id;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  console.log('upsertCategoryNode:insert_done', { id: data.id, slug });
  return data.id;
}

async function ensureRootGroupCategory(group) {
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
  collection,
  rootGroupId,
  rootGroupSlug,
  rootGroupName,
  categoryIdByUrl,
  rootGroupUrl
) {
  const ownUrl = safeText(collection.url);
  const parentUrl = safeText(collection.parent_url);

  let parentId = rootGroupId;

  if (parentUrl && parentUrl !== ownUrl) {
    const resolvedParentId = categoryIdByUrl.get(parentUrl);
    if (resolvedParentId) {
      parentId = resolvedParentId;
    } else if (rootGroupUrl && parentUrl === rootGroupUrl) {
      parentId = rootGroupId;
    }
  }

  const level = parentId === rootGroupId ? 1 : 2;

  const categoryId = await upsertCategoryNode({
    name: collection.name,
    slug: collection.slug,
    parentId,
    sourceUrl: ownUrl,
    sourceType: 'subgroup',
    rootGroupSlug,
    rootGroupName,
    level,
    image: collection.image,
  });

  if (ownUrl) categoryIdByUrl.set(ownUrl, categoryId);
  return categoryId;
}

async function ensureCategoryPathChain(
  path,
  rootGroupId,
  rootGroupSlug,
  rootGroupName,
  categoryIdByUrl
) {
  const normalizedPath = safeArray(path).filter(
    (item) => safeText(item?.name) && safeText(item?.slug)
  );

  if (!normalizedPath.length) return;

  let parentId = rootGroupId;

  for (let index = 0; index < normalizedPath.length; index++) {
    const item = normalizedPath[index];
    const url = safeText(item.url);
    const name = safeText(item.name);
    const slug = safeText(item.slug);

    if (!name || !slug) continue;

    let categoryId = url ? categoryIdByUrl.get(url) || null : null;

    if (!categoryId) {
      categoryId = await upsertCategoryNode({
        name,
        slug,
        parentId,
        sourceUrl: url,
        sourceType: index === 0 ? 'group' : 'subgroup',
        rootGroupSlug,
        rootGroupName,
        level: index,
      });
    }

    if (url) categoryIdByUrl.set(url, categoryId);
    parentId = categoryId;
  }
}

function resolvePrimaryCategoryId(product, categoryIdByUrl) {
  const categoryPath = safeArray(product.category_path);

  for (let i = categoryPath.length - 1; i >= 0; i--) {
    const item = categoryPath[i];
    const byUrl = categoryIdByUrl.get(safeText(item?.url));
    if (byUrl) return byUrl;
  }

  const collections = safeArray(product.collections);
  for (let i = collections.length - 1; i >= 0; i--) {
    const item = collections[i];
    const byUrl = categoryIdByUrl.get(safeText(item?.url));
    if (byUrl) return byUrl;
  }

  return null;
}

function resolveAllCategoryIds(product, categoryIdByUrl) {
  const ids = [];

  for (const item of safeArray(product.collections)) {
    const id = categoryIdByUrl.get(safeText(item?.url));
    if (id) ids.push(id);
  }

  for (const item of safeArray(product.category_path)) {
    const id = categoryIdByUrl.get(safeText(item?.url));
    if (id) ids.push(id);
  }

  return uniqueStrings(ids);
}

async function prepareCategoryMaps(catalog) {
  console.log('prepareCategoryMaps: entered');

  const products = safeArray(catalog.products);
  const collections = safeArray(catalog.collections);
  const explicitSingleGroup = catalog.group ? [catalog.group] : [];
  const explicitGroups = safeArray(catalog.groups);

  console.log('prepareCategoryMaps: source counts', {
    products: products.length,
    collections: collections.length,
    explicitGroups: explicitGroups.length,
    hasSingleGroup: Boolean(catalog.group),
  });

  const categoryIdByUrl = new Map();
  const rootGroupIdBySlug = new Map();
  const rootGroupBySlug = new Map();

  const groupsFromCollections = collections
    .map((item) => ({
      name: safeText(item.group_name || item.root_group_name),
      slug: safeText(item.group_slug || item.root_group_slug),
      url: safeText(catalog.group?.url || ''),
    }))
    .filter((item) => item.name && item.slug);

  const groupsFromProducts = products
    .map((item) => {
      const inferred = getProductRootGroup(item, catalog.group);
      const path = safeArray(item.category_path);
      const rootUrl = safeText(path[0]?.url);
      return {
        name: inferred.name,
        slug: inferred.slug,
        url: rootUrl,
      };
    })
    .filter((item) => item.name && item.slug);

  const allGroups = [];
  const seen = new Set();

  for (const item of [
    ...explicitSingleGroup,
    ...explicitGroups,
    ...groupsFromCollections,
    ...groupsFromProducts,
  ]) {
    const key = safeText(item.slug) || safeText(item.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    allGroups.push(item);
  }

  console.log('prepareCategoryMaps: before groups');
  for (const group of allGroups) {
    console.log('GROUP start', {
      name: group.name,
      slug: group.slug,
      url: group.url,
    });

    if (!safeText(group.name) || !safeText(group.slug)) continue;

    const normalizedGroup = {
      name: safeText(group.name),
      slug: safeText(group.slug),
      url: safeText(group.url),
    };

    rootGroupBySlug.set(normalizedGroup.slug, normalizedGroup);

    const rootId = await ensureRootGroupCategory(normalizedGroup);

    console.log('GROUP done', {
      slug: normalizedGroup.slug,
      rootId,
    });

    rootGroupIdBySlug.set(normalizedGroup.slug, rootId);

    if (normalizedGroup.url) {
      categoryIdByUrl.set(normalizedGroup.url, rootId);
    }
  }

  const sortedCollections = [...collections].sort((a, b) => {
    const aParent = safeText(a.parent_url).split('/').filter(Boolean).length;
    const bParent = safeText(b.parent_url).split('/').filter(Boolean).length;
    const aOwn = safeText(a.url).split('/').filter(Boolean).length;
    const bOwn = safeText(b.url).split('/').filter(Boolean).length;

    if (aParent !== bParent) return aParent - bParent;
    return aOwn - bOwn;
  });

  console.log('prepareCategoryMaps: before collections');
  for (const collection of sortedCollections) {
    const ownUrl = safeText(collection.url);
    if (!ownUrl) continue;

    let rootGroupSlug = safeText(collection.group_slug || collection.root_group_slug);
    let rootGroupName = safeText(collection.group_name || collection.root_group_name);

    if ((!rootGroupSlug || !rootGroupName) && catalog.group) {
      rootGroupSlug = rootGroupSlug || safeText(catalog.group.slug);
      rootGroupName = rootGroupName || safeText(catalog.group.name);
    }

    const rootId = rootGroupIdBySlug.get(rootGroupSlug);
    const rootGroup = rootGroupBySlug.get(rootGroupSlug);

    if (!rootId || !rootGroup) continue;

    const categoryId = await ensureCollectionCategory(
      collection,
      rootId,
      rootGroupSlug,
      rootGroupName || rootGroup.name,
      categoryIdByUrl,
      rootGroup.url
    );

    categoryIdByUrl.set(ownUrl, categoryId);
  }

  console.log('prepareCategoryMaps: before product category_path');
  for (const product of products) {
    const inferredRoot = getProductRootGroup(product, catalog.group);
    const rootGroupSlug = safeText(inferredRoot.slug);
    const rootGroupName = safeText(inferredRoot.name);

    if (!rootGroupSlug) continue;

    const rootGroup = rootGroupBySlug.get(rootGroupSlug) || {
      name: rootGroupName || rootGroupSlug,
      slug: rootGroupSlug,
      url: safeText(safeArray(product.category_path)[0]?.url),
    };

    let rootGroupId = rootGroupIdBySlug.get(rootGroupSlug) || null;

    if (!rootGroupId) {
      rootGroupId = await ensureRootGroupCategory(rootGroup);
      rootGroupIdBySlug.set(rootGroupSlug, rootGroupId);
      rootGroupBySlug.set(rootGroupSlug, rootGroup);

      if (rootGroup.url) {
        categoryIdByUrl.set(rootGroup.url, rootGroupId);
      }
    }

    await ensureCategoryPathChain(
      safeArray(product.category_path),
      rootGroupId,
      rootGroupSlug,
      rootGroup.name,
      categoryIdByUrl
    );
  }

  console.log('prepareCategoryMaps: done');
  return { categoryIdByUrl };
}

async function uploadProductImages(product, rootGroupSlug) {
  const externalUrls = extractCatalogProductImages(product);
  const uploadedUrls = [];
  const errors = [];

  for (let i = 0; i < externalUrls.length; i++) {
    const externalUrl = externalUrls[i];

    try {
      const publicUrl = await uploadExternalImageToStorage({
        externalUrl,
        productSlug: product.slug || product.name || 'product',
        rootGroupSlug: rootGroupSlug || '',
        index: i,
      });

      if (publicUrl) {
        uploadedUrls.push(publicUrl);
      }
    } catch (e) {
      errors.push(
        `Image "${externalUrl}" for "${safeText(product.name)}": ${e?.message || 'unknown error'}`
      );
      console.log(`image skipped: ${externalUrl}`);
    }
  }

  return {
    urls: uploadedUrls,
    errors,
  };
}

async function importSingleProduct(product, catalog, categoryIdByUrl, brandCache) {
  const sourceUrl = safeText(product.url);
  const name = safeText(product.name);
  const slug = safeText(product.slug);

  if (!sourceUrl || !name || !slug) {
    return {
      created: 0,
      updated: 0,
      skipped: 1,
      errors: [`Product without url/name/slug: ${name || slug || sourceUrl || 'unknown'}`],
    };
  }

  try {
    const inferredRoot = getProductRootGroup(product, catalog.group);
    const rootGroupSlug = safeText(inferredRoot.slug);
    const rootGroupName = safeText(inferredRoot.name);

    const brandId = await getBrandIdByName(safeText(product.brand), brandCache);

    const primaryCategoryId = resolvePrimaryCategoryId(product, categoryIdByUrl);
    const allCategoryIds = resolveAllCategoryIds(product, categoryIdByUrl);
    const uniqueCategoryIds = uniqueStrings(allCategoryIds);
    const finalPrimaryCategoryId = primaryCategoryId || uniqueCategoryIds[0] || null;

    const productPayload = {
      name,
      slug,
      sku: toNullableText(product.article),
      price: product.price_value ?? null,
      description: toNullableText(product.description),
      short_description: buildShortDescriptionFromDescription(product.description),
      full_description: safeText(product.description),
      is_available: toBooleanAvailability(product.availability),
      availability_text: toNullableText(product.availability_raw || product.availability),
      specifications: specsArrayToObject(product.specifications),
      brand_id: brandId,
      category_id: finalPrimaryCategoryId,
      source_url: sourceUrl,
      root_group_slug: toNullableText(rootGroupSlug),
      root_group_name: toNullableText(rootGroupName),
      last_category_slug: toNullableText(product.last_category_slug),
      last_category_name: toNullableText(product.last_category_name),
      stock_qty: product.stock_qty ?? null,
      currency: toNullableText(product.currency),
      measure: toNullableText(product.measure),
      breadcrumbs: safeArray(product.breadcrumbs),
      category_path: safeArray(product.category_path),
      source_site_id: toNullableText(product.site_id),
    };

    let existingId = null;

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
      if (existingBySlug?.id) existingId = existingBySlug.id;
    }

    let productId = existingId;
    let created = 0;
    let updated = 0;

    if (productId) {
      const { error: updateError } = await supabase
        .from('products')
        .update(productPayload)
        .eq('id', productId);

      if (updateError) throw updateError;
      updated = 1;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('products')
        .insert(productPayload)
        .select('id')
        .single();

      if (insertError) throw insertError;
      productId = inserted.id;
      created = 1;
    }

    if (!productId) throw new Error(`No product_id for "${name}"`);

    const { error: deleteProductCategoriesError } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', productId);

    if (deleteProductCategoriesError) throw deleteProductCategoriesError;

    if (uniqueCategoryIds.length) {
      const relationRows = uniqueCategoryIds.map((categoryId) => ({
        product_id: productId,
        category_id: categoryId,
      }));

      const { error: insertRelationsError } = await supabase
        .from('product_categories')
        .insert(relationRows);

      if (insertRelationsError) throw insertRelationsError;
    }

    const uploadedImages = await uploadProductImages(product, rootGroupSlug);

    const { error: deleteImagesError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);

    if (deleteImagesError) throw deleteImagesError;

    if (uploadedImages.urls.length) {
      const imageRows = uploadedImages.urls.map((url, index) => ({
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

    return {
      created,
      updated,
      skipped: 0,
      errors: uploadedImages.errors,
    };
  } catch (e) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [`Product "${name}": ${e?.message || 'unknown error'}`],
    };
  }
}

async function processJob(job) {
  const localFilePath = job.meta?.local_file_path;
  if (!localFilePath) {
    throw new Error('meta.local_file_path is required');
  }

  console.log('processJob: localFilePath =', localFilePath);

  const catalog = await readJsonFromLocalFile(localFilePath);
  console.log('processJob: local file loaded');

  const allProducts = safeArray(catalog.products);
  let offset = Number(job.offset_items || 0);
  let processed = Number(job.processed_items || 0);
  let success = Number(job.success_items || 0);
  let errorItems = Number(job.error_items || 0);
  let errorLog = Array.isArray(job.error_log) ? [...job.error_log] : [];

  await updateJob(job.id, {
    status: 'running',
    total_items: allProducts.length,
  });

  if (allProducts.length === 0) {
    await updateJob(job.id, {
      processed_items: 0,
      success_items: 0,
      error_items: 0,
      offset_items: 0,
      error_log: errorLog,
      status: 'done',
      finished_at: new Date().toISOString(),
    });
    return;
  }

    let categoryIdByUrl;

    if (offset === 0) {
    console.log('processJob: preparing categories from catalog...');
    ({ categoryIdByUrl } = await prepareCategoryMaps(catalog));
    console.log('processJob: categories prepared from catalog');
    } else {
    console.log('processJob: loading categories from db...');
    ({ categoryIdByUrl } = await loadCategoryMapFromDb());
    console.log('processJob: categories loaded from db');
    }

  const brandCache = new Map();

  while (offset < allProducts.length) {
    const product = allProducts[offset];
    console.log(`PRODUCT ${offset + 1}/${allProducts.length}: ${safeText(product?.name)}`);

    const result = await importSingleProduct(product, catalog, categoryIdByUrl, brandCache);

    processed += 1;
    success += result.created + result.updated;
    errorItems += result.errors.length;
    errorLog.push(...result.errors);

    if (errorLog.length > 500) {
      errorLog = errorLog.slice(-500);
    }

    offset += 1;

    const finalStatus =
      offset >= allProducts.length
        ? errorItems > 0
          ? 'done_with_errors'
          : 'done'
        : 'running';

    await updateJob(job.id, {
      processed_items: processed,
      success_items: success,
      error_items: errorItems,
      offset_items: offset,
      error_log: errorLog,
      status: finalStatus,
      finished_at: offset >= allProducts.length ? new Date().toISOString() : null,
    });
  }
}

async function main() {
  const job = await lockNextJob();

  if (!job) {
    console.log('No pending jobs');
    return;
  }

  console.log(`Processing job ${job.id}`);
  console.log('JOB payload:', {
    id: job.id,
    job_type: job.job_type,
    file_bucket: job.file_bucket,
    file_path: job.file_path,
    batch_size: job.batch_size,
    offset_items: job.offset_items,
    processed_items: job.processed_items,
    success_items: job.success_items,
    error_items: job.error_items,
    meta: job.meta,
  });

  try {
    await processJob(job);
    console.log(`Job ${job.id} completed`);
  } catch (error) {
    await updateJob(job.id, {
      status: 'pending',
      finished_at: null,
      error_log: [
        ...(Array.isArray(job.error_log) ? job.error_log : []),
        error instanceof Error ? error.message : String(error),
      ].slice(-500),
    });

    console.error(`Job ${job.id} failed and returned to pending`, error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
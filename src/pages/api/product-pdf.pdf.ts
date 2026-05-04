import type { APIRoute } from 'astro';
import { chromium } from 'playwright';
import {
  getProductViewById,
  getCategoryById,
  type CategoryRow,
  type ProductView,
} from '@/lib/catalog-service';
import QRCode from 'qrcode';

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasRealImage(imageUrl: string | null | undefined): boolean {
  const value = String(imageUrl || '').trim().toLowerCase();

  return Boolean(
    value &&
      !value.includes('placeholder') &&
      !value.includes('no-photo') &&
      !value.includes('нет фото') &&
      !value.includes('wixstatic.com') &&
      !value.includes('/0.png') &&
      !value.includes('/0.jpg') &&
      !value.includes('/0.jpeg') &&
      !value.includes('/0.webp')
  );
}

function formatPrice(price: number): string {
  return price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу';
}

function formatDate(value = new Date()): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

async function loadCategoryBreadcrumbs(categoryId: string): Promise<CategoryRow[]> {
  const chain: CategoryRow[] = [];
  const visited = new Set<string>();

  let currentId: string | null = categoryId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const category = await getCategoryById(currentId);
    if (!category) break;

    chain.push(category);
    currentId = category.parent_id;
  }

  return chain.reverse();
}

function renderSpecificationsTable(product: ProductView): string {
  const entries = Object.entries(product.specifications || {}).filter(([key, value]) => {
    return String(key || '').trim() && String(value || '').trim();
  });

  if (!entries.length) {
    return `
      <div class="empty-block">
        Характеристики не указаны.
      </div>
    `;
  }

  return `
    <table class="spec-table">
      <tbody>
        ${entries
          .map(
            ([key, value]) => `
              <tr>
                <td class="spec-key">${escapeHtml(key)}</td>
                <td class="spec-value">${escapeHtml(String(value))}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

async function buildProductPdfHtml(args: {
  product: ProductView;
  breadcrumbs: CategoryRow[];
  origin: string;
}): Promise<string> {
  const { product, breadcrumbs, origin } = args;

  const productPath = `/product/${product.slug || product.id}`;
  const productUrl = `${origin}${productPath}`;
  const imageUrl = hasRealImage(product.image) ? product.image : '';
  const breadcrumbText = ['Главная', 'Каталог', ...breadcrumbs.map((item) => item.name)].join(' / ');
  const statusText =
    product.availabilityText || (product.isAvailable ? 'В наличии' : 'Под заказ');

  const logoUrl = `${origin}/logo-print.png`;
  const qrDataUrl = await QRCode.toDataURL(productUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return `
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(product.name)}</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      font-size: 12px;
      line-height: 1.45;
      background: #ffffff;
    }

    .page {
      width: 100%;
    }

    .header {
      display: grid;
      grid-template-columns: 180px 1fr 150px;
      align-items: center;
      gap: 28px;
      border-bottom: 2px solid #0b5cab;
      padding-bottom: 16px;
      margin-bottom: 18px;
      min-height: 120px;
    }

    .logo-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      min-height: 88px;
    }

    .brand-logo {
      width: 128px;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .contacts-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 88px;
    }

    .contacts-plain {
      width: 100%;
      max-width: 430px;
      text-align: left;
      color: #24364b;
    }

    .contacts-title {
      font-size: 17px;
      font-weight: 700;
      color: #0b2239;
      margin: 0 0 10px 0;
    }

    .contacts-line {
      font-size: 13px;
      line-height: 1.7;
      margin: 0 0 1px 0;
      color: #334155;
    }

    .contacts-line strong {
      color: #0f172a;
      font-weight: 700;
    }

    .qr-block {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      min-height: 88px;
    }

    .qr-date {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 10px;
    }

    .qr-image-box {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .qr-image {
      width: 108px;
      height: 108px;
      border: 1px solid #dbe3ec;
      padding: 4px;
      background: #ffffff;
      display: block;
    }

    .qr-caption {
      font-size: 11px;
      color: #6b7280;
      text-align: center;
      line-height: 1.3;
    }

    .breadcrumbs {
      color: #6b7280;
      font-size: 11px;
      margin-bottom: 10px;
    }

    .product-title {
      font-size: 28px;
      font-weight: 700;
      color: #0b2239;
      line-height: 1.18;
      margin: 0 0 16px 0;
    }

    .top-grid {
      display: grid;
      grid-template-columns: 1.08fr 0.92fr;
      gap: 22px;
      align-items: start;
      margin-bottom: 20px;
    }

    .image-box {
      border: 1px solid #dbe3ec;
      border-radius: 12px;
      min-height: 340px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: #ffffff;
    }

    .image-box img {
      max-width: 100%;
      max-height: 300px;
      object-fit: contain;
      display: block;
    }

    .image-placeholder {
      width: 100%;
      height: 300px;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 14px;
      background: #f8fafc;
    }

    .info-panel {
      border: 1px solid #dbe3ec;
      border-radius: 12px;
      padding: 18px;
      background: #f8fbff;
    }

    .price {
      font-size: 30px;
      font-weight: 800;
      color: #0b2239;
      margin: 0 0 14px 0;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 0;
    }

    .meta-item {
      padding: 10px 12px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e5edf5;
    }

    .meta-label {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 2px;
    }

    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      word-break: break-word;
    }

    .section {
      margin-top: 18px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0b2239;
      margin: 0 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #dbe3ec;
    }

    .description {
      white-space: pre-line;
      color: #374151;
      font-size: 12px;
    }

    .empty-block {
      color: #6b7280;
      font-size: 12px;
      padding: 10px 0;
    }

    .spec-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
    }

    .spec-table tr:nth-child(odd) td {
      background: #f8fafc;
    }

    .spec-table td {
      border: 1px solid #e5edf5;
      padding: 8px 10px;
      vertical-align: top;
      font-size: 12px;
    }

    .spec-key {
      width: 38%;
      color: #374151;
      font-weight: 600;
    }

    .spec-value {
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-wrap">
        <img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="АВТОГРАФ" />
      </div>

      <div class="contacts-wrap">
        <div class="contacts-plain">
          <p class="contacts-line"><strong>Телефон:</strong> +7 (812) 640-39-96</p>
          <p class="contacts-line"><strong>Email:</strong> info@cnc.su</p>
          <p class="contacts-line"><strong>Сайт:</strong> cnc.su</p>
          <p class="contacts-line"><strong>Адрес:</strong> г. Санкт-Петербург, ул. Заусадебная, д. 15, стр. 5</p>
        </div>
      </div>

      <div class="qr-block">
        <div class="qr-date">${escapeHtml(formatDate())}</div>
        <div class="qr-image-box">
          <img class="qr-image" src="${qrDataUrl}" alt="QR код" />
          <div class="qr-caption">QR на страницу товара</div>
        </div>
      </div>
    </div>

    <div class="breadcrumbs">${escapeHtml(breadcrumbText)}</div>

    <h1 class="product-title">${escapeHtml(product.name)}</h1>

    <div class="top-grid">
      <div class="image-box">
        ${
          imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" />`
            : `<div class="image-placeholder">Изображение отсутствует</div>`
        }
      </div>

      <div class="info-panel">
        <div class="price">${escapeHtml(formatPrice(product.price || 0))}</div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Артикул</div>
            <div class="meta-value">${escapeHtml(product.sku || '—')}</div>
          </div>

          <div class="meta-item">
            <div class="meta-label">Бренд</div>
            <div class="meta-value">${escapeHtml(product.brand || '—')}</div>
          </div>

          <div class="meta-item">
            <div class="meta-label">Статус</div>
            <div class="meta-value">${escapeHtml(statusText)}</div>
          </div>

          <div class="meta-item">
            <div class="meta-label">Категория</div>
            <div class="meta-value">${escapeHtml(breadcrumbs[breadcrumbs.length - 1]?.name || '—')}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Описание</h2>
      ${
        product.description?.trim()
          ? `<div class="description">${escapeHtml(product.description)}</div>`
          : `<div class="empty-block">Описание не указано.</div>`
      }
    </div>

    <div class="section">
      <h2 class="section-title">Технические характеристики</h2>
      ${renderSpecificationsTable(product)}
    </div>
  </div>
</body>
</html>
  `;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = String(url.searchParams.get('id') || '').trim();

  if (!id) {
    return new Response('Product id is required', { status: 400 });
  }

  const product = await getProductViewById(id);

  if (!product) {
    return new Response('Product not found', { status: 404 });
  }

  const breadcrumbs = product.categoryId
    ? await loadCategoryBreadcrumbs(product.categoryId)
    : [];

  const origin = url.origin;
  const html = await buildProductPdfHtml({
    product,
    breadcrumbs,
    origin,
  });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      viewport: {
        width: 1400,
        height: 1800,
      },
    });

    await page.setContent(html, {
      waitUntil: 'networkidle',
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    const safeName = String(product.slug || product.id || 'product')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const pdfBytes = new Uint8Array(pdfBuffer);

    return new Response(pdfBytes as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName || 'product'}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return new Response('PDF generation failed', { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
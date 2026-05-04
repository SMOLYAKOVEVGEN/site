// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type LeadTelegramItem = {
  product_name?: string | null;
  product_slug?: string | null;
  quantity?: number | null;
};

type LeadTelegramPayload = {
  leadId?: string | null;
  source?: string | null;
  customerName?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  comment?: string | null;
  pageUrl?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  items?: LeadTelegramItem[] | null;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function text(value: unknown, fallback = '—'): string {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : fallback;
}

function buildItemsText(items: LeadTelegramItem[] | null | undefined): string {
  if (!Array.isArray(items) || items.length === 0) {
    return '—';
  }

  return items
    .map((item, index) => {
      const productName = text(item.product_name, 'Без названия');
      const quantity = Number(item.quantity || 0) > 0 ? Number(item.quantity) : 1;
      const productSlug = text(item.product_slug, '');

      const slugLine =
        productSlug && productSlug !== '—'
          ? `\nslug: ${escapeHtml(productSlug)}`
          : '';

      return `${index + 1}. ${escapeHtml(productName)}\nкол-во: ${quantity}${slugLine}`;
    })
    .join('\n\n');
}

function buildMessage(payload: LeadTelegramPayload): string {
  const itemsText = buildItemsText(payload.items);

  return [
    '<b>Новая заявка</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(text(payload.customerName))}`,
    `<b>Телефон:</b> ${escapeHtml(text(payload.phone))}`,
    `<b>Email:</b> ${escapeHtml(text(payload.email))}`,
    `<b>Компания:</b> ${escapeHtml(text(payload.company))}`,
    '',
    `<b>Товары:</b>\n${itemsText}`,
    '',
    `<b>Комментарий:</b>\n${escapeHtml(text(payload.comment))}`,
  ].join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!telegramBotToken || !telegramChatId) {
      return new Response(
        JSON.stringify({ error: 'Telegram secrets are not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const payload = (await req.json()) as LeadTelegramPayload;
    const message = buildMessage(payload);

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    const telegramResult = await telegramResponse.text();

    if (!telegramResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Telegram API error',
          details: telegramResult,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
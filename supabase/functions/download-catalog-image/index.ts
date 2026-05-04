// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type RequestBody = {
  imageUrl: string;
  bucket?: string;
  targetPath: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё._/-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

function guessExtension(contentType: string | null, fallbackUrl: string): string {
  const lower = (contentType || '').toLowerCase();

  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('png')) return 'png';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('gif')) return 'gif';
  if (lower.includes('svg')) return 'svg';

  try {
    const pathname = new URL(fallbackUrl).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (match?.[1]) return match[1].toLowerCase();
  } catch {
  }

  return 'jpg';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json({ ok: true });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await req.json()) as RequestBody;

    const imageUrl = String(body?.imageUrl || '').trim();
    const bucket = String(body?.bucket || 'catalog-media').trim();
    const targetPathRaw = String(body?.targetPath || '').trim();

    if (!imageUrl || !targetPathRaw) {
      return json(
        { error: 'imageUrl and targetPath are required' },
        400
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          error: 'Missing Supabase env vars',
          hasSupabaseUrl: Boolean(supabaseUrl),
          hasServiceRoleKey: Boolean(serviceRoleKey),
        },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const externalRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/*,*/*;q=0.8',
      },
    });

    if (!externalRes.ok) {
      return json(
        {
          error: 'Failed to download source image',
          imageUrl,
          status: externalRes.status,
          statusText: externalRes.statusText,
        },
        502
      );
    }

    const contentType = externalRes.headers.get('content-type');
    const arrayBuffer = await externalRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (!bytes.length) {
      return json(
        {
          error: 'Downloaded image is empty',
          imageUrl,
        },
        400
      );
    }

    let finalPath = sanitizeFileName(targetPathRaw);

    if (!/\.[a-z0-9]+$/i.test(finalPath)) {
      const ext = guessExtension(contentType, imageUrl);
      finalPath = `${finalPath}.${ext}`;
    }

    const uploadRes = await supabase.storage
      .from(bucket)
      .upload(finalPath, bytes, {
        contentType: contentType || 'application/octet-stream',
        upsert: true,
      });

    if (uploadRes.error) {
      return json(
        {
          error: 'Storage upload failed',
          details: uploadRes.error.message,
          bucket,
          imageUrl,
          targetPath: finalPath,
        },
        500
      );
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(finalPath).data.publicUrl;

    return json({
      ok: true,
      publicUrl,
      path: finalPath,
      bucket,
      contentType,
      size: bytes.length,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
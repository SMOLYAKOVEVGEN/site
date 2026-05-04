import type { APIRoute } from 'astro';

const SUPABASE_URL = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = import.meta.env.BUCKET_NAME || 'catalog-media';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return new Response('Missing path parameter', { status: 400 });
  }

  // Sanitize: prevent path traversal
  const cleanPath = path.replace(/\.\./g, '').replace(/^\/+/, '');
  if (!cleanPath) {
    return new Response('Invalid path', { status: 400 });
  }

  const imageUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${cleanPath}`;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return new Response('Image not found', { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'image/png';
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[catalog-image] proxy error:', err?.message);
    return new Response('Error fetching image', { status: 502 });
  }
};

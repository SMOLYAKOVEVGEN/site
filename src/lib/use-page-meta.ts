import { useEffect } from 'react';

const SITE_NAME = 'АВТОграф Инструментальные Решения';
const SITE_URL = 'https://cnc.su';
const DEFAULT_IMAGE = `${SITE_URL}/images/logo/logo.svg`;

interface PageMeta {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  robots?: string;
}

type MetaKey =
  | { name: string; content: string }
  | { property: string; content: string };

function upsertMetaTag(meta: MetaKey) {
  const key = 'name' in meta ? 'name' : 'property';
  const value = meta[key];
  let el = document.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`);

  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(key, value);
    document.head.appendChild(el);
  }

  el.setAttribute('content', meta.content);
}

function upsertCanonical(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function usePageMeta({ title, description, canonical, image, robots }: PageMeta) {
  useEffect(() => {
    const fullTitle = `${title} — ${SITE_NAME}`;
    const canonicalUrl = canonical ?? `${SITE_URL}${window.location.pathname}`;
    const ogImage = image ?? DEFAULT_IMAGE;

    document.title = fullTitle;

    if (description) {
      upsertMetaTag({ name: 'description', content: description });
      upsertMetaTag({ property: 'og:description', content: description });
      upsertMetaTag({ name: 'twitter:description', content: description });
    }

    upsertMetaTag({ property: 'og:title', content: fullTitle });
    upsertMetaTag({ property: 'og:url', content: canonicalUrl });
    upsertMetaTag({ property: 'og:image', content: ogImage });
    upsertMetaTag({ property: 'og:type', content: 'website' });
    upsertMetaTag({ property: 'og:site_name', content: SITE_NAME });
    upsertMetaTag({ name: 'twitter:title', content: fullTitle });
    upsertMetaTag({ name: 'twitter:image', content: ogImage });
    upsertMetaTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (robots) {
      upsertMetaTag({ name: 'robots', content: robots });
    } else {
      const robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      robotsMeta?.remove();
    }

    upsertCanonical(canonicalUrl);
  }, [title, description, canonical, image, robots]);
}

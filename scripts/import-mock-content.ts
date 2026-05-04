import { createClient } from '@supabase/supabase-js';
import { services, articles } from '../src/data/mockData';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Отсутствуют переменные SUPABASE_URL или SUPABASE_SERVICE_KEY в .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importServices() {
  const payload = services.map((item: any) => ({
    legacy_id: item._id,
    service_name: item.serviceName,
    slug: item.slug,
    short_description: item.shortDescription ?? '',
    description: item.description ?? '',
    hero_image: item.heroImage ?? '',
    work_stages: item.workStages ?? '',
    advantages: item.advantages ?? '',
    case_studies_summary: item.caseStudiesSummary ?? '',
    faq: item.faq ?? '',
  }));

  const { error } = await supabase
    .from('services')
    .upsert(payload, { onConflict: 'slug' });

  if (error) {
    throw error;
  }

  console.log(`Imported services: ${payload.length}`);
}

async function importArticles() {
  const payload = articles.map((item: any) => ({
    legacy_id: item._id,
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt ?? '',
    main_image: item.mainImage ?? '',
    content: item.content ?? '',
    author: item.author ?? '',
    publish_date: item.publishDate || null,
    category: item.category ?? '',
    seo_title: item.seoTitle ?? '',
    seo_description: item.seoDescription ?? '',
  }));

  const { error } = await supabase
    .from('articles')
    .upsert(payload, { onConflict: 'slug' });

  if (error) {
    throw error;
  }

  console.log(`Imported articles: ${payload.length}`);
}

async function main() {
  await importServices();
  await importArticles();
  console.log('Mock content import finished');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
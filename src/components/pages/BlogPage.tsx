import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Image } from '@/components/ui/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { usePageMeta } from '@/lib/use-page-meta';

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  main_image: string | null;
  content: string | null;
  author: string | null;
  publish_date: string | null;
  category: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export default function BlogPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  usePageMeta({
    title: 'Блог',
    description: 'Экспертные статьи, новости и практические материалы по металлообработке, инструменту и производственным технологиям.',
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          main_image,
          content,
          author,
          publish_date,
          category,
          seo_title,
          seo_description
        `)
        .order('publish_date', { ascending: false, nullsFirst: false });

      if (error) throw error;

      setArticles((data as ArticleRow[]) || []);
    } catch (error) {
      console.error('Error loading articles:', error);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const placeholderImage = '/fallback-logo.png';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main">
      <section className="bg-dark-blue text-primary-foreground py-20">
        <div className="max-w-[100rem] mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-5xl lg:text-6xl mb-6">
              Блог
            </h1>
            <p className="font-paragraph text-xl text-primary-foreground/90 max-w-3xl">
              Экспертиза, новости и практические материалы для современного производства
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-white" style={{ minHeight: '600px' }}>
        <div className="max-w-[100rem] mx-auto px-8">
          {isLoading ? (
            <div className="text-center py-16 text-steel-gray font-paragraph">
              Загрузка статей...
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 gap-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group cursor-pointer"
              >
                <Link to={`/blog/${articles[0].slug}`} className="block">
                  <div className="relative h-[320px] md:h-[480px] mb-6 overflow-hidden">
                    <Image
                      src={articles[0].main_image || placeholderImage}
                      alt={articles[0].title || 'Article'}
                      className="w-full h-full object-cover object-[22%_center] group-hover:scale-105 transition-transform duration-700"
                      width={1400}
                    />
                    <div className="absolute top-6 left-6 bg-white px-4 py-2 font-paragraph text-xs font-bold tracking-widest uppercase">
                      {articles[0].category || 'Статья'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-steel-gray font-paragraph text-sm mb-3">
                    <span>
                      {articles[0].publish_date
                        ? new Date(articles[0].publish_date).toLocaleDateString('ru-RU')
                        : 'Недавно'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>{articles[0].author || 'Редакция'}</span>
                  </div>

                  <h2 className="font-heading text-2xl md:text-4xl text-graphite mb-4 group-hover:text-primary transition-colors leading-tight">
                    {articles[0].title}
                  </h2>

                  <p className="font-paragraph text-steel-gray text-base md:text-lg leading-relaxed">
                    {articles[0].excerpt || 'Описание статьи скоро появится.'}
                  </p>
                </Link>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.slice(1).map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 }}
                    className="group border-t border-graphite/10 pt-6"
                  >
                    <Link to={`/blog/${article.slug}`} className="block">
                      <div className="relative h-[220px] mb-5 overflow-hidden">
                        <Image
                          src={article.main_image || placeholderImage}
                          alt={article.title || 'Article'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          width={700}
                        />
                      </div>

                      <div className="text-primary font-paragraph text-xs font-bold tracking-widest uppercase mb-3">
                        {article.category || 'Новость'}
                      </div>

                      <h3 className="font-heading text-xl md:text-2xl text-graphite mb-3 group-hover:text-primary transition-colors leading-snug">
                        {article.title}
                      </h3>

                      <p className="font-paragraph text-steel-gray text-sm md:text-base leading-relaxed line-clamp-3">
                        {article.excerpt || 'Описание статьи скоро появится.'}
                      </p>

                      <div className="mt-4 inline-flex items-center gap-2 text-primary font-paragraph font-medium">
                        Читать статью
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-steel-gray font-paragraph">
              Статьи пока не найдены.
            </div>
          )}
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
}
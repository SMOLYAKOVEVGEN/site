import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ArticleRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  usePageMeta({
    title: article?.seo_title || article?.title || 'Статья',
    description: article?.seo_description || article?.excerpt || 'Статья блога АВТОграф.',
  });

  useEffect(() => {
    loadArticle();
  }, [slug]);

  const loadArticle = async () => {
    if (!slug) {
      setArticle(null);
      setIsLoading(false);
      return;
    }

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
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;

      setArticle((data as ArticleRow | null) || null);
    } catch (error) {
      console.error('Error loading article:', error);
      setArticle(null);
    } finally {
      setIsLoading(false);
    }
  };

  const placeholderImage = '/fallback-logo.png';

  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <LoadingSpinner />
        </div>
      ) : !article ? (
        <div className="max-w-[100rem] mx-auto px-8 py-32 text-center">
          <h1 className="font-heading text-4xl text-graphite mb-4">
            Статья не найдена
          </h1>
          <Link to="/blog">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Вернуться в блог
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <section className="bg-dark-blue text-primary-foreground py-16 md:py-20">
            <div className="max-w-[100rem] mx-auto px-8">
              <div className="mb-8">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-primary-foreground/75 hover:text-primary-foreground transition-colors font-paragraph"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Назад в блог
                </Link>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-wrap items-center gap-4 text-primary-foreground/80 font-paragraph text-sm mb-5">
                  <span className="uppercase tracking-widest font-semibold text-secondary">
                    {article.category || 'Статья'}
                  </span>
                  <span>•</span>
                  <span>
                    {article.publish_date
                      ? new Date(article.publish_date).toLocaleDateString('ru-RU')
                      : 'Недавно'}
                  </span>
                  <span>•</span>
                  <span>{article.author || 'Редакция'}</span>
                </div>

                <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl mb-6 max-w-5xl leading-tight">
                  {article.title}
                </h1>

                {article.excerpt && (
                  <p className="font-paragraph text-xl text-primary-foreground/90 max-w-3xl leading-relaxed">
                    {article.excerpt}
                  </p>
                )}
              </motion.div>
            </div>
          </section>

          <section className="py-16 md:py-20 bg-white">
            <div className="max-w-[100rem] mx-auto px-8">
              <div className="max-w-5xl mx-auto">
                <div className="relative h-[280px] md:h-[520px] overflow-hidden mb-10">
                  <Image
                    src={article.main_image || placeholderImage}
                    alt={article.title || 'Article'}
                    className="w-full h-full object-cover"
                    width={1600}
                  />
                </div>

                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="font-paragraph text-[17px] md:text-[18px] text-graphite leading-8 space-y-6"
                >
                  {(article.content || article.excerpt || '')
                    .split('\n')
                    .map((block) => block.trim())
                    .filter(Boolean)
                    .map((block, index) => {
                      const isHeading =
                        block.length < 120 &&
                        !block.endsWith('.') &&
                        !block.endsWith(':') &&
                        block === block.trim();

                      if (isHeading) {
                        return (
                          <h2
                            key={index}
                            className="font-heading text-2xl md:text-3xl text-graphite pt-4"
                          >
                            {block}
                          </h2>
                        );
                      }

                      return <p key={index}>{block}</p>;
                    })}
                </motion.article>
              </div>
            </div>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
}
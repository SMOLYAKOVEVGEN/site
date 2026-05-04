import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Target, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { usePageMeta } from '@/lib/use-page-meta';

type IndustrySolutionRow = {
  id: string;
  external_id: string | null;
  industry_name: string;
  solution_description: string | null;
  solved_tasks_examples: string | null;
  industry_image: string | null;
  benefits: string | null;
  target_audience: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function SolutionsPage() {
  const [solutions, setSolutions] = useState<IndustrySolutionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  usePageMeta({
    title: 'Отраслевые решения',
    description: 'Специализированные инструментальные решения для машиностроения, металлообработки, авиастроения и других отраслей промышленности.',
  });

  useEffect(() => {
    loadSolutions();
  }, []);

  const loadSolutions = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('industrysolutions')
        .select(`
          id,
          external_id,
          industry_name,
          solution_description,
          solved_tasks_examples,
          industry_image,
          benefits,
          target_audience,
          sort_order,
          is_active
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('industry_name', { ascending: true });

      if (error) {
        throw error;
      }

      setSolutions((data as IndustrySolutionRow[]) || []);
    } catch (error) {
      console.error('Error loading solutions:', error);
      setSolutions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main">
      <section className="bg-graphite text-primary-foreground py-12 sm:py-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6 leading-tight">
              Отраслевые решения
            </h1>
            <p className="font-paragraph text-base sm:text-xl text-primary-foreground/90 max-w-3xl leading-relaxed">
              Специализированные инструментальные решения для различных отраслей промышленности
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-24" style={{ minHeight: '600px' }}>
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg overflow-hidden border border-graphite/10 animate-pulse"
                >
                  <div className="h-40 sm:h-64 bg-slate-200" />
                  <div className="p-4 sm:p-6 space-y-3">
                    <div className="h-6 bg-slate-200 rounded" />
                    <div className="h-4 bg-slate-200 rounded" />
                    <div className="h-4 bg-slate-200 rounded w-5/6" />
                    <div className="h-20 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : solutions.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
              {solutions.map((solution, index) => (
                <motion.div
                  key={solution.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  className="bg-white rounded-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 border border-graphite/10 flex flex-col"
                >
                  <div className="relative h-40 sm:h-64 overflow-hidden bg-background">
                    <Image
                      src={
                        solution.industry_image ||
                        '/fallback-logo.png'
                      }
                      alt={solution.industry_name || 'Industry'}
                      className="w-full h-full object-cover"
                      width={600}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-graphite/90 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                      <h2 className="font-heading text-lg sm:text-2xl text-white leading-tight">
                        {solution.industry_name}
                      </h2>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 flex-1 flex flex-col">
                    <p className="font-paragraph text-xs sm:text-base text-steel-gray mb-3 sm:mb-4 leading-relaxed">
                      {solution.solution_description || 'Описание скоро появится.'}
                    </p>

                    {solution.target_audience && (
                      <div className="flex items-start gap-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-background rounded">
                        <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-paragraph text-xs text-steel-gray">
                            Целевая аудитория
                          </p>
                          <p className="font-paragraph text-xs sm:text-sm text-graphite font-medium">
                            {solution.target_audience}
                          </p>
                        </div>
                      </div>
                    )}

                    {solution.benefits && (
                      <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-background rounded">
                        <div className="flex items-start gap-2">
                          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-paragraph text-xs text-steel-gray mb-1">
                              Преимущества
                            </p>
                            <p className="font-paragraph text-xs sm:text-sm text-graphite">
                              {solution.benefits}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {solution.solved_tasks_examples && (
                      <div className="mb-4 sm:mb-6 p-2 sm:p-3 bg-background rounded">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-paragraph text-xs text-steel-gray mb-1">
                              Какие задачи решаем
                            </p>
                            <p className="font-paragraph text-xs sm:text-sm text-graphite">
                              {solution.solved_tasks_examples}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Link to="/contacts#request-form" className="mt-auto">
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm py-2 sm:py-3">
                        Подобрать решение
                        <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="font-paragraph text-xl text-steel-gray mb-4">
                Отраслевые решения пока не добавлены
              </p>
              <p className="font-paragraph text-steel-gray">
                После заполнения базы этот раздел появится автоматически
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 sm:py-24 bg-dark-blue text-primary-foreground">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-heading text-2xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 leading-tight">
              Не нашли подходящее решение?
            </h2>
            <p className="font-paragraph text-base sm:text-xl text-primary-foreground/90 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed">
              Свяжитесь с нами, и мы разработаем индивидуальное решение для вашего производства
            </p>
            <Link to="/contacts#request-form">
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-paragraph text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-6 h-auto"
              >
                Получить консультацию
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
}